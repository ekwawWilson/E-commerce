import { z } from 'zod';

// Common field schemas
export const idSchema = z.string().min(1, 'ID is required');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  ...paginationSchema.shape,
});

export const phoneSchema = z
  .string()
  .min(9, 'Phone number must be at least 9 digits')
  .regex(/^[\d\s\-+()]+$/, 'Invalid phone number format');

export const emailSchema = z.string().email('Invalid email address');

export const priceSchema = z.coerce.number().positive('Price must be positive');

export const quantitySchema = z.coerce.number().int().positive('Quantity must be a positive integer');

export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

// Intentionally has NO default: when a client omits the currency the write
// path resolves it from admin store settings. Defaulting here would inject a
// value and silently bypass that lookup.
export const currencySchema = z.string().optional();

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ID params schema
export const idParamsSchema = z.object({
  id: idSchema,
});

// Cart ID params schema
export const cartIdParamsSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
});
