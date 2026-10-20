import { Worker, Job } from 'bullmq';
import { connection } from '../../config/queue';
import config from '../../config';
import logger from '../../utils/logger';
import { sanitizePhoneNumber } from '../../utils/helpers';
import { SmsJobData, notificationService } from './notification.service';
import { getSmsProvider } from './sms.providers';

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
