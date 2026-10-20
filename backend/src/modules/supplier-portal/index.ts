import { Router } from 'express';
import { supplierPortalController } from './supplier-portal.controller';
import { authenticateSupplier, requireActiveSupplier, requireSupplierRole } from '../supplier-auth/supplier-auth.middleware';
import { validate } from '../../middleware/validate';
import {
  createSupplierProductSchema,
  updateSupplierProductSchema,
} from '../../validations';
import { supplierUploadRoutes } from './supplier-upload.routes';

const router = Router();

// All routes require supplier authentication
router.use(authenticateSupplier);
router.use(requireActiveSupplier);

// Dashboard
router.get('/dashboard', supplierPortalController.getDashboard);

// Profile
router.get('/profile', supplierPortalController.getProfile);
router.put('/profile', requireSupplierRole('OWNER', 'MANAGER'), supplierPortalController.updateProfile);

// Products
router.get('/products', supplierPortalController.getProducts);
router.get('/products/:productId', supplierPortalController.getProduct);
router.post(
  '/products',
  requireSupplierRole('OWNER', 'MANAGER'),
  validate(createSupplierProductSchema),
  supplierPortalController.createProduct
);
router.put(
  '/products/:productId',
  requireSupplierRole('OWNER', 'MANAGER'),
  validate(updateSupplierProductSchema),
  supplierPortalController.updateProduct
);
router.delete('/products/:productId', requireSupplierRole('OWNER'), supplierPortalController.deleteProduct);

// Orders
router.get('/orders', supplierPortalController.getOrders);
router.get('/orders/:orderItemId', supplierPortalController.getOrderItem);
router.patch(
  '/orders/:orderItemId/fulfillment',
  requireSupplierRole('OWNER', 'MANAGER', 'STAFF'),
  supplierPortalController.updateFulfillmentStatus
);

// Payouts
router.get('/payouts', supplierPortalController.getPayouts);

// Product image uploads (into the supplier's own folder)
router.use('/upload', supplierUploadRoutes);

export const supplierPortalRoutes = router;

export { supplierPortalController } from './supplier-portal.controller';
export { supplierPortalService } from './supplier-portal.service';
