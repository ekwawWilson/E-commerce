import { Router } from 'express';
import * as orderController from './order.controller';
import { validate } from '../../middleware/validate';
import { apiLimiter, checkoutLimiter } from '../../middleware/rateLimit';
import {
  checkoutSchemaRefined,
  orderTrackingSchema,
  idParamsSchema,
} from '../../validations';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   POST /api/checkout
 * @desc    Create order from cart
 * @access  Public
 */
router.post(
  '/checkout',
  checkoutLimiter,
  validate(checkoutSchemaRefined, 'body'),
  orderController.checkout
);

/**
 * @route   GET /api/orders/track
 * @desc    Track order by order number, phone, or email
 * @access  Public
 */
router.get(
  '/track',
  apiLimiter,
  validate(orderTrackingSchema, 'query'),
  orderController.trackOrder
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID (limited info)
 * @access  Public
 */
router.get(
  '/:id',
  apiLimiter,
  validate(idParamsSchema, 'params'),
  orderController.getOrder
);

export default router;
