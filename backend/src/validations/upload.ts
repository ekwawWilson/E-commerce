import { z } from 'zod';

// Upload image schema
export const uploadImageSchema = z.object({
  folder: z.string().optional().default('products'),
  transformation: z
    .object({
      width: z.coerce.number().int().positive().optional(),
      height: z.coerce.number().int().positive().optional(),
      crop: z.string().optional(),
      quality: z.coerce.number().int().min(1).max(100).optional(),
    })
    .optional(),
});

// Delete image schema
export const deleteImageSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
});

// Bulk delete images schema
export const bulkDeleteImagesSchema = z.object({
  publicIds: z.array(z.string()).min(1, 'At least one public ID is required'),
});

// Upload validation
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const maxFileSize = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!allowedImageTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedImageTypes.join(', ')}`,
    };
  }

  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxFileSize / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}
