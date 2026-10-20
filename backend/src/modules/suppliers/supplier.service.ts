import prisma from '../../config/database';
import { Prisma, SupplierStatus, MobileMoneyProvider } from '@prisma/client';
import { slugify, parsePaginationParams } from '../../utils/helpers';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { orderService } from '../orders/order.service';

export interface SupplierListParams {
  page?: number;
  limit?: number;
  status?: SupplierStatus;
  verified?: boolean;
  search?: string;
}

export interface CreateSupplierData {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  description?: string;
  businessName?: string;
  businessAddress: string;
  city: string;
  region: string;
  taxId?: string;
  logo?: string;
  banner?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  momoNumber?: string;
  // Derived from the Prisma enum rather than a hand-written union, so adding or
  // renaming a provider in the schema surfaces here at compile time.
  momoProvider?: MobileMoneyProvider;
  commissionRate?: number;
}

export class SupplierService {
  /**
   * Get paginated list of suppliers (public - only ACTIVE)
   */
  async getSuppliers(params: SupplierListParams) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.SupplierWhereInput = {
      status: 'ACTIVE',
      verified: true,
    };

    // Search filter
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { businessName: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          banner: true,
          city: true,
          region: true,
          verified: true,
          _count: {
            select: { products: { where: { active: true } } },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { suppliers, total, page, limit };
  }

  /**
   * Get all suppliers (admin - includes all statuses)
   */
  async getAllSuppliers(params: SupplierListParams) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.SupplierWhereInput = {};

    // Status filter
    if (params.status) {
      where.status = params.status;
    }

    // Verified filter
    if (params.verified !== undefined) {
      where.verified = params.verified;
    }

    // Search filter
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { businessName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              orderItems: true,
              admins: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { suppliers, total, page, limit };
  }

  /**
   * Get supplier by ID or slug (public - only ACTIVE)
   */
  async getSupplierByIdOrSlug(idOrSlug: string) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        banner: true,
        city: true,
        region: true,
        verified: true,
        createdAt: true,
        _count: {
          select: { products: { where: { active: true } } },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    return supplier;
  }

  /**
   * Get supplier by ID (admin)
   */
  async getSupplierById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        admins: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            active: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            products: true,
            orderItems: true,
            payouts: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    return supplier;
  }

