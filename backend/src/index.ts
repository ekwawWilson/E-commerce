import app from './app';
import config from './config';
import prisma from './config/database';
import logger from './utils/logger';

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close database connection
  await prisma.$disconnect();
  logger.info('Database connection closed');

  process.exit(0);
}

// Start server
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Start notification workers only if Redis is configured
    if (config.nodeEnv !== 'test' && config.redisUrl) {
      try {
        const { startEmailWorker } = await import('./modules/notifications/email.worker');
        const { startSmsWorker } = await import('./modules/notifications/sms.worker');
        const { startWhatsAppWorker } = await import('./modules/notifications/whatsapp.worker');
        const { startPdfWorker } = await import('./modules/notifications/pdf.worker');

        startEmailWorker();
        startSmsWorker();
        startWhatsAppWorker();
        startPdfWorker();
        logger.info('Notification workers started');
      } catch (error) {
        logger.warn('Failed to start notification workers - Redis may not be available');
      }
    } else if (!config.redisUrl) {
      logger.warn('Redis not configured - notification workers disabled');
    }

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`API available at http://localhost:${config.port}/api`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
