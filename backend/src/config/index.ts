import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis (optional)
  redisUrl: process.env.REDIS_URL || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Supabase Storage
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'images',
  },

  // Mobile Money (MTN MoMo)
  momo: {
    baseUrl: process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com',
    subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY || '',
    apiUser: process.env.MOMO_API_USER || '',
    apiKey: process.env.MOMO_API_KEY || '',
    environment: process.env.MOMO_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MOMO_CALLBACK_URL || '',
    // Fake the MoMo API locally: every payment request succeeds without money
    // moving. Defaults on outside production; refused in production below.
    simulate: process.env.MOMO_SIMULATE
      ? process.env.MOMO_SIMULATE === 'true'
      : (process.env.NODE_ENV || 'development') !== 'production',
  },

  // Twilio (SMS)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  // Email (Nodemailer)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
  },

  // SMTP (for notification workers)
  smtp: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
    fromName: process.env.SMTP_FROM_NAME || 'E-Commerce Store',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@ecommerce.com',
  },

  // WhatsApp (Twilio)
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    from: process.env.WHATSAPP_FROM || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    webClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),

  // Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  maxImagesPerProduct: 6,

  // Currency
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'GHS',
  currencySymbol: process.env.CURRENCY_SYMBOL || 'GH₵',
};

// Placeholder values shipped in the .env templates and the dev fallback above.
const PLACEHOLDER_JWT_SECRETS = [
  'your-secret-key',
  'your-super-secret-jwt-key-change-in-production',
];

/**
 * Refuse to boot production with settings that make it insecure: a missing or
 * guessable JWT secret lets anyone forge admin tokens, and simulated MoMo marks
 * every mobile money order as paid.
 */
export function assertProductionConfig(
  cfg: Pick<typeof config, 'nodeEnv' | 'jwtSecret' | 'momo'>,
  rawJwtSecret: string | undefined = process.env.JWT_SECRET
) {
  if (cfg.nodeEnv !== 'production') return;

  const problems: string[] = [];

  if (
    !rawJwtSecret ||
    rawJwtSecret.length < 32 ||
    PLACEHOLDER_JWT_SECRETS.includes(rawJwtSecret) ||
    rawJwtSecret.startsWith('CHANGE_ME')
  ) {
    problems.push('JWT_SECRET must be set to a random string of at least 32 characters');
  }

  if (cfg.momo.simulate) {
    problems.push('MOMO_SIMULATE must not be enabled in production');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n- ${problems.join('\n- ')}`);
  }
}

assertProductionConfig(config);

export default config;
