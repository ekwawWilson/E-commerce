import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { connection } from '../../config/queue';
import config from '../../config';
import logger from '../../utils/logger';
import { formatCurrency } from '../../utils/helpers';
import { EmailJobData, notificationService } from './notification.service';

// Email templates
const templates = {
  order_confirmation: (data: Record<string, any>) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Order Confirmed!</h1>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for your order. Your order <strong>${data.orderNumber}</strong> has been confirmed.</p>

        <h2 style="color: #555;">Order Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: any) => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${formatCurrency(Number(item.price), data.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 10px; text-align: right;">${formatCurrency(Number(data.subtotal), data.currency)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 10px; text-align: right;"><strong>Delivery Fee:</strong></td>
              <td style="padding: 10px; text-align: right;">${formatCurrency(Number(data.deliveryFee), data.currency)}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>${formatCurrency(Number(data.total), data.currency)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <h2 style="color: #555;">Delivery Address</h2>
        <p>${data.deliveryAddress}</p>

        <h2 style="color: #555;">Payment Method</h2>
        <p>${data.paymentMethod === 'MOMO' ? 'Mobile Money' : 'Cash on Delivery'}</p>

        <p style="margin-top: 30px;">Thank you for shopping with us!</p>
      </div>
    `,
  }),

  payment_success: (data: Record<string, any>) => ({
    subject: `Payment Received - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Payment Successful!</h1>
        <p>Dear ${data.customerName},</p>
        <p>We have received your payment for order <strong>${data.orderNumber}</strong>.</p>
        <p><strong>Amount:</strong> ${data.total} ${data.currency}</p>
        <p>Your order is now being processed and will be shipped soon.</p>
        <p style="margin-top: 30px;">Thank you for your purchase!</p>
      </div>
    `,
  }),

  payment_failed: (data: Record<string, any>) => ({
    subject: `Payment Failed - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Payment Failed</h1>
        <p>Dear ${data.customerName},</p>
        <p>Unfortunately, the payment for order <strong>${data.orderNumber}</strong> could not be processed.</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
        <p><strong>Amount:</strong> ${data.total} ${data.currency}</p>
        <p>Please try again or contact our support team for assistance.</p>
      </div>
    `,
  }),

  delivery_update: (data: Record<string, any>) => ({
    subject: `Delivery Update - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #007bff;">Delivery Update</h1>
        <p>Dear ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> status has been updated.</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p>${data.message}</p>
        ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
      </div>
    `,
  }),

  invoice: (data: Record<string, any>) => ({
    subject: `Invoice - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Invoice</h1>
        <p>Please find your invoice attached for order <strong>${data.orderNumber}</strong>.</p>
      </div>
    `,
  }),
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
};

// Process email job
async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, template, data, orderId } = job.data;

  logger.info(`Processing email job ${job.id} - Template: ${template}, To: ${to}`);

  try {
    const transporter = createTransporter();
    const emailTemplate = templates[template](data);

    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    // Log success
    await notificationService.logNotification(
      'EMAIL',
      to,
      emailTemplate.subject,
      'SENT',
      orderId
    );

    logger.info(`Email sent successfully: ${job.id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure
    await notificationService.logNotification(
      'EMAIL',
      to,
      job.data.subject,
      'FAILED',
      orderId,
      errorMessage
    );

    logger.error(`Email failed: ${job.id}`, error);
    throw error;
  }
}

// Create and export worker
export const emailWorker = new Worker<EmailJobData>('email', processEmail, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Worker event handlers
emailWorker.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job ${job?.id} failed:`, err);
});

emailWorker.on('error', (err) => {
  logger.error('Email worker error:', err);
});

export function startEmailWorker(): void {
  logger.info('Email worker started');
}
