// ===========================================
// Shared Constants for E-Commerce Application
// ===========================================

// Cart
export const CART_SESSION_COOKIE_NAME = 'cart_session_id';
export const CART_EXPIRATION_DAYS = 90; // 3 months

// Order
export const ORDER_NUMBER_PREFIX = 'ORD';
export const ORDER_NUMBER_LENGTH = 8;

// Currency
export const DEFAULT_CURRENCY = 'GHS';
export const CURRENCY_SYMBOL = 'GH₵';
export const CURRENCY_DECIMALS = 2;

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// Images
export const MAX_PRODUCT_IMAGES = 6;
export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Delivery (GHS — these were XAF magnitudes and are rescaled ~10:1)
export const DEFAULT_DELIVERY_FEE = 30;
export const FREE_DELIVERY_THRESHOLD = 2000;

// Stock
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

// Redis Keys
export const REDIS_KEYS = {
  CART_PREFIX: 'cart:',
  SESSION_PREFIX: 'session:',
  RATE_LIMIT_PREFIX: 'ratelimit:',
  SETTINGS: 'app:settings',
} as const;

// BullMQ Queue Names
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  ORDER_PROCESSING: 'order-processing',
  CLEANUP: 'cleanup',
} as const;

// Job Types
export const JOB_TYPES = {
  // Notification jobs
  SEND_SMS: 'send-sms',
  SEND_EMAIL: 'send-email',
  SEND_WHATSAPP: 'send-whatsapp',

  // Order processing jobs
  PROCESS_PAYMENT: 'process-payment',
  UPDATE_INVENTORY: 'update-inventory',
  GENERATE_INVOICE: 'generate-invoice',

  // Cleanup jobs
  CLEAN_EXPIRED_CARTS: 'clean-expired-carts',
  ARCHIVE_OLD_ORDERS: 'archive-old-orders',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Public
  PRODUCTS: '/api/products',
  CATEGORIES: '/api/categories',
  CART: '/api/cart',
  ORDERS: '/api/orders',
  PAYMENTS_WEBHOOK: '/api/payments/webhook',

  // Admin
  ADMIN_AUTH: '/api/admin/auth',
  ADMIN_PRODUCTS: '/api/admin/products',
  ADMIN_CATEGORIES: '/api/admin/categories',
  ADMIN_ORDERS: '/api/admin/orders',
  ADMIN_COURIERS: '/api/admin/couriers',
  ADMIN_REPORTS: '/api/admin/reports',
  ADMIN_SETTINGS: '/api/admin/settings',
} as const;

// Order Status Labels
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Payment Status Labels
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

// Delivery Status Labels
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

// Payment Method Labels
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  MOBILE_MONEY: 'Mobile Money',
  CASH_ON_DELIVERY: 'Cash on Delivery',
};

// Mobile Money Provider Labels (Ghana networks)
export const MOBILE_MONEY_PROVIDER_LABELS: Record<string, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  TELECEL_CASH: 'Telecel Cash',
  AIRTELTIGO_MONEY: 'AirtelTigo Money',
};

// Status Colors (for UI)
export const STATUS_COLORS = {
  order: {
    PENDING: 'yellow',
    CONFIRMED: 'blue',
    PROCESSING: 'indigo',
    SHIPPED: 'purple',
    DELIVERED: 'green',
    CANCELLED: 'red',
  },
  payment: {
    PENDING: 'yellow',
    PROCESSING: 'blue',
    COMPLETED: 'green',
    FAILED: 'red',
    REFUNDED: 'gray',
  },
  delivery: {
    PENDING: 'yellow',
    ASSIGNED: 'blue',
    IN_TRANSIT: 'purple',
    DELIVERED: 'green',
    FAILED: 'red',
  },
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Cart
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  CART_EXPIRED: 'CART_EXPIRED',
  CART_EMPTY: 'CART_EMPTY',

  // Products
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',

  // Orders
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',

  // Payment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_METHOD_DISABLED: 'PAYMENT_METHOD_DISABLED',
  INVALID_PAYMENT_WEBHOOK: 'INVALID_PAYMENT_WEBHOOK',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
