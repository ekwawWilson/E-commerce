import { Response, NextFunction } from 'express';
import { uploadService } from './upload.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { validateImageFile } from '../../validations';

/**
 * Upload single image
 */
export async function uploadImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    // Validate file
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      return errorResponse(res, validation.error || 'Invalid file', 400);
    }

    const { folder, transformation } = req.body;

    const result = await uploadService.uploadImage(req.file, {
      folder,
      transformation: transformation ? JSON.parse(transformation) : undefined,
    });

    return successResponse(res, result, 'Image uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Upload multiple images
 */
export async function uploadImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return errorResponse(res, 'No files uploaded', 400);
    }

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        return errorResponse(res, `${file.originalname}: ${validation.error}`, 400);
      }
    }

    const { folder, transformation } = req.body;

    const results = await uploadService.uploadImages(files, {
      folder,
      transformation: transformation ? JSON.parse(transformation) : undefined,
    });

    return successResponse(res, results, 'Images uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete image
 */
export async function deleteImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return errorResponse(res, 'Public ID is required', 400);
    }

    const success = await uploadService.deleteImage(publicId);

    if (success) {
      return successResponse(res, null, 'Image deleted successfully');
    } else {
      return errorResponse(res, 'Failed to delete image', 500);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Delete multiple images
 */
export async function deleteImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return errorResponse(res, 'Public IDs array is required', 400);
    }

    const results = await uploadService.deleteImages(publicIds);

    return successResponse(res, results, 'Images deletion completed');
  } catch (error) {
    next(error);
  }
}
