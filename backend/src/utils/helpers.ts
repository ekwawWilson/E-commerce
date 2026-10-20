import { nanoid } from 'nanoid';

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXXX
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniqueId = nanoid(5).toUpperCase();
  return `ORD-${dateStr}-${uniqueId}`;
}

/**
 * Generate a tracking number
 * Format: TRK-XXXXXXXXXXXXX
 */
export function generateTrackingNumber(): string {
  return `TRK-${nanoid(12).toUpperCase()}`;
}

/**
 * Generate a transaction ID
 * Format: TXN-XXXXXXXXXXXXX
 */
export function generateTransactionId(): string {
  return `TXN-${nanoid(12).toUpperCase()}`;
}

/**
 * Generate a reference ID with custom prefix
 * Format: PREFIX-YYYYMMDD-XXXXX
 */
export function generateReferenceId(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniqueId = nanoid(5).toUpperCase();
  return `${prefix}-${dateStr}-${uniqueId}`;
}

/**
 * Generate a UUID for cart
 */
export function generateCartId(): string {
  return nanoid(21);
}

/**
 * Slugify a string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Currency presentation rules.
 *
 * These differ by more than the symbol: XAF has no minor unit and trails the
 * amount, while GHS uses two decimals and leads with the symbol. Keep this
 * table in sync with the frontend copy in frontend/src/lib/utils.ts.
 */
const CURRENCY_FORMATS: Record<
  string,
  { symbol: string; position: 'prefix' | 'suffix'; decimals: number; locale: string }
> = {
  GHS: { symbol: 'GH₵', position: 'prefix', decimals: 2, locale: 'en-GH' },
  XAF: { symbol: 'FCFA', position: 'suffix', decimals: 0, locale: 'fr-FR' },
  NGN: { symbol: '₦', position: 'prefix', decimals: 2, locale: 'en-NG' },
  USD: { symbol: '$', position: 'prefix', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', position: 'prefix', decimals: 2, locale: 'en-IE' },
  GBP: { symbol: '£', position: 'prefix', decimals: 2, locale: 'en-GB' },
};

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'GHS'): string {
  const format = CURRENCY_FORMATS[currency] ?? {
    symbol: currency,
    position: 'prefix' as const,
    decimals: 2,
    locale: 'en-US',
  };

  const value = Number.isFinite(amount) ? amount : 0;

  const formatted = value.toLocaleString(format.locale, {
    minimumFractionDigits: format.decimals,
    maximumFractionDigits: format.decimals,
  });

  return format.position === 'suffix'
    ? `${formatted} ${format.symbol}`
    : `${format.symbol} ${formatted}`;
}

/**
 * Calculate delivery fee based on settings
 */
export function calculateDeliveryFee(
  subtotal: number,
  defaultFee: number,
  freeThreshold: number
): number {
  if (subtotal >= freeThreshold) {
    return 0;
  }
  return defaultFee;
}

export const GHANA_COUNTRY_CODE = '233';

/**
 * Normalise a Ghanaian phone number to E.164 (+233XXXXXXXXX).
 *
 * Ghana numbers are 9 significant digits after the country code, conventionally
 * written locally with a leading 0 (e.g. 024 412 3456 -> +233244123456).
 * Mobile prefixes start with 2 or 5; 3 covers landlines.
 *
 * Accepts: 0244123456, 244123456, +233244123456, 233244123456, 00233244123456,
 * and any of the above with spaces, dashes or parentheses.
 * Returns the input unchanged when it cannot be confidently normalised, so
 * callers can surface a validation error rather than send to a wrong number.
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return phone;

  let cleaned = phone.replace(/\D/g, '');

  // Strip international prefixes, longest first.
  if (cleaned.startsWith(`00${GHANA_COUNTRY_CODE}`)) {
    cleaned = cleaned.slice(2 + GHANA_COUNTRY_CODE.length);
  } else if (cleaned.startsWith(GHANA_COUNTRY_CODE) && cleaned.length > 9) {
    cleaned = cleaned.slice(GHANA_COUNTRY_CODE.length);
  }

  // Strip the local trunk prefix.
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Valid Ghanaian subscriber numbers: 9 digits starting 2, 3 or 5.
  if (/^[235]\d{8}$/.test(cleaned)) {
    return `+${GHANA_COUNTRY_CODE}${cleaned}`;
  }

  return phone;
}

/**
 * Mask sensitive data (for logging)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return `${localPart}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

/**
 * Columns that may be used for sorting. `sortBy` is interpolated straight into
 * Prisma's `orderBy` by every list service, so an unrecognised value must never
 * reach the query — some callers (e.g. the supplier portal routes) have no
 * request validation at all, so this helper is the last line of defence.
 */
const ALLOWED_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'name',
  'price',
  'stock',
  'featured',
  'total',
  'orderNumber',
  'status',
]);

/**
 * Parse pagination params from query
 */
export function parsePaginationParams(query: Record<string, unknown>): {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const requestedSortBy = query.sortBy as string;
  const sortBy = ALLOWED_SORT_FIELDS.has(requestedSortBy) ? requestedSortBy : 'createdAt';

  const sortOrder = (query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  return { page, limit, skip, sortBy, sortOrder };
}

/**
 * Check if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Get date range for reports
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now.setHours(23, 59, 59, 999));
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
  }

  return { startDate, endDate };
}
