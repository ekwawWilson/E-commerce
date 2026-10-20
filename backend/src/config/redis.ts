import Redis from 'ioredis';
import config from './index';

let redis: Redis | null = null;

try {
  if (config.redisUrl) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    redis.on('error', (err) => {
      console.warn('Redis connection error (Redis is optional):', err.message);
    });

    // Try to connect but don't block startup
    redis.connect().catch((err) => {
      console.warn('Redis not available (background jobs disabled):', err.message);
      redis = null;
    });
  } else {
    console.warn('Redis URL not configured - background jobs disabled');
  }
} catch (err) {
  console.warn('Redis initialization failed - background jobs disabled');
  redis = null;
}

export { redis };
export default redis;
