import { z } from 'zod';
import { phoneSchema, emailSchema } from './common';
import { PaymentMethod } from '@prisma/client';

// Customer information schema
export const customerInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  region: z.string().optional(),
  deliveryNotes: z.string().max(500).optional(),
});

// Checkout schema
export const checkoutSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  customer: customerInfoSchema,
  paymentMethod: z.nativeEnum(PaymentMethod),
  momoPhoneNumber: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Validate checkout - ensure momoPhoneNumber is provided for MOMO payments
export const checkoutSchemaRefined = checkoutSchema.refine(
  (data) => {
    if (data.paymentMethod === 'MOMO' && !data.momoPhoneNumber) {
      return false;
    }
    return true;
  },
  {
    message: 'Mobile money phone number is required for MOMO payments',
    path: ['momoPhoneNumber'],
  }
);
