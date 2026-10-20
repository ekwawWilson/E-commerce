import { z } from 'zod';
import { phoneSchema, emailSchema } from './common';

export const createCourierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: phoneSchema,
  email: emailSchema.optional(),
});

export const updateCourierSchema = z.object({
  name: z.string().min(1).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  active: z.boolean().optional(),
});

export const courierListQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
});
