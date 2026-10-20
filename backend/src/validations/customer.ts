import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { emailSchema, phoneSchema } from './common';

// Shared rule for every account type's new passwords
export const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: emailSchema.transform((e) => e.trim().toLowerCase()),
  phone: phoneSchema,
  password: newPasswordSchema,
});

export const customerLoginSchema = z
  .object({
    email: emailSchema.transform((e) => e.trim().toLowerCase()).optional(),
    phone: phoneSchema.optional(),
    password: z.string().min(1, 'Password is required').max(128),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Email or phone is required',
    path: ['email'],
  });

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

// Only these fields can be changed by the customer. Zod drops anything else,
// so fields like `active`, `passwordHash` or `emailVerified` can't be set.
export const updateCustomerProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: emailSchema.transform((e) => e.trim().toLowerCase()).optional(),
  phone: phoneSchema.optional(),
  profileImage: z.string().url().max(500).nullable().optional(),
  preferredPaymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
});

export const customerChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: newPasswordSchema,
});

const addressFields = {
  label: z.string().trim().max(50).optional(),
  name: z.string().trim().min(1, 'Recipient name is required').max(100),
  phone: phoneSchema,
  address: z.string().trim().min(1, 'Address is required').max(500),
  city: z.string().trim().min(1, 'City is required').max(100),
  region: z.string().trim().max(100).optional(),
  landmark: z.string().trim().max(200).optional(),
  isDefault: z.boolean().optional(),
};

export const customerAddressSchema = z.object(addressFields);
export const updateCustomerAddressSchema = z.object(addressFields).partial();

export const wishlistItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export const confirmEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const confirmPhoneSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

// ============================================
// SUPPLIER ACCOUNTS
// ============================================

export const supplierRegisterSchema = z.object({
  supplierName: z.string().trim().min(2, 'Store name is required').max(100),
  email: emailSchema.transform((e) => e.trim().toLowerCase()),
  phone: phoneSchema,
  whatsapp: phoneSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  businessName: z.string().trim().max(200).optional(),
  businessAddress: z.string().trim().min(1, 'Business address is required').max(500),
  city: z.string().trim().min(1, 'City is required').max(100),
  region: z.string().trim().min(1, 'Region is required').max(100),
  taxId: z.string().trim().max(50).optional(),
  ownerName: z.string().trim().min(1, 'Owner name is required').max(100),
  // Login email for the owner; defaults to the store's email
  ownerEmail: emailSchema.transform((e) => e.trim().toLowerCase()).optional(),
  ownerPassword: newPasswordSchema,
  ownerPhone: phoneSchema.optional(),
});

export const supplierLoginSchema = z.object({
  email: emailSchema.transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required').max(128),
});

export const supplierChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: newPasswordSchema,
});

export const supplierStaffSchema = z.object({
  email: emailSchema.transform((e) => e.trim().toLowerCase()),
  name: z.string().trim().min(1, 'Name is required').max(100),
  password: newPasswordSchema,
  phone: phoneSchema.optional(),
  role: z.enum(['MANAGER', 'STAFF']).default('STAFF'),
});

// ============================================
// PASSWORD RESET (all account types)
// ============================================

export const passwordResetRequestSchema = z.object({
  accountType: z.enum(['CUSTOMER', 'SUPPLIER', 'ADMIN']).default('CUSTOMER'),
  email: emailSchema.transform((e) => e.trim().toLowerCase()),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: newPasswordSchema,
});
