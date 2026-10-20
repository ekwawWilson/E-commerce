import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import config from '../../config';
import { SupplierRole } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../../middleware/errorHandler';

export interface SupplierAuthenticatedRequest extends Request {
  supplierAdmin?: {
    id: string;
    email: string;
    role: SupplierRole;
  };
  supplier?: {
    id: string;
    status: string;
  };
}

interface SupplierTokenPayload {
  type: 'supplier';
  supplierAdminId: string;
  supplierId: string;
  email: string;
  role: SupplierRole;
}

/**
 * Authenticate supplier admin from JWT token
 */
export async function authenticateSupplier(
  req: SupplierAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = (req as any).headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as SupplierTokenPayload;

    // Verify it's a supplier token
    if (decoded.type !== 'supplier') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Verify supplier admin exists and is active
    const supplierAdmin = await prisma.supplierAdmin.findUnique({
      where: { id: decoded.supplierAdminId },
      include: {
        supplier: {
          select: { id: true, status: true },
        },
      },
    });

    if (!supplierAdmin || !supplierAdmin.active) {
      throw new UnauthorizedError('Account not found or inactive');
    }

    // Attach to request
    (req as any).supplierAdmin = {
      id: supplierAdmin.id,
      email: supplierAdmin.email,
      role: supplierAdmin.role,
    };
    (req as any).supplier = supplierAdmin.supplier;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

/**
 * Require supplier account to be active
 */
export function requireActiveSupplier(
  req: SupplierAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const supplier = (req as any).supplier;

  if (!supplier || supplier.status !== 'ACTIVE') {
    return next(new ForbiddenError('Supplier account is not active'));
  }

  next();
}

/**
 * Require specific supplier roles
 */
export function requireSupplierRole(...allowedRoles: SupplierRole[]) {
  return (req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) => {
    const supplierAdmin = (req as any).supplierAdmin;

    if (!supplierAdmin) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!allowedRoles.includes(supplierAdmin.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Ensure supplier can only access their own resources
 */
export function ensureSupplierOwnership(paramName: string = 'supplierId') {
  return async (req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) => {
    const supplier = (req as any).supplier;
    const requestedSupplierId = (req as any).params[paramName];

    if (requestedSupplierId && requestedSupplierId !== supplier?.id) {
      return next(new ForbiddenError('Access denied'));
    }

    next();
  };
}
