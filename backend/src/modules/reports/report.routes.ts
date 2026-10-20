import { Router } from 'express';
import * as reportController from './report.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import {
  dashboardStatsQuerySchema,
  salesReportQuerySchema,
  inventoryReportQuerySchema,
  generateReportSchema,
  reportListQuerySchema,
  idParamsSchema,
} from '../../validations';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/admin/reports/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get(
  '/dashboard',
  validate(dashboardStatsQuerySchema, 'query'),
  reportController.getDashboardStats
);

/**
 * @route   GET /api/admin/reports/sales
 * @desc    Get sales report
 * @access  Admin
 */
router.get(
  '/sales',
  validate(salesReportQuerySchema, 'query'),
  reportController.getSalesReport
);

/**
 * @route   GET /api/admin/reports/inventory
 * @desc    Get inventory report
 * @access  Admin
 */
router.get(
  '/inventory',
  validate(inventoryReportQuerySchema, 'query'),
  reportController.getInventoryReport
);

/**
 * @route   GET /api/admin/reports/orders
 * @desc    Get order report
 * @access  Admin
 */
router.get('/orders', reportController.getOrderReport);

/**
 * @route   GET /api/admin/reports/summary
 * @desc    Get comprehensive report summary for admin reports page
 * @access  Admin
 */
router.get('/summary', reportController.getReportSummary);

/**
 * @route   POST /api/admin/reports/generate
 * @desc    Generate a report (queued)
 * @access  Admin
 */
router.post(
  '/generate',
  validate(generateReportSchema, 'body'),
  reportController.generateReport
);

/**
 * @route   GET /api/admin/reports
 * @desc    Get all generated reports
 * @access  Admin
 */
router.get(
  '/',
  validate(reportListQuerySchema, 'query'),
  reportController.getReports
);

/**
 * @route   GET /api/admin/reports/:id
 * @desc    Get report by ID
 * @access  Admin
 */
router.get(
  '/:id',
  validate(idParamsSchema, 'params'),
  reportController.getReport
);

export default router;
