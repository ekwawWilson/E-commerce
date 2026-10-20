import { Request, Response, NextFunction } from 'express';
import { supplierService } from './supplier.service';
import { successResponse, paginatedResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Get paginated list of suppliers (public - only ACTIVE)
 */
export async function getSuppliers(req: Request, res: Response, next: NextFunction) {
  try {
    const { suppliers, total, page, limit } = await supplierService.getSuppliers(req.query);
    return paginatedResponse(res, suppliers, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get supplier by ID or slug (public)
 */
export async function getSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.getSupplierByIdOrSlug(req.params.idOrSlug);
    return successResponse(res, supplier);
  } catch (error) {
    next(error);
  }
}

/**
 * Get supplier's products (public)
 */
export async function getSupplierProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.getSupplierByIdOrSlug(req.params.idOrSlug);
    const { products, total, page, limit } = await supplierService.getSupplierProducts(
      supplier.id,
      req.query
    );
    return paginatedResponse(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all suppliers (admin)
 */
export async function getAllSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { suppliers, total, page, limit } = await supplierService.getAllSuppliers(req.query);
    return paginatedResponse(res, suppliers, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get supplier by ID (admin)
 */
export async function getSupplierAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.getSupplierById(req.params.supplierId);
    return successResponse(res, supplier);
  } catch (error) {
    next(error);
  }
}

/**
 * Create supplier (admin)
 */
export async function createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return successResponse(res, supplier, 'Supplier created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier (admin)
 */
export async function updateSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.updateSupplier(req.params.supplierId, req.body);
    return successResponse(res, supplier, 'Supplier updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier status (admin)
 */
export async function updateSupplierStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const supplier = await supplierService.updateSupplierStatus(req.params.supplierId, status);
    return successResponse(res, supplier, 'Supplier status updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier commission (admin)
 */
export async function updateSupplierCommission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { commissionRate } = req.body;
    const supplier = await supplierService.updateSupplierCommission(req.params.supplierId, commissionRate);
    return successResponse(res, supplier, 'Supplier commission updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get supplier stats (admin)
 */
export async function getSupplierStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await supplierService.getSupplierStats(req.params.supplierId);
    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}

// ============================================
// SUPPLIER USER MANAGEMENT (Admin)
// ============================================

/**
 * Get supplier users
 */
export async function getSupplierUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await supplierService.getSupplierUsers(req.params.supplierId);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Create supplier user
 */
export async function createSupplierUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await supplierService.createSupplierUser(req.params.supplierId, req.body);
    return successResponse(res, user, 'Supplier user created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier user
 */
export async function updateSupplierUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await supplierService.updateSupplierUser(req.params.supplierId, req.params.userId, req.body);
    return successResponse(res, user, 'Supplier user updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete supplier user
 */
export async function deleteSupplierUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await supplierService.deleteSupplierUser(req.params.supplierId, req.params.userId);
    return successResponse(res, null, 'Supplier user deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier user permissions
 */
export async function updateSupplierUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { permissions } = req.body;
    const user = await supplierService.updateSupplierUserPermissions(
      req.params.supplierId,
      req.params.userId,
      permissions
    );
    return successResponse(res, user, 'User permissions updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier max users
 */
export async function updateSupplierMaxUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { maxUsers } = req.body;
    const supplier = await supplierService.updateSupplierMaxUsers(req.params.supplierId, maxUsers);
    return successResponse(res, supplier, 'Max users updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update supplier max products
 */
export async function updateSupplierMaxProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { maxProducts } = req.body;
    const supplier = await supplierService.updateSupplierMaxProducts(req.params.supplierId, maxProducts);
    return successResponse(res, supplier, 'Max products updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get supplier product limits
 */
export async function getSupplierProductLimits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const limits = await supplierService.getSupplierProductLimits(req.params.supplierId);
    return successResponse(res, limits);
  } catch (error) {
    next(error);
  }
}

// ============================================
// SUPPLIER PRODUCT MANAGEMENT (Admin)
// ============================================

/**
 * Get supplier products (admin)
 */
export async function getSupplierProductsAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { products, total, page, limit } = await supplierService.getSupplierProductsAdmin(
      req.params.supplierId,
      req.query as any
    );
    return paginatedResponse(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle supplier product status
 */
export async function toggleSupplierProductStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { active } = req.body;
    const product = await supplierService.toggleSupplierProductStatus(
      req.params.supplierId,
      req.params.productId,
      active
    );
    return successResponse(res, product, `Product ${active ? 'enabled' : 'disabled'} successfully`);
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk toggle supplier products
 */
export async function bulkToggleSupplierProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { productIds, active } = req.body;
    const result = await supplierService.bulkToggleSupplierProducts(req.params.supplierId, productIds, active);
    return successResponse(res, result, `${result.updated} products ${active ? 'enabled' : 'disabled'} successfully`);
  } catch (error) {
    next(error);
  }
}

// ============================================
// SUPPLIER ORDER MANAGEMENT (Admin)
// ============================================

/**
 * Get supplier orders (admin)
 */
export async function getSupplierOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { orderItems, total, page, limit } = await supplierService.getSupplierOrders(
      req.params.supplierId,
      req.query as any
    );
    return paginatedResponse(res, orderItems, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get supplier order stats
 */
export async function getSupplierOrderStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await supplierService.getSupplierOrderStats(req.params.supplierId);
    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}

/**
 * Update order item fulfillment
 */
export async function updateOrderItemFulfillment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orderItem = await supplierService.updateOrderItemFulfillment(
      req.params.supplierId,
      req.params.orderItemId,
      req.body
    );
    return successResponse(res, orderItem, 'Fulfillment status updated successfully');
  } catch (error) {
    next(error);
  }
}

// Export as object for easy import
export const supplierController = {
  getSuppliers,
  getSupplier,
  getSupplierProducts,
  getAllSuppliers,
  getSupplierAdmin,
  createSupplier,
  updateSupplier,
  updateSupplierStatus,
  updateSupplierCommission,
  getSupplierStats,
  // User management
  getSupplierUsers,
  createSupplierUser,
  updateSupplierUser,
  deleteSupplierUser,
  updateSupplierUserPermissions,
  updateSupplierMaxUsers,
  // Product limits
  updateSupplierMaxProducts,
  getSupplierProductLimits,
  // Product management
  getSupplierProductsAdmin,
  toggleSupplierProductStatus,
  bulkToggleSupplierProducts,
  // Order management
  getSupplierOrders,
  getSupplierOrderStats,
  updateOrderItemFulfillment,
};
