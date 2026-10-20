import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import * as uploadController from './upload.controller';
import { authenticate } from '../../middleware/auth';
import { uploadLimiter } from '../../middleware/rateLimit';
import config from '../../config';

const router = Router();

// File filter for JPEG/JPG and PNG images only
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];

  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'));
  }
};

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
    files: config.maxImagesPerProduct,
  },
  fileFilter: imageFileFilter,
});

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
