import { z } from 'zod';
import { paginationSchema, dateRangeSchema } from './common';
import { PaymentStatus, DeliveryStatus } from '@prisma/client';

// Order list query schema
export const orderListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(PaymentStatus).optional(),
  deliveryStatus: z.nativeEnum(DeliveryStatus).optional(),
  search: z.string().optional(),
  ...dateRangeSchema.shape,
});

// Order tracking schema
export const orderTrackingSchema = z.object({
  orderNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).refine(
  (data) => data.orderNumber || data.phone || data.email,
  {
    message: 'At least one of orderNumber, phone, or email is required',
  }
);

// Update order status schema
export const updateOrderStatusSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  deliveryStatus: z.nativeEnum(DeliveryStatus).optional(),
  notes: z.string().max(500).optional(),
});

// Mark order as shipped schema
export const markShippedSchema = z.object({
  courierId: z.string().optional(),
  trackingNumber: z.string().optional(),
  estimatedDeliveryDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

// Update delivery status schema (customer-facing delivery confirmation)
export const updateDeliveryStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  notes: z.string().max(500).optional(),
  signature: z.string().optional(), // Base64 signature for delivery confirmation
  deliveryProof: z.string().url().optional(), // Photo URL
});

// Admin: update delivery status, optionally assigning a courier
export const adminUpdateDeliveryStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  courierId: z.string().optional(),
  trackingNumber: z.string().optional(),
});

// Cancel order schema
export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});
