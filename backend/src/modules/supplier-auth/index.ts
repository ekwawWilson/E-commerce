import { Router } from 'express';
import { supplierAuthController } from './supplier-auth.controller';
import { authenticateSupplier, requireActiveSupplier, requireSupplierRole } from './supplier-auth.middleware';
import { validate } from '../../middleware/validate';
import { authLimiter, registrationLimiter } from '../../middleware/rateLimit';
import {
  supplierRegisterSchema,
  supplierLoginSchema,
  supplierChangePasswordSchema,
  supplierStaffSchema,
} from '../../validations';

const router = Router();

// Public routes
router.post('/register', registrationLimiter, validate(supplierRegisterSchema, 'body'), supplierAuthController.register);
router.post('/login', authLimiter, validate(supplierLoginSchema, 'body'), supplierAuthController.login);

// Protected routes
router.get('/me', authenticateSupplier, supplierAuthController.getMe);
router.post(
  '/change-password',
  authLimiter,
  authenticateSupplier,
  validate(supplierChangePasswordSchema, 'body'),
  supplierAuthController.changePassword
);

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
  validate(supplierStaffSchema, 'body'),
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