  /**
   * Create a new supplier
   */
  async createSupplier(data: CreateSupplierData) {
    const slug = slugify(data.name);

    // Check if slug or email exists
    const existing = await prisma.supplier.findFirst({
      where: {
        OR: [{ slug }, { email: data.email }],
      },
    });

    if (existing) {
      if (existing.email === data.email) {
        throw new AppError('A supplier with this email already exists', 409);
      }
      throw new AppError('A supplier with this name already exists', 409);
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        slug,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        description: data.description,
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        city: data.city,
        region: data.region,
        taxId: data.taxId,
        logo: data.logo,
        banner: data.banner,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        momoNumber: data.momoNumber,
        momoProvider: data.momoProvider,
        commissionRate: data.commissionRate ?? 10,
        status: 'PENDING',
      },
    });

    return supplier;
  }

  /**
   * Update supplier
   */
  async updateSupplier(id: string, data: Partial<CreateSupplierData>) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Supplier');
    }

    // Handle slug update if name changes
    let slug = existing.slug;
    if (data.name && data.name !== existing.name) {
      slug = slugify(data.name);
      const slugExists = await prisma.supplier.findFirst({
        where: { slug, NOT: { id } },
      });
      if (slugExists) {
        throw new AppError('A supplier with this name already exists', 409);
      }
    }

    // Check email uniqueness
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.supplier.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (emailExists) {
        throw new AppError('A supplier with this email already exists', 409);
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        slug,
      },
    });

    return supplier;
  }

  /**
   * Update supplier status (admin)
   */
  async updateSupplierStatus(id: string, status: SupplierStatus) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        status,
        verified: status === 'ACTIVE' ? true : supplier.verified,
        verifiedAt: status === 'ACTIVE' && !supplier.verifiedAt ? new Date() : supplier.verifiedAt,
      },
    });

    return updatedSupplier;
  }

  /**
   * Update supplier commission rate (admin)
   */
  async updateSupplierCommission(id: string, commissionRate: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    if (commissionRate < 0 || commissionRate > 100) {
      throw new AppError('Commission rate must be between 0 and 100', 400);
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: { commissionRate },
    });

    return updatedSupplier;
  }

  /**
   * Get supplier's products
   */
  async getSupplierProducts(supplierId: string, params: { page?: number; limit?: number; active?: boolean }) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.ProductWhereInput = {
      supplierId,
      active: params.active ?? true,
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
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
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  /**
   * Get supplier stats for dashboard
   */
  async getSupplierStats(supplierId: string) {
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      pendingPayouts,
    ] = await Promise.all([
      prisma.product.count({ where: { supplierId } }),
      prisma.product.count({ where: { supplierId, active: true } }),
      prisma.orderItem.count({ where: { supplierId } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'PENDING' } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'DELIVERED' } }),
      prisma.orderItem.aggregate({
        where: { supplierId, fulfillmentStatus: 'DELIVERED' },
        _sum: { totalPrice: true },
      }),
      prisma.supplierPayout.aggregate({
        where: { supplierId, status: 'PENDING' },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      pendingPayouts: pendingPayouts._sum.netAmount || 0,
    };
  }

  // ============================================
  // SUPPLIER USER MANAGEMENT (Admin)
  // ============================================

  /**
   * Get supplier users/admins
   */
  async getSupplierUsers(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { maxUsers: true },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    const users = await prisma.supplierAdmin.findMany({
      where: { supplierId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      users,
      maxUsers: supplier.maxUsers,
      currentCount: users.length,
    };
  }

  /**
   * Create supplier user (admin only)
   */
  async createSupplierUser(supplierId: string, data: {
    email: string;
    name: string;
    password: string;
    phone?: string;
    role: 'OWNER' | 'MANAGER' | 'STAFF';
  }) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        maxUsers: true,
        _count: { select: { admins: true } },
      },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    // Check max users limit
    if (supplier._count.admins >= supplier.maxUsers) {
      throw new AppError(`Maximum users limit (${supplier.maxUsers}) reached for this supplier`, 400);
    }

    // Check if email exists
    const existingUser = await prisma.supplierAdmin.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('A user with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.supplierAdmin.create({
      data: {
        supplierId,
        email: data.email,
        name: data.name,
        passwordHash,
        phone: data.phone,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Update supplier user
   */
  async updateSupplierUser(supplierId: string, userId: string, data: {
    name?: string;
    phone?: string;
    role?: 'OWNER' | 'MANAGER' | 'STAFF';
    active?: boolean;
    permissions?: Record<string, boolean> | null;
  }) {
    const user = await prisma.supplierAdmin.findFirst({
      where: { id: userId, supplierId },
    });

    if (!user) {
      throw new NotFoundError('Supplier user');
    }

    const updatedUser = await prisma.supplierAdmin.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        active: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Update supplier user permissions (admin only)
   */
  async updateSupplierUserPermissions(supplierId: string, userId: string, permissions: Record<string, boolean> | null) {
    const user = await prisma.supplierAdmin.findFirst({
      where: { id: userId, supplierId },
    });

    if (!user) {
      throw new NotFoundError('Supplier user');
    }

    // OWNERs always have full permissions, can't override
    if (user.role === 'OWNER') {
      throw new AppError('Cannot customize permissions for OWNER role', 400);
    }

    const updatedUser = await prisma.supplierAdmin.update({
      where: { id: userId },
      data: { permissions },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        active: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Delete supplier user
   */
  async deleteSupplierUser(supplierId: string, userId: string) {
    const user = await prisma.supplierAdmin.findFirst({
      where: { id: userId, supplierId },
    });

    if (!user) {
      throw new NotFoundError('Supplier user');
    }

    // Don't allow deleting the last OWNER
    if (user.role === 'OWNER') {
      const ownerCount = await prisma.supplierAdmin.count({
        where: { supplierId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new AppError('Cannot delete the last owner of the supplier', 400);
      }
    }

    await prisma.supplierAdmin.delete({
      where: { id: userId },
    });

    return { success: true };
  }

  /**
   * Update max users for supplier
   */
  async updateSupplierMaxUsers(supplierId: string, maxUsers: number) {
    if (maxUsers < 1 || maxUsers > 50) {
      throw new AppError('Max users must be between 1 and 50', 400);
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { _count: { select: { admins: true } } },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    if (maxUsers < supplier._count.admins) {
      throw new AppError(`Cannot set max users below current user count (${supplier._count.admins})`, 400);
    }

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: { maxUsers },
    });

    return updated;
  }

  /**
   * Update max products for supplier
   */
  async updateSupplierMaxProducts(supplierId: string, maxProducts: number) {
    if (maxProducts < 1 || maxProducts > 10000) {
      throw new AppError('Max products must be between 1 and 10000', 400);
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { _count: { select: { products: true } } },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    if (maxProducts < supplier._count.products) {
      throw new AppError(`Cannot set max products below current product count (${supplier._count.products})`, 400);
    }

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: { maxProducts },
    });

    return updated;
  }

  /**
   * Get supplier product limits info
   */
  async getSupplierProductLimits(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { maxProducts: true },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier');
    }

    const productCount = await prisma.product.count({
      where: { supplierId },
    });

    return {
      maxProducts: supplier.maxProducts,
      currentCount: productCount,
      canAddMore: productCount < supplier.maxProducts,
      remaining: supplier.maxProducts - productCount,
    };
  }

  // ============================================
  // SUPPLIER PRODUCT MANAGEMENT (Admin)
  // ============================================

  /**
   * Get all products for a supplier (admin)
   */
  async getSupplierProductsAdmin(supplierId: string, params: {
    page?: number;
    limit?: number;
    active?: boolean;
    search?: string;
  }) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.ProductWhereInput = { supplierId };

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
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  /**
   * Toggle product active status for a supplier
   */
  async toggleSupplierProductStatus(supplierId: string, productId: string, active: boolean) {
    const product = await prisma.product.findFirst({
      where: { id: productId, supplierId },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { active },
    });

    return updated;
  }

  /**
   * Bulk toggle products for a supplier
   */
  async bulkToggleSupplierProducts(supplierId: string, productIds: string[], active: boolean) {
    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        supplierId,
      },
      data: { active },
    });

    return { updated: result.count };
  }

  // ============================================
  // SUPPLIER ORDER MANAGEMENT (Admin)
  // ============================================

  /**
   * Get orders for a supplier (admin)
   */
  async getSupplierOrders(supplierId: string, params: {
    page?: number;
    limit?: number;
    fulfillmentStatus?: string;
    search?: string;
  }) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.OrderItemWhereInput = { supplierId };

    if (params.fulfillmentStatus) {
      where.fulfillmentStatus = params.fulfillmentStatus as any;
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
              customerCity: true,
              paymentStatus: true,
              deliveryStatus: true,
              createdAt: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
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
   * Get supplier order stats
   */
  async getSupplierOrderStats(supplierId: string) {
    const [pending, confirmed, processing, shipped, delivered, cancelled] = await Promise.all([
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'PENDING' } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'CONFIRMED' } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'PROCESSING' } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'SHIPPED' } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'DELIVERED' } }),
      prisma.orderItem.count({ where: { supplierId, fulfillmentStatus: 'CANCELLED' } }),
    ]);

    return { pending, confirmed, processing, shipped, delivered, cancelled };
  }

  /**
   * Update order item fulfillment status (admin)
   */
  async updateOrderItemFulfillment(supplierId: string, orderItemId: string, data: {
    fulfillmentStatus: string;
    trackingNumber?: string;
    notes?: string;
  }) {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: orderItemId, supplierId },
    });

    if (!orderItem) {
      throw new NotFoundError('Order item');
    }

    const updateData: any = {
      fulfillmentStatus: data.fulfillmentStatus,
    };

    if (data.trackingNumber) {
      updateData.trackingNumber = data.trackingNumber;
    }

    if (data.notes) {
      updateData.notes = data.notes;
    }

    // Set timestamps based on status
    if (data.fulfillmentStatus === 'CONFIRMED') {
      updateData.fulfilledAt = new Date();
    } else if (data.fulfillmentStatus === 'SHIPPED') {
      updateData.shippedAt = new Date();
    } else if (data.fulfillmentStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: updateData,
    });

    await orderService.reconcileDeliveryStatus(orderItem.orderId);

    return updated;
  }
}

export const supplierService = new SupplierService();
