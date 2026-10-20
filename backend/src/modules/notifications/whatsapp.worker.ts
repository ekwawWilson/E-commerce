import { Worker, Job } from 'bullmq';
import { connection } from '../../config/queue';
import logger from '../../utils/logger';
import { sanitizePhoneNumber } from '../../utils/helpers';
import { WhatsAppJobData, notificationService } from './notification.service';

// WhatsApp Provider interface
interface WhatsAppProvider {
  sendTemplate(to: string, template: string, data: Record<string, any>): Promise<{ messageId: string }>;
}

// Meta WhatsApp Business API Provider
class MetaWhatsAppProvider implements WhatsAppProvider {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
  }

  async sendTemplate(
    to: string,
    template: string,
    data: Record<string, any>
  ): Promise<{ messageId: string }> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    // Build template components based on data
    const components = this.buildTemplateComponents(template, data);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json() as { messages?: Array<{ id: string }> };
    return { messageId: result.messages?.[0]?.id || 'unknown' };
  }

  private buildTemplateComponents(
    template: string,
    data: Record<string, any>
  ): any[] {
    // Build components based on template type
    switch (template) {
      case 'order_confirmation':
        return [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderNumber },
              { type: 'text', text: `${data.total} ${data.currency}` },
            ],
          },
        ];
      case 'delivery_update':
        return [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderNumber },
              { type: 'text', text: data.status },
            ],
          },
        ];
      default:
        return [];
    }
  }
}

// Twilio WhatsApp Provider
class TwilioWhatsAppProvider implements WhatsAppProvider {
  private client: any;

  constructor() {
    try {
      const twilio = require('twilio');
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch {
      logger.warn('Twilio not configured for WhatsApp');
    }
  }

  async sendTemplate(
    to: string,
    template: string,
    data: Record<string, any>
  ): Promise<{ messageId: string }> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    // Format message based on template
    const message = this.formatMessage(template, data);

    const result = await this.client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    });

    return { messageId: result.sid };
  }

  private formatMessage(template: string, data: Record<string, any>): string {
    switch (template) {
      case 'order_confirmation':
        return `🛒 Order Confirmed!\n\nOrder: ${data.orderNumber}\nTotal: ${data.total} ${data.currency}\n\nThank you for your order!`;
      case 'delivery_update':
        return `📦 Delivery Update\n\nOrder: ${data.orderNumber}\nStatus: ${data.status}\n\nTrack your order in our app.`;
      default:
        return JSON.stringify(data);
    }
  }
}

// Mock WhatsApp Provider for development
class MockWhatsAppProvider implements WhatsAppProvider {
  async sendTemplate(
    to: string,
    template: string,
    data: Record<string, any>
  ): Promise<{ messageId: string }> {
    logger.info(`[MOCK WHATSAPP] To: ${to}, Template: ${template}, Data:`, data);
    return { messageId: `mock-wa-${Date.now()}` };
  }
}

// Get WhatsApp provider based on config
function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';

  switch (provider) {
    case 'meta':
      return new MetaWhatsAppProvider();
    case 'twilio':
      return new TwilioWhatsAppProvider();
    default:
      return new MockWhatsAppProvider();
  }
}

const whatsappProvider = getWhatsAppProvider();

// Process WhatsApp job
async function processWhatsApp(job: Job<WhatsAppJobData>): Promise<void> {
  const { to, template, data, orderId } = job.data;

  logger.info(`Processing WhatsApp job ${job.id} - Template: ${template}, To: ${to}`);

  try {
    // Format phone number
    const formattedPhone = formatWhatsAppNumber(to);

    const result = await whatsappProvider.sendTemplate(formattedPhone, template, data);

    // Log success
    await notificationService.logNotification(
      'WHATSAPP',
      to,
      `Template: ${template}`,
      'SENT',
      orderId
    );

    logger.info(`WhatsApp sent successfully: ${job.id}, MessageId: ${result.messageId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure
    await notificationService.logNotification(
      'WHATSAPP',
      to,
      `Template: ${template}`,
      'FAILED',
      orderId,
      errorMessage
    );

    logger.error(`WhatsApp failed: ${job.id}`, error);
    throw error;
  }
}

// Format phone number for WhatsApp (needs country code without +)
// WhatsApp identifiers are digits only (no leading '+'), so strip it from the
// shared E.164 result rather than reimplementing the normalisation.
function formatWhatsAppNumber(phone: string): string {
  return sanitizePhoneNumber(phone).replace(/^\+/, '').replace(/\D/g, '');
}

// Create and export worker
export const whatsappWorker = new Worker<WhatsAppJobData>('whatsapp', processWhatsApp, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Worker event handlers
whatsappWorker.on('completed', (job) => {
  logger.info(`WhatsApp job ${job.id} completed`);
});

whatsappWorker.on('failed', (job, err) => {
  logger.error(`WhatsApp job ${job?.id} failed:`, err);
});

whatsappWorker.on('error', (err) => {
  logger.error('WhatsApp worker error:', err);
});

export function startWhatsAppWorker(): void {
  logger.info('WhatsApp worker started');
}
