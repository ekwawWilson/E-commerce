import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { errorResponse, validationErrorResponse, serverErrorResponse } from '../utils/response';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400);
    this.errors = errors;
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  logger.error(`${req.method} ${req.path}`, err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return validationErrorResponse(res, errors);
  }

  // Handle custom validation errors
  if (err instanceof ValidationError) {
    return validationErrorResponse(res, err.errors);
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode);
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.join(', ') || 'field';
        return errorResponse(res, `A record with this ${field} already exists`, 409);
      case 'P2025':
        // Record not found
        return errorResponse(res, 'Record not found', 404);
      case 'P2003':
        // Foreign key constraint failed
        return errorResponse(res, 'Related record not found', 400);
      default:
        return errorResponse(res, 'Database error', 500);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(res, 'Invalid data provided', 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  // Default server error
  return serverErrorResponse(res, err);
}

export function notFoundHandler(req: Request, res: Response): Response {
  return errorResponse(res, `Route ${req.method} ${req.path} not found`, 404);
}
