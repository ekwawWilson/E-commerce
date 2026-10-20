import nodemailer from 'nodemailer';
import config from '../../config';
import logger from '../../utils/logger';

// Email templates
const templates = {
  order_confirmation: (data: Record<string, any>) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #1A1A2E; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">Order Confirmed!</h1>
        </div>

        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #333; font-size: 16px;">Dear <strong>${data.customerName}</strong>,</p>
          <p style="color: #333; font-size: 16px;">Thank you for your order! Your order <strong>#${data.orderNumber}</strong> has been confirmed and is being processed.</p>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1A1A2E; margin-top: 0; font-size: 18px;">Order Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #1A1A2E;">
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 14px;">Item</th>
                  <th style="padding: 12px; text-align: center; color: #ffffff; font-size: 14px;">Qty</th>
                  <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 14px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map((item: any) => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #333; font-size: 14px;">${item.name}</td>
                    <td style="padding: 12px; text-align: center; color: #333; font-size: 14px;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; color: #333; font-size: 14px;">${Number(item.price).toLocaleString()} GHC</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="border-top: 2px solid #1A1A2E; margin-top: 15px; padding-top: 15px;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Subtotal:</td>
                  <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px;">${Number(data.subtotal).toLocaleString()} GHC</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Delivery Fee:</td>
                  <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px;">${Number(data.deliveryFee).toLocaleString()} GHC</td>
                </tr>
                <tr style="font-weight: bold;">
                  <td style="padding: 12px 0; color: #1A1A2E; font-size: 16px;">Total:</td>
                  <td style="padding: 12px 0; text-align: right; color: #1A1A2E; font-size: 16px;">${Number(data.total).toLocaleString()} GHC</td>
                </tr>
              </table>
            </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1A1A2E; margin-top: 0; font-size: 16px;">Delivery Address</h3>
            <p style="color: #333; margin: 0; font-size: 14px;">${data.deliveryAddress}</p>
            ${data.deliveryCity ? `<p style="color: #333; margin: 5px 0 0 0; font-size: 14px;">${data.deliveryCity}${data.deliveryRegion ? ', ' + data.deliveryRegion : ''}</p>` : ''}
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1A1A2E; margin-top: 0; font-size: 16px;">Payment Method</h3>
            <p style="color: #333; margin: 0; font-size: 14px;">${data.paymentMethod === 'MOMO' ? 'Mobile Money (MoMo)' : 'Cash on Delivery'}</p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">We will notify you when your order is shipped.</p>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">Thank you for shopping with us!</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  payment_success: (data: Record<string, any>) => ({
    subject: `Payment Received - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #28a745; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0;">Payment Successful!</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #333;">Dear <strong>${data.customerName}</strong>,</p>
          <p style="color: #333;">We have received your payment for order <strong>#${data.orderNumber}</strong>.</p>
          <p style="color: #333;"><strong>Amount:</strong> ${Number(data.total).toLocaleString()} ${data.currency}</p>
          <p style="color: #333;">Your order is now being processed and will be shipped soon.</p>
          <p style="color: #666; margin-top: 30px;">Thank you for your purchase!</p>
        </div>
      </body>
      </html>
    `,
  }),

  delivery_update: (data: Record<string, any>) => ({
    subject: `Delivery Update - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #1A1A2E; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0;">Delivery Update</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #333;">Dear <strong>${data.customerName}</strong>,</p>
          <p style="color: #333;">Your order <strong>#${data.orderNumber}</strong> status has been updated.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; margin: 0;"><strong>Status:</strong> ${data.status}</p>
            <p style="color: #333; margin: 10px 0 0 0;">${data.message}</p>
            ${data.trackingNumber ? `<p style="color: #333; margin: 10px 0 0 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcome: (data: Record<string, any>) => ({
    subject: 'Welcome to E-Commerce Store!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #1A1A2E; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to E-Commerce Store!</h1>
        </div>

        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #333; font-size: 16px;">Dear <strong>${data.customerName}</strong>,</p>
          <p style="color: #333; font-size: 16px;">Thank you for creating an account with us! We're excited to have you as part of our community.</p>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h2 style="color: #1A1A2E; margin-top: 0; font-size: 18px;">Your Account Details</h2>
            <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${data.customerName}</p>
            <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${data.customerEmail}</p>
            ${data.customerPhone ? `<p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1A1A2E; margin-top: 0; font-size: 16px;">What's Next?</h3>
            <ul style="color: #333; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>Browse our wide selection of products</li>
              <li>Add items to your cart and checkout easily</li>
              <li>Track your orders in real-time</li>
              <li>Save multiple delivery addresses for convenience</li>
              <li>Enjoy secure payments with Mobile Money or Cash on Delivery</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #333; font-size: 14px; margin-bottom: 15px;">Ready to start shopping?</p>
            <a href="${data.appUrl || 'https://ecommerce.com'}" style="display: inline-block; background-color: #1A1A2E; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600;">START SHOPPING</a>
          </div>

          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #666; font-size: 13px; margin: 5px 0;">Need help? Contact our support team anytime.</p>
            <p style="color: #666; font-size: 13px; margin: 5px 0;">We're here to make your shopping experience amazing!</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">Thank you for choosing us!</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">E-Commerce Store Team</p>
          </div>
        </div>
      </body>
      </html>
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

export type EmailTemplate = 'order_confirmation' | 'payment_success' | 'delivery_update' | 'welcome';

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

/**
 * Send email directly (without Redis queue)
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, template, data } = options;

  // Check if SMTP is configured
  if (!config.smtp.user || !config.smtp.pass) {
    logger.warn('SMTP not configured - email not sent', { to, template });
    return false;
  }

  try {
    const transporter = createTransporter();
    const emailContent = templates[template](data);

    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    logger.info(`Email sent successfully to ${to}`, { template });
    return true;
  } catch (error) {
    logger.error('Failed to send email', { to, template, error });
    return false;
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string;
  customerCity?: string | null;
  customerRegion?: string | null;
  paymentMethod: string;
  itemsSnapshot: any[];
  subtotal: number | any;
  deliveryFee: number | any;
  total: number | any;
}): Promise<boolean> {
  if (!order.customerEmail) {
    logger.info('No customer email provided - skipping email notification');
    return false;
  }

  return sendEmail({
    to: order.customerEmail,
    template: 'order_confirmation',
    data: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: order.itemsSnapshot,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      deliveryAddress: order.customerAddress,
      deliveryCity: order.customerCity,
      deliveryRegion: order.customerRegion,
      paymentMethod: order.paymentMethod,
    },
  });
}

/**
 * Send payment success email
 */
export async function sendPaymentSuccessEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  total: number | any;
  currency: string;
}): Promise<boolean> {
  if (!order.customerEmail) {
    return false;
  }

  return sendEmail({
    to: order.customerEmail,
    template: 'payment_success',
    data: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: Number(order.total),
      currency: order.currency,
    },
  });
}

/**
 * Send delivery update email
 */
export async function sendDeliveryUpdateEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  message: string;
  trackingNumber?: string | null;
}): Promise<boolean> {
  if (!order.customerEmail) {
    return false;
  }

  return sendEmail({
    to: order.customerEmail,
    template: 'delivery_update',
    data: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      message: order.message,
      trackingNumber: order.trackingNumber,
    },
  });
}

/**
 * Send welcome email to new customer
 */
export async function sendWelcomeEmail(customer: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
}): Promise<boolean> {
  if (!customer.customerEmail) {
    return false;
  }

  return sendEmail({
    to: customer.customerEmail,
    template: 'welcome',
    data: {
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      customerPhone: customer.customerPhone,
      appUrl: process.env.FRONTEND_URL || 'https://ecommerce.com',
    },
  });
}
