import { z } from 'zod';
import { phoneSchema } from './common';
import { MobileMoneyProvider } from '@prisma/client';

// Initiate payment schema
export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  provider: z.nativeEnum(MobileMoneyProvider).optional().default('MTN_MOMO'),
  phoneNumber: phoneSchema,
});

// Payment webhook schema (MTN MoMo)
export const momoWebhookSchema = z.object({
  financialTransactionId: z.string().optional(),
  externalId: z.string(), // Our transaction ID
  amount: z.coerce.number(),
  currency: z.string(),
  payer: z.object({
    partyIdType: z.string(),
    partyId: z.string(),
  }).optional(),
  status: z.enum(['SUCCESSFUL', 'FAILED', 'PENDING']),
  reason: z.string().optional(),
});

// Generic payment webhook schema
export const paymentWebhookSchema = z.object({
  transactionId: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  amount: z.coerce.number(),
  currency: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Verify payment schema
export const verifyPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});

// Refund payment schema
export const refundPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.coerce.number().positive().optional(), // Optional partial refund
  reason: z.string().min(1, 'Refund reason is required').max(500),
});
