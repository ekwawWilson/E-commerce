import { Worker, Job } from 'bullmq';
import { connection } from '../../config/queue';
import config from '../../config';
import logger from '../../utils/logger';
import { sanitizePhoneNumber } from '../../utils/helpers';
import { SmsJobData, notificationService } from './notification.service';

// SMS Provider interface
interface SmsProvider {
  send(to: string, message: string): Promise<{ messageId: string }>;
}

// Twilio SMS Provider
class TwilioProvider implements SmsProvider {
  private client: any;

  constructor() {
    // Lazy load twilio
    try {
      const twilio = require('twilio');
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch {
      logger.warn('Twilio not configured');
    }
  }

  async send(to: string, message: string): Promise<{ messageId: string }> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    const result = await this.client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return { messageId: result.sid };
  }
}

// Africa's Talking SMS Provider (common in Cameroon)
class AfricasTalkingProvider implements SmsProvider {
  private client: any;

  constructor() {
    try {
      const AfricasTalking = require('africastalking');
      const africastalking = AfricasTalking({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME,
      });
      this.client = africastalking.SMS;
    } catch {
      logger.warn("Africa's Talking not configured");
    }
  }

  async send(to: string, message: string): Promise<{ messageId: string }> {
    if (!this.client) {
      throw new Error("Africa's Talking client not initialized");
    }

    const result = await this.client.send({
      to: [to],
      message,
      from: process.env.AT_SENDER_ID,
    });

    return { messageId: result.SMSMessageData?.Recipients?.[0]?.messageId || 'unknown' };
  }
}

// Mock SMS Provider for development
class MockSmsProvider implements SmsProvider {
  async send(to: string, message: string): Promise<{ messageId: string }> {
    logger.info(`[MOCK SMS] To: ${to}, Message: ${message}`);
    return { messageId: `mock-${Date.now()}` };
  }
}

// Get SMS provider based on config
function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER || 'mock';

  switch (provider) {
    case 'twilio':
      return new TwilioProvider();
    case 'africastalking':
      return new AfricasTalkingProvider();
    default:
      return new MockSmsProvider();
  }
}

const smsProvider = getSmsProvider();

// Process SMS job
async function processSms(job: Job<SmsJobData>): Promise<void> {
  const { to, message, orderId } = job.data;

  logger.info(`Processing SMS job ${job.id} - To: ${to}`);

  try {
    // Format phone number (ensure it has country code)
    const formattedPhone = formatPhoneNumber(to);

    const result = await smsProvider.send(formattedPhone, message);

    // Log success
    await notificationService.logNotification(
      'SMS',
      to,
      message.substring(0, 100),
      'SENT',
      orderId
    );

    logger.info(`SMS sent successfully: ${job.id}, MessageId: ${result.messageId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure
    await notificationService.logNotification(
      'SMS',
      to,
      message.substring(0, 100),
      'FAILED',
      orderId,
      errorMessage
    );

    logger.error(`SMS failed: ${job.id}`, error);
    throw error;
  }
}

// Format phone number to E.164 for the SMS gateway.
// Delegates to the shared Ghana implementation so SMS, WhatsApp and the API
// all normalise identically — these used to be three divergent copies.
function formatPhoneNumber(phone: string): string {
  return sanitizePhoneNumber(phone);
}

// Create and export worker
export const smsWorker = new Worker<SmsJobData>('sms', processSms, {
  connection,
  concurrency: 10,
  limiter: {
    max: 20,
    duration: 1000,
  },
});

// Worker event handlers
smsWorker.on('completed', (job) => {
  logger.info(`SMS job ${job.id} completed`);
});

smsWorker.on('failed', (job, err) => {
  logger.error(`SMS job ${job?.id} failed:`, err);
});

smsWorker.on('error', (err) => {
  logger.error('SMS worker error:', err);
});

export function startSmsWorker(): void {
  logger.info('SMS worker started');
}
