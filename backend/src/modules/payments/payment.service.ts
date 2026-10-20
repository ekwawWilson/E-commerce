import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import config from '../../config';
import { Payment, PaymentStatus, MobileMoneyProvider } from '@prisma/client';
import { generateTransactionId } from '../../utils/helpers';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import { emailQueue, smsQueue, pdfQueue } from '../../config/queue';
import logger from '../../utils/logger';

interface MomoRequestBody {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
}

interface MomoStatusResult {
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  financialTransactionId?: string;
  reason?: string;
}

export class PaymentService {
  private momoToken: { value: string; expiresAt: number } | null = null;
  /**
   * Initiate mobile money payment
   */
  async initiatePayment(orderId: string, phoneNumber: string, provider: MobileMoneyProvider = 'MTN_MOMO') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!order.payment) {
      throw new AppError('Payment record not found', 400);
    }

    if (order.payment.status === PaymentStatus.PAID) {
      throw new AppError('Order has already been paid', 400);
    }

    if (order.cancelledAt) {
      throw new AppError('This order has been cancelled', 400);
    }

    // Only MTN MoMo has a real integration. Telecel Cash and AirtelTigo Money
    // are valid Ghana networks in the schema but have no implementation yet —
    // previously they were silently routed to MTN's endpoints with the wrong
    // provider recorded, which fails opaquely at the gateway. Fail loudly here
    // until an aggregator (Hubtel/Paystack) is wired up.
    if (provider !== 'MTN_MOMO') {
      throw new AppError(
        `${provider.replace(/_/g, ' ')} is not available yet. Please pay with MTN Mobile Money or choose cash on delivery.`,
        400
      );
    }

    const transactionId = generateTransactionId();

    // Update payment with transaction ID
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        transactionId,
        provider,
        phoneNumber,
        status: PaymentStatus.PENDING,
      },
    });

    // MTN identifies a request-to-pay by an X-Reference-Id that must be a
    // UUID; our transactionId travels as the externalId MTN echoes back.
    const referenceId = randomUUID();

    try {
      const momoResponse = await this.callMomoApi(referenceId, {
        amount: String(order.total),
        currency: order.currency,
        externalId: transactionId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber.replace(/^\+/, ''),
        },
        payerMessage: `Payment for order ${order.orderNumber}`,
        payeeNote: `Order ${order.orderNumber}`,
      });

      // Update payment with provider reference
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          providerReference: momoResponse.referenceId,
        },
      });

      return {
        success: true,
        transactionId,
        referenceId: momoResponse.referenceId,
        message: 'Payment initiated. Please approve the payment on your phone.',
      };
    } catch (error) {
      logger.error('MoMo API error:', error);

      // Update payment status to failed
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failedReason: error instanceof Error ? error.message : 'Payment initiation failed',
        },
      });

      throw new AppError('Failed to initiate payment. Please try again.', 500);
    }
  }

  /**
   * Handle payment webhook from mobile money provider.
   *
   * The callback is unauthenticated and the client is handed its own
   * transactionId, so the body is only trusted to identify the payment. The
   * status applied always comes from asking MoMo directly.
   */
  async handleWebhook(payload: { externalId: string } & Record<string, unknown>) {
    const payment = await prisma.payment.findUnique({
      where: { transactionId: payload.externalId },
    });

    if (!payment) {
      logger.warn(`Payment not found for transaction: ${payload.externalId}`);
      throw new NotFoundError('Payment');
    }

    // Log webhook payload
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        webhookPayload: payload as object,
      },
    });

    const momoStatus = await this.checkMomoStatus(payment.providerReference || payment.transactionId);
    const status = await this.applyMomoStatus(payment, momoStatus);

    return { success: true, status };
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string) {
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // If already completed, return current status
    if (payment.status !== PaymentStatus.PENDING) {
      return {
        transactionId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
      };
    }

    // Check with MoMo API
    try {
      const momoStatus = await this.checkMomoStatus(payment.providerReference || transactionId);
      const status = await this.applyMomoStatus(payment, momoStatus);

      return {
        transactionId,
        status,
        amount: payment.amount,
        currency: payment.currency,
      };
    } catch (error) {
      logger.error('Error verifying payment:', error);
      return {
        transactionId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      };
    }
  }

  /**
   * Apply a status reported by MoMo to the payment and its order, returning
   * the payment's resulting status. PAID is final, and repeating the current
   * status is a no-op, so a webhook racing a verify call can neither undo a
   * confirmed payment nor send its notifications twice.
   */
  private async applyMomoStatus(payment: Payment, result: MomoStatusResult): Promise<PaymentStatus> {
    if (result.status === 'PENDING') {
      return payment.status;
    }

    const newStatus = result.status === 'SUCCESSFUL' ? PaymentStatus.PAID : PaymentStatus.FAILED;

    const applied = await prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { notIn: [PaymentStatus.PAID, newStatus] } },
        data: {
          status: newStatus,
          providerReference: result.financialTransactionId || payment.providerReference,
          paidAt: newStatus === PaymentStatus.PAID ? new Date() : undefined,
          failedAt: newStatus === PaymentStatus.FAILED ? new Date() : undefined,
          failedReason: result.reason,
        },
      });

      if (count === 0) return false;

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: newStatus,
        },
      });

      return true;
    });

    if (!applied) {
      const current = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });
      return current?.status ?? payment.status;
    }

    // The payment is already committed; a notification failure must not make
    // the caller see a stale status.
    const notify = newStatus === PaymentStatus.PAID
      ? this.onPaymentSuccess(payment.orderId)
      : this.onPaymentFailure(payment.orderId, result.reason);
    await notify.catch((error) => logger.error('Failed to queue payment notifications:', error));

    return newStatus;
  }

  /**
   * Call MTN MoMo API (simplified implementation)
   */
  private async callMomoApi(referenceId: string, data: MomoRequestBody): Promise<{ referenceId: string }> {
    if (config.momo.simulate) {
      // Simulate API call in development
      logger.info('MoMo API call (simulated):', data);
      return { referenceId };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${await this.getMomoAccessToken()}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': config.momo.environment,
      'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
      'Content-Type': 'application/json',
    };

    // Without a callback URL MTN never calls the webhook and we rely on polling
    if (config.momo.callbackUrl) {
      headers['X-Callback-Url'] = config.momo.callbackUrl;
    }

    const response = await fetch(`${config.momo.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    // MTN answers 202 Accepted; the outcome arrives later via callback/status
    if (!response.ok) {
      throw new Error(`MoMo API error: ${response.status}`);
    }

    return { referenceId };
  }

  /**
   * Check MoMo payment status
   */
  private async checkMomoStatus(referenceId: string): Promise<MomoStatusResult> {
    if (config.momo.simulate) {
      // Simulate successful payment in development
      return {
        status: 'SUCCESSFUL',
        financialTransactionId: `FT-${Date.now()}`,
      };
    }

    const response = await fetch(
      `${config.momo.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getMomoAccessToken()}`,
          'X-Target-Environment': config.momo.environment,
          'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MoMo status check error: ${response.status}`);
    }

    const data = await response.json() as { status: 'PENDING' | 'FAILED' | 'SUCCESSFUL'; financialTransactionId?: string; reason?: string };
    return {
      status: data.status,
      financialTransactionId: data.financialTransactionId,
      reason: data.reason,
    };
  }

  /**
   * Get MoMo access token
   */
  private async getMomoAccessToken(): Promise<string> {
    // Reuse the token until a minute before it expires
    if (this.momoToken && this.momoToken.expiresAt > Date.now() + 60_000) {
      return this.momoToken.value;
    }

    const credentials = Buffer.from(
      `${config.momo.apiUser}:${config.momo.apiKey}`
    ).toString('base64');

    const response = await fetch(`${config.momo.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get MoMo access token');
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    this.momoToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }

  /**
   * Handle successful payment
   */
  private async onPaymentSuccess(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    // Generate invoice
    await pdfQueue?.add('generate-invoice', {
      type: 'invoice',
      orderId,
    });

    // Send confirmation SMS
    await smsQueue?.add('payment-success', {
      to: order.customerPhone,
      message: `Payment received for order ${order.orderNumber}. Total: ${order.total} ${order.currency}. Thank you for your purchase!`,
      orderId,
    });

    // Send confirmation email
    if (order.customerEmail) {
      await emailQueue?.add('payment-success', {
        to: order.customerEmail,
        subject: `Payment Confirmed - ${order.orderNumber}`,
        template: 'payment-success',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: Number(order.total),
          currency: order.currency,
        },
        orderId,
      });
    }
  }

  /**
   * Handle failed payment
   */
  private async onPaymentFailure(orderId: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    // Send failure notification
    await smsQueue?.add('payment-failed', {
      to: order.customerPhone,
      message: `Payment failed for order ${order.orderNumber}. ${reason || 'Please try again or contact support.'}`,
      orderId,
    });
  }
}

export const paymentService = new PaymentService();
