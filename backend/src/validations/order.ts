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

// Order tracking schema. Both the order number and the phone/email it was
// placed with are required, so order details can't be looked up by guessing.
export const orderTrackingSchema = z.object({
  orderNumber: z.string().trim().min(1, 'Order number is required'),
  phone: z.string().trim().min(9).optional(),
  email: z.string().trim().email().optional(),
}).refine(
  (data) => data.phone || data.email,
  {
    message: 'Enter the phone number or email used for the order',
    path: ['phone'],
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
  reason: z.string().trim().min(1, 'Cancellation reason is required').max(500),
});

// Record a refund for a cancelled, paid order (admin)
export const recordRefundSchema = z.object({
  reason: z.string().trim().min(1, 'Refund reason is required').max(500),
  reference: z.string().trim().max(200).optional(),
});
