import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import * as categoryController from './category.controller';
import { validate } from '../../middleware/validate';
import { apiLimiter, uploadLimiter } from '../../middleware/rateLimit';
import { idParamsSchema, categoryListQuerySchema } from '../../validations';
import config from '../../config';

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
    files: 1,
  },
  fileFilter: imageFileFilter,
});

const router = Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get(
  '/',
  apiLimiter,
  validate(categoryListQuerySchema, 'query'),
  categoryController.getCategories
);

/**
 * @route   GET /api/categories/tree
 * @desc    Get category tree (hierarchical)
 * @access  Public
 */
router.get('/tree', apiLimiter, categoryController.getCategoryTree);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID or slug
 * @access  Public
 */
router.get(
  '/:id',
  apiLimiter,
  validate(idParamsSchema, 'params'),
  categoryController.getCategory
);

export default router;

// ============================================
// ADMIN ROUTES (used by /api/admin/categories)
// ============================================
export const adminCategoryRoutes = Router();

/**
 * @route   GET /api/admin/categories
 * @desc    Get all categories (including inactive)
 * @access  Admin
 */
adminCategoryRoutes.get('/', categoryController.getCategoriesAdmin);

/**
 * @route   POST /api/admin/categories
 * @desc    Create a new category
 * @access  Admin
 */
adminCategoryRoutes.post('/', categoryController.createCategory);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update a category
 * @access  Admin
 */
adminCategoryRoutes.put('/:id', categoryController.updateCategory);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete a category
 * @access  Admin
 */
adminCategoryRoutes.delete('/:id', categoryController.deleteCategory);

/**
 * @route   POST /api/admin/categories/:id/image
 * @desc    Upload category image
 * @access  Admin
 */
adminCategoryRoutes.post(
  '/:id/image',
  uploadLimiter,
  upload.single('image'),
  categoryController.uploadCategoryImage
);

/**
 * @route   DELETE /api/admin/categories/:id/image
 * @desc    Delete category image
 * @access  Admin
 */
adminCategoryRoutes.delete('/:id/image', categoryController.deleteCategoryImage);
