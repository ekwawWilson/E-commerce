import { Router } from 'express';
import * as uploadController from './upload.controller';
import { authenticate } from '../../middleware/auth';
import { uploadLimiter } from '../../middleware/rateLimit';
import config from '../../config';
import { imageUpload as upload } from './multer';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/admin/upload/image
 * @desc    Upload single image
 * @access  Admin
 */
router.post(
  '/image',
  uploadLimiter,
  upload.single('image'),
  uploadController.uploadImage
);

/**
 * @route   POST /api/admin/upload/images
 * @desc    Upload multiple images (max 6)
 * @access  Admin
 */
router.post(
  '/images',
  uploadLimiter,
  upload.array('images', config.maxImagesPerProduct),
  uploadController.uploadImages
);

/**
 * @route   DELETE /api/admin/upload/image
 * @desc    Delete image by public ID
 * @access  Admin
 */
router.delete('/image', uploadController.deleteImage);

/**
 * @route   DELETE /api/admin/upload/images
 * @desc    Delete multiple images
 * @access  Admin
 */
router.delete('/images', uploadController.deleteImages);

export default router;
