import prisma from '../../config/database';
import {
  createProductCore,
  updateProductCore,
  recalcProductRollup,
  ProductWriteData,
} from './product-write.core';
import { Prisma } from '@prisma/client';
import { slugify, parsePaginationParams } from '../../utils/helpers';
import { NotFoundError } from '../../middleware/errorHandler';

export interface ProductListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  /** Only products whose comparePrice is above their current price. */
  onSale?: boolean;
  active?: boolean;
  search?: string;
  includeInactive?: boolean;
}

export interface DeliveryZoneData {
  zoneName: string;
  zoneType?: string; // 'city', 'region', 'country', 'international'
  region?: string;
  minDays: number;
  maxDays: number;
  deliveryFee?: number;
  available?: boolean;
  notes?: string;
}

export interface CreateProductData {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  comparePrice?: number;
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  categoryIds?: string[];
  supplierId?: string | null;
  // Pre-order settings
  isPreorder?: boolean;
  preorderNote?: string;
  // Delivery zones
  deliveryZones?: DeliveryZoneData[];
  images?: Array<{
    url: string;
    publicId: string;
    alt?: string;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  specifications?: Array<{
    key: string;
    value: string;
    group?: string;
    sortOrder?: number;
  }>;
  active?: boolean;
  featured?: boolean;
}

export class ProductService {
  /**
   * Get paginated list of products (public)
   */
  async getProducts(params: ProductListParams) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.ProductWhereInput = {
      active: params.includeInactive ? undefined : true,
    };

    // Category filter
    if (params.category) {
      where.categories = {
        some: {
          category: {
            OR: [
              { id: params.category },
              { slug: params.category },
            ],
          },
        },
      };
    }

    // Price range filter
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) {
        where.price.gte = params.minPrice;
      }
      if (params.maxPrice !== undefined) {
        where.price.lte = params.maxPrice;
      }
    }

    // Stock filter
    if (params.inStock !== undefined) {
      where.stock = params.inStock ? { gt: 0 } : { equals: 0 };
    }

    // Featured filter
    if (params.featured !== undefined) {
      where.featured = params.featured;
    }

    // On-sale filter: comparePrice must exist AND exceed the current price.
    // Prisma has no column-to-column comparison in `where`, so the second half
    // uses a raw SQL fragment against the underlying columns.
    if (params.onSale) {
      where.comparePrice = { not: null };
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          id: {
            in: await prisma.$queryRaw<Array<{ id: string }>>(
              Prisma.sql`SELECT id FROM products WHERE "comparePrice" IS NOT NULL AND "comparePrice" > price`
            ).then((rows) => rows.map((r) => r.id)),
          },
        },
      ];
    }

    // Active filter (for admin)
    if (params.active !== undefined) {
      where.active = params.active;
    }

    // Search filter
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Deliberately slimmer than the detail query. Listing rows previously
    // eager-loaded every specification and delivery zone for every product,
    // which made a 60-item page several seconds slow. Cards only need the
    // primary image and a handful of specs for the spec chips; full specs and
    // delivery zones are fetched on the product detail page instead.
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: {
            include: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            orderBy: { sortOrder: 'asc' },
          },
          specifications: {
            orderBy: { sortOrder: 'asc' },
            take: 6,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  /**
   * Get single product by ID or slug
   */
  async getProductByIdOrSlug(idOrSlug: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        active: true,
      },
      include: {
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        specifications: {
          orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
        },
        deliveryZones: {
          where: { available: true },
          orderBy: { zoneName: 'asc' },
        },
        // The storefront needs the full variant matrix to render the option
        // selector and price the chosen combination.
        options: {
          orderBy: { sortOrder: 'asc' },
          include: { values: { orderBy: { sortOrder: 'asc' } } },
        },
        variants: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              include: {
                optionValue: { include: { option: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  /**
   * Get product by ID (admin - includes inactive)
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        specifications: {
          orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
        },
        deliveryZones: {
          orderBy: { zoneName: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductData) {
    return createProductCore(data as ProductWriteData);
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, data: Partial<CreateProductData>) {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { slug: true, price: true, stock: true, sku: true },
    });

    if (!existingProduct) {
      throw new NotFoundError('Product');
    }

    return updateProductCore(id, data as Partial<ProductWriteData>, existingProduct);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    await prisma.product.delete({ where: { id } });

    return { success: true };
  }

  /**
   * Update product stock
   */
  async updateStock(id: string, stock: number, reason = 'MANUAL', referenceId?: string) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const previousStock = product.stock;

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { stock },
      }),
      prisma.inventoryLog.create({
        data: {
          productId: id,
          productName: product.name,
          previousStock,
          newStock: stock,
          change: stock - previousStock,
          reason,
          referenceId,
          referenceType: reason === 'SALE' ? 'ORDER' : 'MANUAL',
        },
      }),
    ]);

    return updatedProduct;
  }

  /**
   * Bulk update stock
   *
   * Writes an InventoryLog entry per product, matching updateStock — without
   * it, bulk adjustments leave no audit trail and stock history silently
   * disagrees with reality.
   */
  async bulkUpdateStock(updates: Array<{ productId: string; stock: number }>) {
    if (updates.length === 0) {
      return [];
    }

    return prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: updates.map((u) => u.productId) } },
        select: { id: true, name: true, stock: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      const missing = updates.filter((u) => !productMap.has(u.productId));
      if (missing.length > 0) {
        throw new NotFoundError(
          `Product(s): ${missing.map((m) => m.productId).join(', ')}`
        );
      }

      const results = [];

      for (const update of updates) {
        const product = productMap.get(update.productId)!;

        const updated = await tx.product.update({
          where: { id: update.productId },
          data: { stock: update.stock },
        });

        await tx.inventoryLog.create({
          data: {
            productId: update.productId,
            productName: product.name,
            previousStock: product.stock,
            newStock: update.stock,
            change: update.stock - product.stock,
            reason: 'ADJUSTMENT',
            referenceType: 'MANUAL',
          },
        });

        results.push(updated);
      }

      return results;
    });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 8) {
    return prisma.product.findMany({
      where: { active: true, featured: true },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts() {
    return prisma.product.findMany({
      where: {
        active: true,
        stock: { lte: prisma.product.fields.lowStockThreshold },
      },
      orderBy: { stock: 'asc' },
    });
  }

  /**
   * Get inventory logs
   */
  async getInventoryLogs(params: {
    page?: number;
    limit?: number;
    productId?: string;
    reason?: string;
  }) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.InventoryLogWhereInput = {};

    if (params.productId) {
      where.productId = params.productId;
    }

    if (params.reason) {
      where.reason = params.reason;
    }

    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }
}

export const productService = new ProductService();
