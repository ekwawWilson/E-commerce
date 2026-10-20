import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { successResponse } from '../../utils/response';
import logger from '../../utils/logger';

/**
 * Initiate payment
 */
export async function initiatePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, phoneNumber, provider } = req.body;
    const result = await paymentService.initiatePayment(orderId, phoneNumber, provider);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle payment webhook from mobile money provider
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    // Log incoming webhook
    logger.info('Payment webhook received:', JSON.stringify(req.body));

    const payload = req.body;

    if (typeof payload?.externalId !== 'string' || payload.externalId.length === 0) {
      return res.status(200).json({ success: false, message: 'Webhook processed' });
    }

    // Only externalId is used from the body; the service confirms the status with MoMo
    const result = await paymentService.handleWebhook(payload);

    return successResponse(res, result);
  } catch (error) {
    // Log but don't expose error details to webhook caller
    logger.error('Webhook error:', error);
    // Return 200 to prevent retries for invalid requests
    return res.status(200).json({ success: false, message: 'Webhook processed' });
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionId } = req.params;
    const result = await paymentService.verifyPayment(transactionId);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
