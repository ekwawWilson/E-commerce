import { Router } from 'express';
import { supplierAuthController } from './supplier-auth.controller';
import { authenticateSupplier, requireActiveSupplier, requireSupplierRole } from './supplier-auth.middleware';

const router = Router();

// Public routes
router.post('/register', supplierAuthController.register);
router.post('/login', supplierAuthController.login);

// Protected routes
router.get('/me', authenticateSupplier, supplierAuthController.getMe);
router.post('/change-password', authenticateSupplier, supplierAuthController.changePassword);

// Staff management (requires OWNER or MANAGER role)
router.get(
  '/staff',
  authenticateSupplier,
  requireActiveSupplier,
  requireSupplierRole('OWNER', 'MANAGER'),
  supplierAuthController.getStaff
);
router.post(
  '/staff',
  authenticateSupplier,
  requireActiveSupplier,
  requireSupplierRole('OWNER', 'MANAGER'),
  supplierAuthController.createStaff
);
router.patch(
  '/staff/:staffId/status',
  authenticateSupplier,
  requireActiveSupplier,
  requireSupplierRole('OWNER', 'MANAGER'),
  supplierAuthController.updateStaffStatus
);
router.delete(
  '/staff/:staffId',
  authenticateSupplier,
  requireActiveSupplier,
  requireSupplierRole('OWNER'),
  supplierAuthController.deleteStaff
);

export const supplierAuthRoutes = router;

export { supplierAuthController } from './supplier-auth.controller';
export { supplierAuthService } from './supplier-auth.service';
export { authenticateSupplier, requireActiveSupplier, requireSupplierRole, ensureSupplierOwnership } from './supplier-auth.middleware';
