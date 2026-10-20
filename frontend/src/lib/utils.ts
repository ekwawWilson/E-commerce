import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  CurrencyConfig,
  DEFAULT_CURRENCY_CONFIG,
  formatWithCurrency,
  resolveCurrency,
} from './currency';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Currency formatting.
 *
 * The presentation rules live in lib/currency.ts. The *active* currency is set
 * at runtime from admin store settings (see StoreSettingsProvider), so changing
 * the currency in the admin UI takes effect without a redeploy. The build-time
 * NEXT_PUBLIC_CURRENCY value is only the pre-hydration fallback.
 */
let activeCurrency: CurrencyConfig = DEFAULT_CURRENCY_CONFIG;

/** Called by StoreSettingsProvider once settings load. */
export function setActiveCurrency(currency: CurrencyConfig): void {
  activeCurrency = currency;
}

export function getActiveCurrency(): CurrencyConfig {
  return activeCurrency;
}

/** Format an amount in an explicit currency code (e.g. an order's stored one). */
export function formatCurrency(amount: number, currencyCode?: string): string {
  const currency = currencyCode ? resolveCurrency(currencyCode) : activeCurrency;
  return formatWithCurrency(amount, currency);
}

/** Format an amount in the store's active currency. */
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return formatWithCurrency(numPrice, activeCurrency);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export const PRODUCT_IMAGE_PLACEHOLDER = '/images/product-placeholder.svg';

export function getImageUrl(product: { images?: { url: string; isPrimary: boolean }[] }): string {
  const primaryImage = product.images?.find((img) => img.isPrimary);
  return primaryImage?.url || product.images?.[0]?.url || PRODUCT_IMAGE_PLACEHOLDER;
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function getDeliveryStatusColor(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'IN_TRANSIT':
      return 'bg-blue-100 text-blue-800';
    case 'PICKED_UP':
      return 'bg-yellow-100 text-yellow-800';
    case 'PENDING':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getDeliveryStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Order Placed',
    PICKED_UP: 'Picked Up',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}
