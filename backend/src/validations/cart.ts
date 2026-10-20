import { z } from 'zod';
import { quantitySchema } from './common';

// Add item to cart schema
export const addCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  // Optional: omitting it selects the product's default variant, which keeps
  // simple products and older clients working unchanged.
  variantId: z.string().min(1).optional(),
  quantity: quantitySchema.default(1),
});

// Update cart item schema
export const updateCartItemSchema = z.object({
  quantity: quantitySchema,
});

// Cart item ID params
export const cartItemParamsSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
});

// Bulk add items to cart
export const bulkAddCartItemsSchema = z.object({
  items: z.array(addCartItemSchema).min(1, 'At least one item is required'),
});

// Clear cart schema (empty body is valid)
export const clearCartSchema = z.object({}).optional();
