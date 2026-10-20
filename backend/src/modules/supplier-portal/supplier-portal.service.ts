import prisma from '../../config/database';
import {
  createProductCore,
  updateProductCore,
  ProductWriteData,
} from '../products/product-write.core';
import { Prisma, FulfillmentStatus } from '@prisma/client';
import { slugify, parsePaginationParams } from '../../utils/helpers';
import { NotFoundError } from '../../middleware/errorHandler';
import { updateItemFulfillment } from '../orders/fulfillment';

export interface SupplierProductListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}

export interface CreateSupplierProductData {
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
}

export class SupplierPortalService {
  /**
   * Get supplier dashboard stats
   */
  async getDashboardStats(supplierId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      preorderProducts,
      todayOrders,
      pendingOrders,
      preorderPendingOrders,
      monthlyRevenue,
      lastMonthRevenue,
      recentOrders,
      preorderProductsList,
    ] = await Promise.all([
      prisma.product.count({ where: { supplierId } }),
      prisma.product.count({ where: { supplierId, active: true } }),
      prisma.product.count({
        where: {
          supplierId,
          active: true,
          stock: { lte: prisma.product.fields.lowStockThreshold },
        },
      }),
      prisma.product.count({
        where: {
          supplierId,
          isPreorder: true,
          active: true,
        },
      }),
      prisma.orderItem.count({
        where: {
          supplierId,
          createdAt: { gte: today },
        },
      }),
      prisma.orderItem.count({
        where: {
          supplierId,
          fulfillmentStatus: 'PENDING',
        },
      }),
      prisma.orderItem.count({
        where: {
          supplierId,
          fulfillmentStatus: 'PENDING',
          product: { isPreorder: true },
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          supplierId,
          createdAt: { gte: thisMonth },
        },
        _sum: { totalPrice: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          supplierId,
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd,
          },
        },
        _sum: { totalPrice: true },
      }),
      prisma.orderItem.findMany({
        where: { supplierId },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              customerAddress: true,
            },
          },
          product: {
            select: { name: true, isPreorder: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Get pre-order products with pending order counts
      prisma.product.findMany({
        where: {
          supplierId,
          isPreorder: true,
          active: true,
        },
        select: {
          id: true,
          name: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              fulfillmentStatus: true,
            },
          },
        },
        take: 5,
      }),
    ]);

    const currentRevenue = monthlyRevenue._sum.totalPrice?.toNumber() || 0;
    const previousRevenue = lastMonthRevenue._sum.totalPrice?.toNumber() || 0;
    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    // Format recent orders to include isPreorder flag
    const formattedRecentOrders = recentOrders.map((order) => ({
      ...order,
      productName: order.product?.name || 'Unknown Product',
      isPreorder: order.product?.isPreorder || false,
    }));

    // Format preorder products with stats
    const formattedPreorderProducts = preorderProductsList.map((product) => {
      const pendingOrders = product.orderItems.filter(
        (item) => item.fulfillmentStatus === 'PENDING'
      ).length;
      const totalOrdered = product.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      return {
        id: product.id,
        name: product.name,
        pendingOrders,
        totalOrdered,
      };
    });

    return {
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        preorder: preorderProducts,
      },
      orders: {
        today: todayOrders,
        pending: pendingOrders,
        preorderPending: preorderPendingOrders,
      },
      revenue: {
        thisMonth: currentRevenue,
        lastMonth: previousRevenue,
        change: Math.round(revenueChange * 100) / 100,
      },
      recentOrders: formattedRecentOrders,
      preorderProducts: formattedPreorderProducts,
    };
  }

  /**
   * Get supplier's products
   */
  async getProducts(supplierId: string, params: SupplierProductListParams) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.ProductWhereInput = {
      supplierId,
    };

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: {
            include: { category: { select: { id: true, name: true } } },
          },
          images: { orderBy: { sortOrder: 'asc' } },
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
   * Get single product
   */
  async getProduct(supplierId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, supplierId },
      include: {
        categories: {
          include: { category: true },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        specifications: { orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] },
        deliveryZones: { orderBy: { zoneName: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  /**
   * Create a product for supplier
   */
  async createProduct(supplierId: string, data: CreateSupplierProductData) {
    // Supplier products start inactive pending platform approval, and the
    // supplierId always comes from the authenticated session — never the body.
    return createProductCore(data as ProductWriteData, {
      supplierId,
      active: false,
    });
  }

  /**
   * Update supplier's product
   */
  async updateProduct(supplierId: string, productId: string, data: Partial<CreateSupplierProductData>) {
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, supplierId },
      select: { slug: true, price: true, stock: true, sku: true },
    });

    if (!existingProduct) {
      throw new NotFoundError('Product');
    }

    return updateProductCore(productId, data as Partial<ProductWriteData>, existingProduct);
  }

  /**
   * Delete supplier's product
   */
  async deleteProduct(supplierId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, supplierId },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    await prisma.product.delete({ where: { id: productId } });

    return { success: true };
  }

  /**
   * Get supplier's orders (order items)
   */
  async getOrders(supplierId: string, params: {
    page?: number;
    limit?: number;
    status?: FulfillmentStatus;
    search?: string;
  }) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.OrderItemWhereInput = {
      supplierId,
    };

    if (params.status) {
      where.fulfillmentStatus = params.status;
    }

    if (params.search) {
      where.order = {
        OR: [
          { orderNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const [orderItems, total] = await Promise.all([
      prisma.orderItem.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              customerAddress: true,
              deliveryNotes: true,
              createdAt: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.orderItem.count({ where }),
    ]);

    return { orderItems, total, page, limit };
  }

  /**
   * Get single order item
   */
  async getOrderItem(supplierId: string, orderItemId: string) {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: orderItemId, supplierId },
      include: {
        order: true,
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundError('Order item');
    }

    return orderItem;
  }

  /**
   * Update fulfillment status
   */
  async updateFulfillmentStatus(
    supplierId: string,
    orderItemId: string,
    status: FulfillmentStatus,
    trackingNumber?: string
  ) {
    return updateItemFulfillment(supplierId, orderItemId, { status, trackingNumber });
  }

  /**
   * Get supplier's payouts
   */
  async getPayouts(supplierId: string, params: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.SupplierPayoutWhereInput = {
      supplierId,
    };

    const [payouts, total] = await Promise.all([
      prisma.supplierPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplierPayout.count({ where }),
    ]);

    return { payouts, total, page, limit };
  }

  /**
   * Update supplier profile
   */
  async updateProfile(supplierId: string, data: {
    businessName?: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    phone?: string;
    address?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    mobileMoneyProvider?: string;
    mobileMoneyNumber?: string;
  }) {
    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data,
    });

    return supplier;
  }

  /**
   * Get supplier profile
   */
  async getProfile(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        _count: {
          select: {
            products: true,
            admins: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    return supplier;
  }
}

export const supplierPortalService = new SupplierPortalService();
