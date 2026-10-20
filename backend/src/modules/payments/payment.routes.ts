import { Router } from 'express';
import * as paymentController from './payment.controller';
import { validate } from '../../middleware/validate';
import { checkoutLimiter, webhookLimiter } from '../../middleware/rateLimit';
import { initiatePaymentSchema, verifyPaymentSchema } from '../../validations';

const router = Router();

/**
 * @route   POST /api/payment/initiate
 * @desc    Initiate mobile money payment
 * @access  Public
 */
router.post(
  '/initiate',
  checkoutLimiter,
  validate(initiatePaymentSchema, 'body'),
  paymentController.initiatePayment
);

/**
 * @route   POST /api/payment/webhook
 * @desc    Handle payment webhook from mobile money provider
 * @access  Public (webhook from payment provider)
 */
router.post('/webhook', webhookLimiter, paymentController.handleWebhook);

/**
 * @route   GET /api/payment/verify/:transactionId
 * @desc    Verify payment status
 * @access  Public
 */
router.get(
  '/verify/:transactionId',
  checkoutLimiter,
  paymentController.verifyPayment
);

export default router;
