import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Array<{ field: string; message: string }>
): Response {
  const response: ApiResponse = {
    success: false,
    error: message,
    errors,
  };
  return res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response {
  const totalPages = Math.ceil(total / limit);
  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
  return res.status(200).json({ success: true, ...response });
}

export function notFoundResponse(res: Response, resource = 'Resource'): Response {
  return errorResponse(res, `${resource} not found`, 404);
}

export function unauthorizedResponse(res: Response, message = 'Unauthorized'): Response {
  return errorResponse(res, message, 401);
}

export function forbiddenResponse(res: Response, message = 'Forbidden'): Response {
  return errorResponse(res, message, 403);
}

export function validationErrorResponse(
  res: Response,
  errors: Array<{ field: string; message: string }>
): Response {
  return errorResponse(res, 'Validation failed', 400, errors);
}

export function serverErrorResponse(res: Response, error?: Error): Response {
  console.error('Server error:', error);
  return errorResponse(
    res,
    process.env.NODE_ENV === 'development' && error
      ? error.message
      : 'Internal server error',
    500
  );
}
