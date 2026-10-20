import { Router } from 'express';
import * as productController from './product.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { apiLimiter } from '../../middleware/rateLimit';
import {
  productListQuerySchema,
  createProductSchema,
  updateProductSchema,
  bulkUpdateStockSchema,
  idParamsSchema,
} from '../../validations';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   GET /api/products
 * @desc    Get paginated list of products
 * @access  Public
 */
router.get(
  '/',
  apiLimiter,
  validate(productListQuerySchema, 'query'),
  productController.getProducts
);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', apiLimiter, productController.getFeaturedProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID or slug
 * @access  Public
 */
router.get(
  '/:id',
  apiLimiter,
  validate(idParamsSchema, 'params'),
  productController.getProduct
);

export default router;

// ============================================
// ADMIN ROUTES (used by /api/admin/products)
// ============================================
export const adminProductRoutes = Router();

/**
 * @route   GET /api/admin/products
 * @desc    Get all products (including inactive)
 * @access  Admin
 */
adminProductRoutes.get('/', productController.getProductsAdmin);

// NOTE: literal paths must be registered before the `/:id` wildcard below,
// otherwise `/:id` matches them first and they become unreachable.

/**
 * @route   GET /api/admin/products/low-stock
 * @desc    Get low stock products
 * @access  Admin
 */
adminProductRoutes.get('/low-stock', productController.getLowStockProducts);

/**
 * @route   GET /api/admin/products/inventory-logs
 * @desc    Get inventory logs
 * @access  Admin
 */
adminProductRoutes.get('/inventory-logs', productController.getInventoryLogs);

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get single product by ID (including inactive)
 * @access  Admin
 */
adminProductRoutes.get('/:id', productController.getProductAdmin);

/**
 * @route   POST /api/admin/products
 * @desc    Create a new product
 * @access  Admin
 */
adminProductRoutes.post(
  '/',
  validate(createProductSchema),
  productController.createProduct
);

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update a product
 * @access  Admin
 */
adminProductRoutes.put(
  '/:id',
  validate(updateProductSchema),
  productController.updateProduct
);

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete a product
 * @access  Admin
 */
adminProductRoutes.delete('/:id', productController.deleteProduct);

/**
 * @route   PATCH /api/admin/products/:id/stock
 * @desc    Update product stock
 * @access  Admin
 */
adminProductRoutes.patch('/:id/stock', productController.updateProductStock);

/**
 * @route   POST /api/admin/products/bulk-stock
 * @desc    Bulk update stock
 * @access  Admin
 */
adminProductRoutes.post(
  '/bulk-stock',
  validate(bulkUpdateStockSchema),
  productController.bulkUpdateStock
);

