import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { uploadService } from '../upload/upload.service';
import { validateImageFile } from '../../validations';

/**
 * Get all categories (public)
 */
export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { parentId, active } = req.query;
    const categories = await categoryService.getCategories({
      parentId: parentId as string,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
}

/**
 * Get category tree (public)
 */
export async function getCategoryTree(req: Request, res: Response, next: NextFunction) {
  try {
    const tree = await categoryService.getCategoryTree(true);
    return successResponse(res, tree);
  } catch (error) {
    next(error);
  }
}

/**
 * Get category by ID or slug (public)
 */
export async function getCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.getCategoryByIdOrSlug(req.params.id);
    return successResponse(res, category);
  } catch (error) {
    next(error);
  }
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Get all categories (admin - includes inactive)
 */
export async function getCategoriesAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.getCategories();
    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
}

/**
 * Create category (admin)
 */
export async function createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.createCategory(req.body);
    return successResponse(res, category, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update category (admin)
 */
export async function updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return successResponse(res, category, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete category (admin)
 */
export async function deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await categoryService.deleteCategory(req.params.id);
    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Upload category image (admin)
 */
export async function uploadCategoryImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    // Validate file
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      return errorResponse(res, validation.error || 'Invalid file', 400);
    }

    // Upload to Supabase Storage in 'categories' folder
    const result = await uploadService.uploadImage(req.file, {
      folder: 'categories',
    });

    // Update category with new image URL
    const category = await categoryService.updateCategory(req.params.id, {
      image: result.url,
    });

    return successResponse(res, { category, image: result }, 'Category image uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete category image (admin)
 */
export async function deleteCategoryImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.getCategoryByIdOrSlug(req.params.id);

    if (category.image) {
      // Extract publicId from the URL if it's a Supabase URL
      const url = category.image;
      if (url.includes('supabase.co')) {
        const pathMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
        if (pathMatch) {
          await uploadService.deleteImage(`supabase:${pathMatch[1]}`);
        }
      }
    }

    // Update category to remove image
    const updatedCategory = await categoryService.updateCategory(req.params.id, {
      image: undefined,
    });

    return successResponse(res, updatedCategory, 'Category image deleted successfully');
  } catch (error) {
    next(error);
  }
}
