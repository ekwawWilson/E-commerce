import { Request } from 'express';
import { Admin } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  admin?: Admin;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sku?: string;
}

export interface CartItemWithProduct {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  snapshotPrice: number;
  snapshotName: string;
  currency: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    active: boolean;
    images: Array<{
      url: string;
      isPrimary: boolean;
    }>;
  };
}

export interface DeliverySettings {
  default_fee: number;
  free_delivery_threshold: number;
  estimated_days_min: number;
  estimated_days_max: number;
  delivery_zones: string[];
}

export interface PaymentMethodsSettings {
  momo: boolean;
  cod: boolean;
  momo_providers: string[];
}

export interface StoreInfo {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  whatsapp: string;
}

// Job payloads
export interface EmailJobPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  orderId?: string;
}

export interface SmsJobPayload {
  to: string;
  message: string;
  orderId?: string;
}

export interface WhatsAppJobPayload {
  to: string;
  message: string;
  orderId?: string;
}

export interface PdfJobPayload {
  type: 'invoice' | 'delivery_note';
  orderId: string;
}

export interface ReportJobPayload {
  type: 'SALES' | 'INVENTORY' | 'ORDERS' | 'PAYMENTS' | 'DELIVERIES';
  parameters: {
    startDate?: string;
    endDate?: string;
    format?: 'pdf' | 'csv';
  };
  adminId: string;
  reportId: string;
}
