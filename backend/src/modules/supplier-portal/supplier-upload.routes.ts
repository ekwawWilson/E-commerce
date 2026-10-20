import { Router, Response, NextFunction } from 'express';
import config from '../../config';
import { uploadLimiter } from '../../middleware/rateLimit';
import { successResponse, errorResponse } from '../../utils/response';
import { validateImageFile } from '../../validations';
import { imageUpload } from '../upload/multer';
import { uploadService, publicIdPath } from '../upload/upload.service';
import { requireSupplierRole, SupplierAuthenticatedRequest } from '../supplier-auth/supplier-auth.middleware';

// Mounted under /api/supplier-portal/upload, after supplier authentication.
// Suppliers always upload into their own folder and may only delete from it,
// so one supplier can't overwrite or remove another's product images.
const router = Router();

const supplierFolder = (req: SupplierAuthenticatedRequest) => `suppliers/${(req as any).supplier.id}`;

router.post(
  '/images',
  requireSupplierRole('OWNER', 'MANAGER'),
  uploadLimiter,
  imageUpload.array('images', config.maxImagesPerProduct),
  async (req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return errorResponse(res, 'No files uploaded', 400);
      }

      for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          return errorResponse(res, `${file.originalname}: ${validation.error}`, 400);
        }
      }

      const results = await uploadService.uploadImages(files, { folder: supplierFolder(req) });
      return successResponse(res, results, 'Images uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/image',
  requireSupplierRole('OWNER', 'MANAGER'),
  async (req: SupplierAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { publicId } = req.body;

      if (!publicId || typeof publicId !== 'string') {
        return errorResponse(res, 'Public ID is required', 400);
      }

      if (!publicIdPath(publicId).startsWith(`${supplierFolder(req)}/`)) {
        return errorResponse(res, 'You can only delete your own images', 403);
      }

      const success = await uploadService.deleteImage(publicId);
      return success
        ? successResponse(res, null, 'Image deleted successfully')
        : errorResponse(res, 'Failed to delete image', 500);
    } catch (error) {
      next(error);
    }
  }
);

export const supplierUploadRoutes = router;
