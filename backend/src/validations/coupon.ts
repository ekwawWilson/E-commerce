import { z } from 'zod';
import { DiscountType } from '@prisma/client';

const couponFields = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Code must be at least 3 characters')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, dashes and underscores only'),
  description: z.string().trim().max(200).nullable().optional(),
  type: z.nativeEnum(DiscountType),
  value: z.coerce.number().positive('Value must be positive'),
  minSubtotal: z.coerce.number().nonnegative().nullable().optional(),
  maxDiscount: z.coerce.number().positive().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  active: z.boolean().optional(),
});

const percentWithinRange = (data: { type?: DiscountType; value?: number }) =>
  data.type !== DiscountType.PERCENTAGE || data.value === undefined || data.value <= 100;

const datesInOrder = (data: { startsAt?: Date | null; endsAt?: Date | null }) =>
  !data.startsAt || !data.endsAt || data.startsAt < data.endsAt;

export const createCouponSchema = couponFields
  .refine(percentWithinRange, { message: 'A percentage discount must be 100 or less', path: ['value'] })
  .refine(datesInOrder, { message: 'End date must be after start date', path: ['endsAt'] });

export const updateCouponSchema = couponFields
  .partial()
  .refine(percentWithinRange, { message: 'A percentage discount must be 100 or less', path: ['value'] })
  .refine(datesInOrder, { message: 'End date must be after start date', path: ['endsAt'] });

export const previewCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50),
  cartId: z.string().min(1, 'Cart ID is required'),
});

export const checkoutQuoteSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional(),
  couponCode: z.string().trim().max(50).optional(),
});
