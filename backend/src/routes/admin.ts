import { Router } from 'express';
import { authenticate, requireAdmin, requireRole, readOnlyForSupport } from '../middleware/auth';

// Admin module routes
import { adminProductRoutes } from '../modules/products';
import { adminOrderRoutes } from '../modules/orders';
import { reportRoutes } from '../modules/reports';
import { uploadRoutes } from '../modules/upload';
import { adminCategoryRoutes } from '../modules/categories';
import { specificationRoutes } from '../modules/specifications';
import { supplierController } from '../modules/suppliers';
import { payoutRoutes } from '../modules/payouts';
import { courierRoutes } from '../modules/delivery';
import { adminCouponRoutes } from '../modules/coupons/coupon.routes';

const router = Router();

// All admin routes require authentication
router.use(authenticate);
router.use(requireAdmin);

// Admin product management
router.use('/products', readOnlyForSupport, adminProductRoutes);

// Admin order management (money-affecting actions are role-checked inside)
router.use('/orders', adminOrderRoutes);

// Admin category management
router.use('/categories', readOnlyForSupport, adminCategoryRoutes);

// Admin specification templates
router.use('/specifications', readOnlyForSupport, specificationRoutes);

// Coupons
router.use('/coupons', requireRole('ADMIN', 'SUPER_ADMIN'), adminCouponRoutes);

// Supplier management (admin only)
router.get('/suppliers', supplierController.getAllSuppliers);
router.post('/suppliers', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.createSupplier);
router.get('/suppliers/:supplierId', supplierController.getSupplierAdmin);
router.put('/suppliers/:supplierId', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplier);
router.patch('/suppliers/:supplierId/status', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplierStatus);
router.patch('/suppliers/:supplierId/commission', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplierCommission);
router.get('/suppliers/:supplierId/stats', supplierController.getSupplierStats);
router.patch('/suppliers/:supplierId/max-users', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplierMaxUsers);
router.patch('/suppliers/:supplierId/max-products', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplierMaxProducts);
router.get('/suppliers/:supplierId/product-limits', supplierController.getSupplierProductLimits);

// Supplier user management
router.get('/suppliers/:supplierId/users', supplierController.getSupplierUsers);
router.post('/suppliers/:supplierId/users', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.createSupplierUser);
router.put('/suppliers/:supplierId/users/:userId', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplierUser);
router.patch('/suppliers/:supplierId/users/:userId/permissions', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateSupplierUserPermissions);
router.delete('/suppliers/:supplierId/users/:userId', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.deleteSupplierUser);

// Supplier product management
router.get('/suppliers/:supplierId/products', supplierController.getSupplierProductsAdmin);
router.patch('/suppliers/:supplierId/products/:productId/status', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.toggleSupplierProductStatus);
router.patch('/suppliers/:supplierId/products/bulk-status', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.bulkToggleSupplierProducts);

// Supplier order management
router.get('/suppliers/:supplierId/orders', supplierController.getSupplierOrders);
router.get('/suppliers/:supplierId/orders/stats', supplierController.getSupplierOrderStats);
router.patch('/suppliers/:supplierId/orders/:orderItemId/fulfillment', requireRole('ADMIN', 'SUPER_ADMIN'), supplierController.updateOrderItemFulfillment);

// Payout management (admin only)
router.use('/payouts', requireRole('ADMIN', 'SUPER_ADMIN'), payoutRoutes);

// Courier management (admin only)
router.use('/couriers', requireRole('ADMIN', 'SUPER_ADMIN'), courierRoutes);

// Reports (requires admin or super admin role)
router.use('/reports', requireRole('ADMIN', 'SUPER_ADMIN'), reportRoutes);

// Upload routes
router.use('/upload', readOnlyForSupport, uploadRoutes);

export default router;
