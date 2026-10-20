import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import {
  loginSchema,
  createAdminSchema,
  updateAdminSchema,
  changePasswordSchema,
  idParamsSchema,
} from '../../validations';

const router = Router();

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema, 'body'), authController.login);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get current admin profile
 * @access  Admin
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/admin/auth/password
 * @desc    Change password
 * @access  Admin
 */
router.put(
  '/password',
  authenticate,
  validate(changePasswordSchema, 'body'),
  authController.changePassword
);

// ============================================
// SUPER ADMIN ROUTES
// ============================================

/**
 * @route   POST /api/admin/auth/admins
 * @desc    Create new admin
 * @access  Super Admin
 */
router.post(
  '/admins',
  authenticate,
  requireRole('SUPER_ADMIN'),
  validate(createAdminSchema, 'body'),
  authController.createAdmin
);

/**
 * @route   GET /api/admin/auth/admins
 * @desc    Get all admins
 * @access  Super Admin
 */
router.get('/admins', authenticate, requireRole('SUPER_ADMIN'), authController.getAdmins);

/**
 * @route   GET /api/admin/auth/admins/:id
 * @desc    Get admin by ID
 * @access  Super Admin
 */
router.get(
  '/admins/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  validate(idParamsSchema, 'params'),
  authController.getAdmin
);

/**
 * @route   PUT /api/admin/auth/admins/:id
 * @desc    Update admin
 * @access  Super Admin
 */
router.put(
  '/admins/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  validate(idParamsSchema, 'params'),
  validate(updateAdminSchema, 'body'),
  authController.updateAdmin
);

/**
 * @route   DELETE /api/admin/auth/admins/:id
 * @desc    Delete admin
 * @access  Super Admin
 */
router.delete(
  '/admins/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  validate(idParamsSchema, 'params'),
  authController.deleteAdmin
);

export default router;
