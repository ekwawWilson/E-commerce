import { Router } from 'express';
import * as orderController from './order.controller';
import { validate } from '../../middleware/validate';
import { apiLimiter, checkoutLimiter } from '../../middleware/rateLimit';
import { optionalCustomerAuth } from '../../middleware/auth';
import {
  checkoutSchemaRefined,
  checkoutQuoteSchema,
  orderTrackingSchema,
  idParamsSchema,
} from '../../validations';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   POST /api/orders/checkout
 * @desc    Create order from cart (linked to the customer if a customer token is sent)
 * @access  Public
 */
router.post(
  '/checkout',
  checkoutLimiter,
  optionalCustomerAuth,
  validate(checkoutSchemaRefined, 'body'),
  orderController.checkout
);

/**
 * @route   POST /api/orders/quote
 * @desc    Subtotal, discount, delivery fee and total for a cart and destination
 * @access  Public
 */
router.post(
  '/quote',
  validate(checkoutQuoteSchema, 'body'),
  orderController.quote
);

/**
 * @route   GET /api/orders/track
 * @desc    Track order by order number plus the phone or email it was placed with
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
 * @desc    Get order by ID (no personal details)
 * @access  Public
 */
router.get(
  '/:id',
  apiLimiter,
  validate(idParamsSchema, 'params'),
  orderController.getOrder
);

export default router;
