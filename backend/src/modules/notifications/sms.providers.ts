import logger from '../../utils/logger';
import { sanitizePhoneNumber } from '../../utils/helpers';

// SMS providers live here, apart from the queue worker, so code that must
// send immediately (e.g. phone verification codes) can do so without Redis.

// SMS Provider interface
export interface SmsProvider {
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

// Africa's Talking SMS Provider
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
function createSmsProvider(): SmsProvider {
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

let provider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (!provider) {
    provider = createSmsProvider();
  }
  return provider;
}

/**
 * Send an SMS now, without the queue.
 */
export async function sendSmsNow(to: string, message: string) {
  return getSmsProvider().send(sanitizePhoneNumber(to), message);
}
