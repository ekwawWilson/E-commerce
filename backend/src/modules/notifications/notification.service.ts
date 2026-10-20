import { emailQueue, smsQueue, whatsappQueue, pdfQueue } from '../../config/queue';
import prisma from '../../config/database';
import logger from '../../utils/logger';

export interface EmailJobData {
  to: string;
  subject: string;
  template: 'order_confirmation' | 'payment_success' | 'payment_failed' | 'delivery_update' | 'invoice';
  data: Record<string, any>;
  orderId?: string;
}

export interface SmsJobData {
  to: string;
  message: string;
  orderId?: string;
}

export interface WhatsAppJobData {
  to: string;
  template: string;
  data: Record<string, any>;
  orderId?: string;
}

export interface PdfJobData {
  type: 'invoice' | 'delivery_note';
  orderId: string;
}

export class NotificationService {
  /**
   * Queue email notification
   */
  async queueEmail(data: EmailJobData): Promise<string | null> {
    if (!emailQueue) {
      logger.warn('Email queue not available - Redis not configured');
      return null;
    }

    const job = await emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    logger.info(`Email job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Queue SMS notification
   */
  async queueSms(data: SmsJobData): Promise<string | null> {
    if (!smsQueue) {
      logger.warn('SMS queue not available - Redis not configured');
      return null;
    }

    const job = await smsQueue.add('send-sms', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    logger.info(`SMS job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Queue WhatsApp notification
   */
  async queueWhatsApp(data: WhatsAppJobData): Promise<string | null> {
    if (!whatsappQueue) {
      logger.warn('WhatsApp queue not available - Redis not configured');
      return null;
    }

    const job = await whatsappQueue.add('send-whatsapp', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    logger.info(`WhatsApp job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Queue PDF generation
   */
  async queuePdfGeneration(data: PdfJobData): Promise<string | null> {
    if (!pdfQueue) {
      logger.warn('PDF queue not available - Redis not configured');
      return null;
    }

    const job = await pdfQueue.add('generate-pdf', data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
      removeOnComplete: 50,
      removeOnFail: 20,
    });

    logger.info(`PDF generation job queued: ${job.id}`);
    return job.id!;
  }

  /**
   * Send order confirmation notifications
   */
  async sendOrderConfirmation(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const items = order.itemsSnapshot as any[];

    // Queue email
    if (order.customerEmail) {
      await this.queueEmail({
        to: order.customerEmail,
        subject: `Order Confirmation - ${order.orderNumber}`,
        template: 'order_confirmation',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          items,
          subtotal: order.subtotal.toString(),
          deliveryFee: order.deliveryFee.toString(),
          total: order.total.toString(),
          paymentMethod: order.paymentMethod,
          deliveryAddress: order.customerAddress,
        },
        orderId,
      });
    }

    // Queue SMS
    await this.queueSms({
      to: order.customerPhone,
      message: `Your order ${order.orderNumber} has been confirmed. Total: ${order.total} ${order.currency}. Track at: ${process.env.FRONTEND_URL}/track/${order.orderNumber}`,
      orderId,
    });

    // Queue WhatsApp if enabled
    if (process.env.WHATSAPP_ENABLED === 'true') {
      await this.queueWhatsApp({
        to: order.customerPhone,
        template: 'order_confirmation',
        data: {
          orderNumber: order.orderNumber,
          total: order.total.toString(),
          currency: order.currency,
        },
        orderId,
      });
    }

    // Queue invoice PDF generation
    await this.queuePdfGeneration({
      type: 'invoice',
      orderId,
    });
  }

  /**
   * Send payment success notifications
   */
  async sendPaymentSuccess(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Queue email
    if (order.customerEmail) {
      await this.queueEmail({
        to: order.customerEmail,
        subject: `Payment Received - ${order.orderNumber}`,
        template: 'payment_success',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total.toString(),
          currency: order.currency,
        },
        orderId,
      });
    }

    // Queue SMS
    await this.queueSms({
      to: order.customerPhone,
      message: `Payment received for order ${order.orderNumber}. Amount: ${order.total} ${order.currency}. Your order is being processed.`,
      orderId,
    });
  }

  /**
   * Send payment failed notifications
   */
  async sendPaymentFailed(orderId: string, reason?: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Queue email
    if (order.customerEmail) {
      await this.queueEmail({
        to: order.customerEmail,
        subject: `Payment Failed - ${order.orderNumber}`,
        template: 'payment_failed',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total.toString(),
          currency: order.currency,
          reason: reason || 'Payment could not be processed',
        },
        orderId,
      });
    }

    // Queue SMS
    await this.queueSms({
      to: order.customerPhone,
      message: `Payment failed for order ${order.orderNumber}. Please retry or contact support.`,
      orderId,
    });
  }

  /**
   * Send delivery update notifications
   */
  async sendDeliveryUpdate(orderId: string, status: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const statusMessages: Record<string, string> = {
      PICKED_UP: 'Your order has been picked up and is on its way!',
      IN_TRANSIT: 'Your order is in transit and will arrive soon.',
      DELIVERED: 'Your order has been delivered. Thank you for shopping with us!',
    };

    const message = statusMessages[status] || `Order status updated to: ${status}`;

    // Queue email
    if (order.customerEmail) {
      await this.queueEmail({
        to: order.customerEmail,
        subject: `Delivery Update - ${order.orderNumber}`,
        template: 'delivery_update',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status,
          message,
          trackingNumber: order.delivery?.trackingNumber,
        },
        orderId,
      });
    }

    // Queue SMS
    await this.queueSms({
      to: order.customerPhone,
      message: `Order ${order.orderNumber}: ${message}`,
      orderId,
    });

    // Queue WhatsApp if enabled
    if (process.env.WHATSAPP_ENABLED === 'true') {
      await this.queueWhatsApp({
        to: order.customerPhone,
        template: 'delivery_update',
        data: {
          orderNumber: order.orderNumber,
          status,
        },
        orderId,
      });
    }
  }

  /**
   * Log notification to database
   */
  async logNotification(
    type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH',
    recipient: string,
    subject: string,
    status: 'PENDING' | 'SENT' | 'FAILED',
    orderId?: string,
    error?: string
  ): Promise<void> {
    await prisma.notificationLog.create({
      data: {
        type,
        recipient,
        subject,
        message: subject, // Using subject as message for logging
        status,
        orderId,
        error,
        sentAt: status === 'SENT' ? new Date() : undefined,
      },
    });
  }
}

export const notificationService = new NotificationService();
