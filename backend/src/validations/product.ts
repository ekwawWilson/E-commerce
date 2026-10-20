import { z } from 'zod';
import { paginationSchema, priceSchema, currencySchema } from './common';

// Product specification schema
export const productSpecificationSchema = z.object({
  key: z.string().min(1, 'Specification key is required'),
  value: z.string().min(1, 'Specification value is required'),
  group: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

// Product image schema
export const productImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  publicId: z.string().min(1, 'Public ID is required'),
  alt: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});

// Product delivery zone schema
export const productDeliveryZoneSchema = z.object({
  zoneName: z.string().min(1, 'Zone name is required'),
  zoneType: z.string().default('city'),
  region: z.string().optional(),
  minDays: z.coerce.number().int().min(0),
  maxDays: z.coerce.number().int().min(0),
  deliveryFee: z.coerce.number().min(0).optional(),
  available: z.boolean().default(true),
  notes: z.string().optional(),
});

/**
 * The admin and supplier product forms historically sent camelCase field names
 * that did not match this schema (compareAtPrice, categoryId, isActive,
 * isFeatured). Because the schema was not strict, Zod silently stripped them
 * and every save quietly lost those values. Normalize the legacy names here,
 * then parse strictly so any future mismatch fails loudly instead.
 */
const normalizeProductPayload = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return value;

  const input = { ...(value as Record<string, unknown>) };

  const alias = (from: string, to: string) => {
    if (input[from] !== undefined && input[to] === undefined) {
      input[to] = input[from];
    }
    delete input[from];
  };

  alias('compareAtPrice', 'comparePrice');
  alias('isActive', 'active');
  alias('isFeatured', 'featured');

  // categoryId (single) -> categoryIds (array)
  if (input.categoryId !== undefined) {
    if (input.categoryIds === undefined && input.categoryId) {
      input.categoryIds = [input.categoryId];
    }
    delete input.categoryId;
  }

  return input;
};

// A sellable variant. `optionValues` declare which axes it sits on, e.g.
// [{ option: 'Storage', value: '256GB' }, { option: 'Colour', value: 'Black' }].
export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional(),
  price: priceSchema,
  comparePrice: priceSchema.optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isPreorder: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  optionValues: z
    .array(
      z.object({
        option: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
});

const productFields = {
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: priceSchema,
  currency: currencySchema,
  comparePrice: priceSchema.optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  supplierId: z.string().optional(),
  isPreorder: z.boolean().default(false),
  preorderNote: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  images: z.array(productImageSchema).max(6, 'Maximum 6 images allowed').optional(),
  specifications: z.array(productSpecificationSchema).optional(),
  deliveryZones: z.array(productDeliveryZoneSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
};

// Create product schema
export const createProductSchema = z.preprocess(
  normalizeProductPayload,
  z.object(productFields).strict()
);

// Update product schema
export const updateProductSchema = z.preprocess(
  normalizeProductPayload,
  z.object(productFields).strict().partial()
);

/**
 * Supplier-portal product schemas.
 *
 * Suppliers must not be able to set `supplierId` (that would let them assign a
 * product to another supplier) or `featured` (platform merchandising). The
 * portal derives supplierId from the authenticated session instead.
 */
const { supplierId: _supplierId, featured: _featured, ...supplierProductFields } = productFields;

export const createSupplierProductSchema = z.preprocess(
  normalizeProductPayload,
  z.object(supplierProductFields).strict()
);

export const updateSupplierProductSchema = z.preprocess(
  normalizeProductPayload,
  z.object(supplierProductFields).strict().partial()
);

// Columns a client is allowed to sort by. `sortBy` is interpolated directly
// into Prisma's `orderBy`, so it must never be free-form client input.
export const productSortBySchema = z
  .enum(['name', 'price', 'createdAt', 'updatedAt', 'stock', 'featured'])
  .default('createdAt');

// Product list query schema
export const productListQuerySchema = paginationSchema.extend({
  sortBy: productSortBySchema,
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// Admin product list query schema
export const adminProductListQuerySchema = productListQuerySchema.extend({
  includeInactive: z.coerce.boolean().optional().default(true),
});

// Bulk update stock schema
export const bulkUpdateStockSchema = z.object({
  updates: z.array(
    z.object({
      productId: z.string().min(1),
      stock: z.coerce.number().int().min(0),
    })
  ),
});

// Add specification schema
export const addSpecificationSchema = productSpecificationSchema;

// Update specification schema
export const updateSpecificationSchema = productSpecificationSchema.partial();
