import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

/**
 * @route   GET /api/settings/public
 * @desc    Get public settings (no auth required)
 * @access  Public
 */
router.get('/public', settingsController.getPublicSettings.bind(settingsController));

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Admin only
 */
router.get('/', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), settingsController.getAllSettings.bind(settingsController));

/**
 * @route   GET /api/settings/:key
 * @desc    Get a specific setting
 * @access  Admin only
 */
router.get('/:key', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), settingsController.getSetting.bind(settingsController));

/**
 * @route   PUT /api/settings/:key
 * @desc    Update a specific setting
 * @access  Admin only
 */
router.put('/:key', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), settingsController.updateSetting.bind(settingsController));

/**
 * @route   PUT /api/settings
 * @desc    Update multiple settings
 * @access  Admin only
 */
router.put('/', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), settingsController.updateMultipleSettings.bind(settingsController));

export default router;
