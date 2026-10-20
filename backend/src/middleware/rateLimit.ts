import rateLimit from 'express-rate-limit';
import config from '../config';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter for checkout/payment endpoints
 */
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'Too many checkout attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter for upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 uploads per minute
  message: {
    success: false,
    error: 'Too many upload requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter for webhook endpoints (more permissive)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
