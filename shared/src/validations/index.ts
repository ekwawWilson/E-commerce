import { z } from 'zod';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DeliveryStatus,
  MobileMoneyProvider,
} from '../types/index.js';

// ===========================================
// Shared Validation Schemas
// ===========================================

// Common
export const idSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

export const phoneSchema = z
  .string()
  .min(9)
  .max(15)
  .regex(/^\+?[0-9]+$/, 'Invalid phone number');

export const emailSchema = z.string().email('Invalid email address');

// ===========================================
// Product Validations
// ===========================================

export const productCreateSchema = z.object({
  name: z.string().min(2).max(200),
  slug: slugSchema.optional(),
  description: z.string().max(5000).optional(),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().positive().optional(),
  sku: z.string().max(50).optional(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  categoryId: idSchema.optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productFilterSchema = z.object({
  categoryId: idSchema.optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  active: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['price', 'name', 'createdAt', 'stock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ===========================================
// Category Validations
// ===========================================

export const categoryCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  parentId: idSchema.optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ===========================================
// Cart Validations
// ===========================================

export const cartItemSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().positive().max(100),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(100),
});

// ===========================================
// Customer Validations
// ===========================================

export const customerSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema.optional(),
  phone: phoneSchema,
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  region: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// ===========================================
// Order Validations
// ===========================================

export const orderCreateSchema = z
  .object({
    customer: customerSchema,
    paymentMethod: z.nativeEnum(PaymentMethod),
    mobileMoneyProvider: z.nativeEnum(MobileMoneyProvider).optional(),
    phoneNumber: phoneSchema.optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // If payment method is mobile money, provider and phone are required
      if (data.paymentMethod === PaymentMethod.MOBILE_MONEY) {
        return data.mobileMoneyProvider && data.phoneNumber;
      }
      return true;
    },
    {
      message:
        'Mobile money provider and phone number are required for mobile money payments',
      path: ['mobileMoneyProvider'],
    }
  );

export const orderStatusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const orderFilterSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(), // Search by order number or customer name/phone
});

// ===========================================
// Delivery Validations
// ===========================================

export const assignCourierSchema = z.object({
  courierId: idSchema,
  estimatedDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const deliveryStatusUpdateSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  notes: z.string().max(500).optional(),
  failureReason: z.string().max(500).optional(),
});

// ===========================================
// Courier Validations
// ===========================================

export const courierCreateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  email: emailSchema.optional(),
  active: z.boolean().default(true),
});

export const courierUpdateSchema = courierCreateSchema.partial();

// ===========================================
// Admin Validations
// ===========================================

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
});

export const adminCreateSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
});

// ===========================================
// Settings Validations
// ===========================================

export const paymentMethodSettingsSchema = z.object({
  mobile_money: z.boolean(),
  cash_on_delivery: z.boolean(),
});

export const deliveryFeeSettingsSchema = z.object({
  default: z.number().min(0),
  free_above: z.number().min(0),
});

export const storeInfoSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().max(500),
  phone: phoneSchema,
  email: emailSchema,
  whatsapp: phoneSchema,
});

export const notificationSettingsSchema = z.object({
  admin_email: emailSchema,
  admin_whatsapp: phoneSchema,
});

export const appSettingsUpdateSchema = z.object({
  payment_methods_enabled: paymentMethodSettingsSchema.optional(),
  delivery_fee: deliveryFeeSettingsSchema.optional(),
  store_info: storeInfoSchema.optional(),
  notification_settings: notificationSettingsSchema.optional(),
});

// ===========================================
// Payment Webhook Validations
// ===========================================

export const mtnMomoWebhookSchema = z.object({
  financialTransactionId: z.string(),
  externalId: z.string(),
  amount: z.string(),
  currency: z.string(),
  payer: z.object({
    partyIdType: z.string(),
    partyId: z.string(),
  }),
  status: z.enum(['SUCCESSFUL', 'FAILED', 'PENDING']),
  reason: z.string().optional(),
});

// ===========================================
// Type Exports from Schemas
// ===========================================

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductFilter = z.infer<typeof productFilterSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderFilter = z.infer<typeof orderFilterSchema>;
export type CourierCreateInput = z.infer<typeof courierCreateSchema>;
export type CourierUpdateInput = z.infer<typeof courierUpdateSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AppSettingsUpdate = z.infer<typeof appSettingsUpdateSchema>;
