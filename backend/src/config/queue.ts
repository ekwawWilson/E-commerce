import { Queue, QueueEvents } from 'bullmq';
import config from './index';

let connection: { host: string; port: number; password?: string } | null = null;
let emailQueue: Queue | null = null;
let smsQueue: Queue | null = null;
let whatsappQueue: Queue | null = null;
let pdfQueue: Queue | null = null;
let reportQueue: Queue | null = null;
let emailQueueEvents: QueueEvents | null = null;
let smsQueueEvents: QueueEvents | null = null;

try {
  if (config.redisUrl) {
    const redisUrl = new URL(config.redisUrl);
    connection = {
      host: redisUrl.hostname || 'localhost',
      port: parseInt(redisUrl.port || '6379', 10),
      password: redisUrl.password || undefined,
    };

    // Notification Queues
    emailQueue = new Queue('email', { connection });
    smsQueue = new Queue('sms', { connection });
    whatsappQueue = new Queue('whatsapp', { connection });

    // PDF Generation Queue
    pdfQueue = new Queue('pdf', { connection });

    // Report Generation Queue
    reportQueue = new Queue('report', { connection });

    // Queue Events for monitoring
    emailQueueEvents = new QueueEvents('email', { connection });
    smsQueueEvents = new QueueEvents('sms', { connection });
  } else {
    console.warn('Redis not configured - queues disabled');
  }
} catch (err) {
  console.warn('Queue initialization failed - background jobs disabled');
}

export {
  connection,
  emailQueue,
  smsQueue,
  whatsappQueue,
  pdfQueue,
  reportQueue,
  emailQueueEvents,
  smsQueueEvents,
};
