import { z } from 'zod';
import { paginationSchema } from './common';

// Create category schema
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().optional(),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

// Update category schema
export const updateCategorySchema = createCategorySchema.partial();

// Category list query schema
export const categoryListQuerySchema = paginationSchema.extend({
  parentId: z.string().optional(),
  active: z.coerce.boolean().optional(),
  includeProducts: z.coerce.boolean().optional().default(false),
});
