import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/database';
import config from '../config';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response';
import { AdminRole } from '@prisma/client';

interface JwtPayload {
  type?: 'admin'; // Absent on admin tokens issued before token types were added
  adminId: string;
  email: string;
  role: AdminRole;
  iat?: number;
}

/**
 * Whether a token predates the account's last password change, in which case
 * it must no longer work (password reset should log out every old session).
 * One second of slack because `iat` is in whole seconds.
 */
export function issuedBeforePasswordChange(iat: number | undefined, passwordChangedAt: Date | null | undefined) {
  if (!passwordChangedAt || !iat) return false;
  return iat * 1000 < passwordChangedAt.getTime() - 1000;
}

/**
 * Admin, supplier and customer tokens share one signing secret, so a valid
 * signature alone doesn't make a token an admin token.
 */
function isAdminToken(decoded: { type?: string; adminId?: unknown }): decoded is JwtPayload {
  return (decoded.type === undefined || decoded.type === 'admin') && typeof decoded.adminId === 'string';
}

interface CustomerJwtPayload {
  type: 'customer';
  customerId: string;
  email: string;
  phone: string;
  iat?: number;
}

// Extended request type with customer
export interface CustomerRequest extends Request {
  customer?: {
    id: string;
    email: string;
    phone: string;
    name: string;
  };
}

/**
 * Middleware to authenticate admin users
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (!isAdminToken(decoded)) {
      return unauthorizedResponse(res, 'Invalid token type');
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin || !admin.active) {
      return unauthorizedResponse(res, 'Invalid or inactive account');
    }

    if (issuedBeforePasswordChange(decoded.iat, admin.passwordChangedAt)) {
      return unauthorizedResponse(res, 'Session expired, please sign in again');
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return unauthorizedResponse(res, 'Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      return unauthorizedResponse(res, 'Token expired');
    }
    next(error);
  }
}

/**
 * Middleware to require specific admin roles
 */
export function requireRole(...roles: AdminRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    if (!roles.includes(req.admin.role)) {
      return forbiddenResponse(res, 'Insufficient permissions');
    }

    next();
  };
}

/**
 * SUPPORT staff can look but not change: any request other than a read needs
 * ADMIN or SUPER_ADMIN.
 */
export function readOnlyForSupport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.admin?.role === 'SUPPORT') {
    return forbiddenResponse(res, 'Support staff have read-only access here');
  }
  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.admin) {
    return unauthorizedResponse(res, 'Authentication required');
  }
  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (!isAdminToken(decoded)) {
      return next();
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (admin && admin.active && !issuedBeforePasswordChange(decoded.iat, admin.passwordChangedAt)) {
      req.admin = admin;
    }

    next();
  } catch {
    // Ignore errors, just continue without auth
    next();
  }
}

/**
 * Middleware to authenticate customer users
 */
export async function authenticateCustomer(
  req: CustomerRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwtSecret) as CustomerJwtPayload;

    // Ensure it's a customer token
    if (decoded.type !== 'customer') {
      return unauthorizedResponse(res, 'Invalid token type');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        active: true,
        passwordChangedAt: true,
      },
    });

    if (!customer || !customer.active) {
      return unauthorizedResponse(res, 'Invalid or inactive account');
    }

    if (issuedBeforePasswordChange(decoded.iat, customer.passwordChangedAt)) {
      return unauthorizedResponse(res, 'Session expired, please sign in again');
    }

    req.customer = {
      id: customer.id,
      email: customer.email,
      phone: customer.phone,
      name: customer.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return unauthorizedResponse(res, 'Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      return unauthorizedResponse(res, 'Token expired');
    }
    next(error);
  }
}

/**
 * Optional customer authentication - doesn't fail if no token
 */
export async function optionalCustomerAuth(
  req: CustomerRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwtSecret) as CustomerJwtPayload;

    // Only proceed if it's a customer token
    if (decoded.type !== 'customer') {
      return next();
    }

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        active: true,
        passwordChangedAt: true,
      },
    });

    if (customer && customer.active && !issuedBeforePasswordChange(decoded.iat, customer.passwordChangedAt)) {
      req.customer = {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        name: customer.name,
      };
    }

    next();
  } catch {
    // Ignore errors, just continue without auth
    next();
  }
}
