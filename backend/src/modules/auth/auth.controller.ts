import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Admin login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    return successResponse(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/**
 * Get current admin profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await authService.getProfile(req.admin!.id);
    return successResponse(res, profile);
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 */
export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.admin!.id, currentPassword, newPassword);
    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Create new admin (super admin only)
 */
export async function createAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const admin = await authService.createAdmin(req.body, req.admin!.id);
    return successResponse(res, admin, 'Admin created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all admins (super admin only)
 */
export async function getAdmins(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const admins = await authService.getAdmins();
    return successResponse(res, admins);
  } catch (error) {
    next(error);
  }
}

/**
 * Get admin by ID (super admin only)
 */
export async function getAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const admin = await authService.getAdminById(req.params.id);
    return successResponse(res, admin);
  } catch (error) {
    next(error);
  }
}

/**
 * Update admin (super admin only)
 */
export async function updateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const admin = await authService.updateAdmin(req.params.id, req.body, req.admin!.id);
    return successResponse(res, admin, 'Admin updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete admin (super admin only)
 */
export async function deleteAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await authService.deleteAdmin(req.params.id, req.admin!.id);
    return successResponse(res, null, 'Admin deleted successfully');
  } catch (error) {
    next(error);
  }
}
