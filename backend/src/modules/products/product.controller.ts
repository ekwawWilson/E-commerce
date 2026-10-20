import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { successResponse, paginatedResponse, notFoundResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Get paginated list of products (public)
 */
export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { products, total, page, limit } = await productService.getProducts(req.query);
    return paginatedResponse(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get single product by ID or slug (public)
 */
export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductByIdOrSlug(req.params.id);
    return successResponse(res, product);
  } catch (error) {
    next(error);
  }
}

/**
 * Get featured products (public)
 */
export async function getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const products = await productService.getFeaturedProducts(limit);
    return successResponse(res, products);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new product (admin)
 */
export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a product (admin)
 */
export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a product (admin)
 */
export async function deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await productService.deleteProduct(req.params.id);
    return successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update product stock (admin)
 */
export async function updateProductStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { stock, reason } = req.body;
    const product = await productService.updateStock(req.params.id, stock, reason);
    return successResponse(res, product, 'Stock updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk update stock (admin)
 */
export async function bulkUpdateStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { updates } = req.body;
    const results = await productService.bulkUpdateStock(updates);
    return successResponse(res, results, 'Stock updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get low stock products (admin)
 */
export async function getLowStockProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const products = await productService.getLowStockProducts();
    return successResponse(res, products);
  } catch (error) {
    next(error);
  }
}

/**
 * Get inventory logs (admin)
 */
export async function getInventoryLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, productId, reason } = req.query;
    const result = await productService.getInventoryLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      productId: productId as string,
      reason: reason as string,
    });
    return paginatedResponse(res, result.logs, result.page, result.limit, result.total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get product by ID (admin - includes inactive)
 */
export async function getProductAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, product);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all products (admin - includes inactive)
 */
export async function getProductsAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const params = { ...req.query, includeInactive: true };
    const { products, total, page, limit } = await productService.getProducts(params);
    return paginatedResponse(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
}
