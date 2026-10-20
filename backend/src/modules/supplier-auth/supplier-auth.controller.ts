import { Request, Response, NextFunction } from 'express';
import { supplierAuthService } from './supplier-auth.service';
import { SupplierAuthenticatedRequest } from './supplier-auth.middleware';

export class SupplierAuthController {
  /**
   * Register a new supplier
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;

      if (!data.supplierName || !data.email || !data.ownerPassword) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: supplierName, email, ownerPassword',
        });
      }

      const result = await supplierAuthService.register(data);

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Please wait for approval.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login as supplier admin
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      const result = await supplierAuthService.login({ email, password });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current supplier admin profile
   */
  async getMe(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierAdminId = (req as any).supplierAdmin?.id;

      if (!supplierAdminId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const profile = await supplierAuthService.getMe(supplierAdminId);

      // Format response to match frontend expectations
      const { supplier, ...adminData } = profile;
      res.json({
        success: true,
        data: {
          supplierAdmin: adminData,
          supplier: supplier,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierAdminId = (req as any).supplierAdmin?.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
      }

      await supplierAuthService.changePassword(supplierAdminId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff members for current supplier
   */
  async getStaff(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;

      const staff = await supplierAuthService.getStaff(supplierId);

      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new staff member
   */
  async createStaff(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { email, name, password, role } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email, name, and password are required',
        });
      }

      const staff = await supplierAuthService.createStaff(supplierId, {
        email,
        name,
        password,
        role,
      });

      res.status(201).json({
        success: true,
        data: staff,
        message: 'Staff member created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update staff member status
   */
  async updateStaffStatus(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { staffId } = req.params;
      const { active } = req.body;

      if (active === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Active status is required',
        });
      }

      const staff = await supplierAuthService.updateStaffStatus(supplierId, staffId, active);

      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete staff member
   */
  async deleteStaff(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { staffId } = req.params;

      await supplierAuthService.deleteStaff(supplierId, staffId);

      res.json({
        success: true,
        message: 'Staff member deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const supplierAuthController = new SupplierAuthController();
