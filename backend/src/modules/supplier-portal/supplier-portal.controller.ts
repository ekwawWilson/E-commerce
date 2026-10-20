import { Response, NextFunction } from 'express';
import { supplierPortalService } from './supplier-portal.service';
import { SupplierAuthenticatedRequest } from '../supplier-auth/supplier-auth.middleware';
import { FulfillmentStatus } from '@prisma/client';

export class SupplierPortalController {
  /**
   * Get dashboard statistics
   */
  async getDashboard(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;

      const stats = await supplierPortalService.getDashboardStats(supplierId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier's products
   */
  async getProducts(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { page, limit, search, active, sortBy, sortOrder } = req.query as any;

      const result = await supplierPortalService.getProducts(supplierId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        active: active !== undefined ? active === 'true' : undefined,
        sortBy,
        sortOrder,
      });

      res.json({
        success: true,
        data: {
          items: result.products,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single product
   */
  async getProduct(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { productId } = req.params;

      const product = await supplierPortalService.getProduct(supplierId, productId);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a product
   */
  async createProduct(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const productData = req.body;

      const product = await supplierPortalService.createProduct(supplierId, productData);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a product
   */
  async updateProduct(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { productId } = req.params;
      const productData = req.body;

      const product = await supplierPortalService.updateProduct(supplierId, productId, productData);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { productId } = req.params;

      await supplierPortalService.deleteProduct(supplierId, productId);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get orders (order items)
   */
  async getOrders(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { page, limit, status, search } = req.query as any;

      const result = await supplierPortalService.getOrders(supplierId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        status: status as FulfillmentStatus,
        search,
      });

      res.json({
        success: true,
        data: {
          items: result.orderItems,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order item
   */
  async getOrderItem(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { orderItemId } = req.params;

      const orderItem = await supplierPortalService.getOrderItem(supplierId, orderItemId);

      res.json({
        success: true,
        data: orderItem,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update fulfillment status
   */
  async updateFulfillmentStatus(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { orderItemId } = req.params;
      const { status, trackingNumber } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required',
        });
      }

      const orderItem = await supplierPortalService.updateFulfillmentStatus(
        supplierId,
        orderItemId,
        status as FulfillmentStatus,
        trackingNumber
      );

      res.json({
        success: true,
        data: orderItem,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payouts
   */
  async getPayouts(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const { page, limit } = req.query as any;

      const result = await supplierPortalService.getPayouts(supplierId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json({
        success: true,
        data: {
          items: result.payouts,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier profile
   */
  async getProfile(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;

      const profile = await supplierPortalService.getProfile(supplierId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update supplier profile
   */
  async updateProfile(req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplierId = (req as any).supplier?.id;
      const profileData = req.body;

      const profile = await supplierPortalService.updateProfile(supplierId, profileData);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const supplierPortalController = new SupplierPortalController();
