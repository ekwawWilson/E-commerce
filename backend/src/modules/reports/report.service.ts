import prisma from '../../config/database';
import { ReportType, ReportStatus, PaymentStatus, DeliveryStatus } from '@prisma/client';
import { getDateRange } from '../../utils/helpers';
import { NotFoundError } from '../../middleware/errorHandler';
import { toCsv } from './report-csv';

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  recentOrders: Array<{ id: string; orderNumber: string; total: number; status: string; createdAt: Date }>;
  ordersByStatus: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
}

export class ReportService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<DashboardStats> {
    const { startDate, endDate } = getDateRange(period);

    // Get orders in date range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: true,
      },
    });

    // Calculate stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PENDING).length;
    const completedOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PAID).length;
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, o) => sum + Number(o.total), 0);
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // Orders by status
    const ordersByStatus: Record<string, number> = {
      [PaymentStatus.PENDING]: pendingOrders,
      [PaymentStatus.PAID]: completedOrders,
      [PaymentStatus.FAILED]: orders.filter((o) => o.paymentStatus === PaymentStatus.FAILED).length,
    };

    // Revenue by payment method
    const revenueByPaymentMethod: Record<string, number> = {};
    orders
      .filter((o) => o.paymentStatus === PaymentStatus.PAID)
      .forEach((o) => {
        const method = o.paymentMethod;
        revenueByPaymentMethod[method] = (revenueByPaymentMethod[method] || 0) + Number(o.total);
      });

    // Top products (from order snapshots)
    const productStats: Map<string, { name: string; quantity: number; revenue: number }> = new Map();
    orders.forEach((order) => {
      const items = order.itemsSnapshot as Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      items.forEach((item) => {
        const existing = productStats.get(item.productId) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        productStats.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({ productId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      averageOrderValue,
      topProducts,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total),
        status: o.paymentStatus,
      })),
      ordersByStatus,
      revenueByPaymentMethod,
    };
  }

  /**
   * Get sales report data
   */
  async getSalesReport(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const dailyReports = await prisma.dailySalesReport.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // If no pre-aggregated data, calculate from orders
    if (dailyReports.length === 0) {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          paymentStatus: PaymentStatus.PAID,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const grouped: Map<string, { revenue: number; orders: number; items: number }> = new Map();

      orders.forEach((order) => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        const existing = grouped.get(dateKey) || { revenue: 0, orders: 0, items: 0 };
        const items = order.itemsSnapshot as Array<{ quantity: number }>;
        const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

        existing.revenue += Number(order.total);
        existing.orders += 1;
        existing.items += itemCount;

        grouped.set(dateKey, existing);
      });

      return Array.from(grouped.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      }));
    }

    return dailyReports.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      revenue: Number(r.netSales),
      orders: r.totalOrders,
      items: r.itemsSold,
    }));
  }

  /**
   * Get inventory report
   */
  async getInventoryReport(options: {
    lowStock?: boolean;
    outOfStock?: boolean;
    categoryId?: string;
  } = {}) {
    const where: any = { active: true };

    if (options.lowStock) {
      where.stock = { lte: prisma.product.fields.lowStockThreshold };
    }

    if (options.outOfStock) {
      where.stock = 0;
    }

    if (options.categoryId) {
      where.categories = {
        some: { categoryId: options.categoryId },
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        categories: {
          include: {
            category: { select: { name: true } },
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { stock: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.stock <= p.lowStockThreshold,
      isOutOfStock: p.stock === 0,
      categories: p.categories.map((c) => c.category.name),
      price: Number(p.price),
      stockValue: Number(p.price) * p.stock,
    }));
  }

  /**
   * Get order report
   */
  async getOrderReport(startDate: Date, endDate: Date) {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: true,
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const summary = {
      total: orders.length,
      byPaymentStatus: {} as Record<string, number>,
      byDeliveryStatus: {} as Record<string, number>,
      byPaymentMethod: {} as Record<string, number>,
      totalRevenue: 0,
      averageOrderValue: 0,
    };

    orders.forEach((order) => {
      summary.byPaymentStatus[order.paymentStatus] =
        (summary.byPaymentStatus[order.paymentStatus] || 0) + 1;
      summary.byDeliveryStatus[order.deliveryStatus] =
        (summary.byDeliveryStatus[order.deliveryStatus] || 0) + 1;
      summary.byPaymentMethod[order.paymentMethod] =
        (summary.byPaymentMethod[order.paymentMethod] || 0) + 1;

      if (order.paymentStatus === PaymentStatus.PAID) {
        summary.totalRevenue += Number(order.total);
      }
    });

    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PAID).length;
    summary.averageOrderValue = paidOrders > 0 ? summary.totalRevenue / paidOrders : 0;

    return {
      summary,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customerName,
        phone: o.customerPhone,
        total: Number(o.total),
        paymentStatus: o.paymentStatus,
        deliveryStatus: o.deliveryStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Generate a report.
   *
   * Reports are CSV files built from the live data each time they're
   * downloaded, so there's no background job or file storage to fail. (They
   * used to be queued for a worker that didn't exist and stayed PENDING.)
   */
  async generateReport(
    type: ReportType,
    parameters: { startDate: Date; endDate: Date; format?: 'csv' },
    adminId: string
  ) {
    const report = await prisma.report.create({
      data: {
        name: `${type} Report - ${parameters.startDate.toISOString().slice(0, 10)} to ${parameters.endDate.toISOString().slice(0, 10)}`,
        type,
        status: ReportStatus.COMPLETED,
        parameters: {
          startDate: parameters.startDate.toISOString(),
          endDate: parameters.endDate.toISOString(),
          format: 'csv',
        },
        generatedBy: adminId,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return prisma.report.update({
      where: { id: report.id },
      data: { fileUrl: `/api/admin/reports/${report.id}/download` },
    });
  }

  /**
   * Build a report's CSV file
   */
  async buildReportCsv(id: string): Promise<{ filename: string; csv: string }> {
    const report = await this.getReportById(id);
    const params = (report.parameters ?? {}) as { startDate?: string; endDate?: string };
    const startDate = params.startDate ? new Date(params.startDate) : new Date(0);
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    // An end date without a time means "through the end of that day"
    if (endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0) {
      endDate.setUTCHours(23, 59, 59, 999);
    }

    const range = { gte: startDate, lte: endDate };
    let csv: string;

    switch (report.type) {
      case ReportType.SALES: {
        const rows = await this.getSalesReport(startDate, endDate);
        csv = toCsv(rows, [
          { header: 'Date', value: (r) => r.date },
          { header: 'Paid orders', value: (r) => r.orders },
          { header: 'Items sold', value: (r) => r.items },
          { header: 'Revenue', value: (r) => r.revenue.toFixed(2) },
        ]);
        break;
      }
      case ReportType.INVENTORY: {
        const rows = await this.getInventoryReport();
        csv = toCsv(rows, [
          { header: 'Product', value: (r) => r.name },
          { header: 'SKU', value: (r) => r.sku },
          { header: 'Categories', value: (r) => r.categories.join('; ') },
          { header: 'Stock', value: (r) => r.stock },
          { header: 'Low stock threshold', value: (r) => r.lowStockThreshold },
          { header: 'Price', value: (r) => r.price.toFixed(2) },
          { header: 'Stock value', value: (r) => r.stockValue.toFixed(2) },
        ]);
        break;
      }
      case ReportType.ORDERS: {
        const orders = await prisma.order.findMany({ where: { createdAt: range }, orderBy: { createdAt: 'asc' } });
        csv = toCsv(orders, [
          { header: 'Order', value: (o) => o.orderNumber },
          { header: 'Placed', value: (o) => o.createdAt },
          { header: 'Customer', value: (o) => o.customerName },
          { header: 'Phone', value: (o) => o.customerPhone },
          { header: 'City', value: (o) => o.customerCity },
          { header: 'Payment method', value: (o) => o.paymentMethod },
          { header: 'Payment status', value: (o) => o.paymentStatus },
          { header: 'Delivery status', value: (o) => (o.cancelledAt ? 'CANCELLED' : o.deliveryStatus) },
          { header: 'Subtotal', value: (o) => Number(o.subtotal).toFixed(2) },
          { header: 'Discount', value: (o) => Number(o.discount).toFixed(2) },
          { header: 'Delivery fee', value: (o) => Number(o.deliveryFee).toFixed(2) },
          { header: 'Total', value: (o) => Number(o.total).toFixed(2) },
          { header: 'Currency', value: (o) => o.currency },
        ]);
        break;
      }
      case ReportType.PAYMENTS: {
        const payments = await prisma.payment.findMany({
          where: { createdAt: range },
          include: { order: { select: { orderNumber: true } } },
          orderBy: { createdAt: 'asc' },
        });
        csv = toCsv(payments, [
          { header: 'Order', value: (p) => p.order.orderNumber },
          { header: 'Method', value: (p) => p.method },
          { header: 'Provider', value: (p) => p.provider },
          { header: 'Status', value: (p) => p.status },
          { header: 'Amount', value: (p) => Number(p.amount).toFixed(2) },
          { header: 'Currency', value: (p) => p.currency },
          { header: 'Transaction ID', value: (p) => p.transactionId },
          { header: 'Paid at', value: (p) => p.paidAt },
          { header: 'Refunded at', value: (p) => p.refundedAt },
          { header: 'Refund reference', value: (p) => p.refundReference },
        ]);
        break;
      }
      case ReportType.DELIVERIES: {
        const deliveries = await prisma.delivery.findMany({
          where: { createdAt: range },
          include: { order: { select: { orderNumber: true, customerCity: true } }, courier: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        });
        csv = toCsv(deliveries, [
          { header: 'Order', value: (d) => d.order.orderNumber },
          { header: 'City', value: (d) => d.order.customerCity },
          { header: 'Status', value: (d) => d.status },
          { header: 'Courier', value: (d) => d.courier?.name },
          { header: 'Tracking number', value: (d) => d.trackingNumber },
          { header: 'Picked up', value: (d) => d.pickedUpAt },
          { header: 'Delivered', value: (d) => d.deliveredAt },
        ]);
        break;
      }
      default:
        throw new NotFoundError('Report');
    }

    const slug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { filename: `${slug}.csv`, csv };
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        admin: {
          select: { name: true, email: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundError('Report');
    }

    return report;
  }

  /**
   * Get all reports
   */
  async getReports(params: {
    type?: ReportType;
    status?: ReportStatus;
    page?: number;
    limit?: number;
  } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          admin: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return { reports, total, page, limit };
  }

  /**
   * Update daily sales report (called by cron job)
   */
  async updateDailySalesReport(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate metrics
    const stats = {
      totalOrders: orders.length,
      completedOrders: orders.filter((o) => o.paymentStatus === PaymentStatus.PAID).length,
      cancelledOrders: 0, // No cancelled status in current schema
      pendingOrders: orders.filter((o) => o.paymentStatus === PaymentStatus.PENDING).length,
      grossSales: orders.reduce((sum, o) => sum + Number(o.subtotal), 0),
      totalDiscount: orders.reduce((sum, o) => sum + Number(o.discount), 0),
      totalDeliveryFees: orders.reduce((sum, o) => sum + Number(o.deliveryFee), 0),
      netSales: orders
        .filter((o) => o.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, o) => sum + Number(o.total), 0),
      momoPayments: orders.filter((o) => o.paymentMethod === 'MOMO' && o.paymentStatus === PaymentStatus.PAID).length,
      momoAmount: orders
        .filter((o) => o.paymentMethod === 'MOMO' && o.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, o) => sum + Number(o.total), 0),
      codPayments: orders.filter((o) => o.paymentMethod === 'COD' && o.paymentStatus === PaymentStatus.PAID).length,
      codAmount: orders
        .filter((o) => o.paymentMethod === 'COD' && o.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, o) => sum + Number(o.total), 0),
      itemsSold: orders.reduce((sum, o) => {
        const items = o.itemsSnapshot as Array<{ quantity: number }>;
        return sum + items.reduce((s, i) => s + i.quantity, 0);
      }, 0),
      uniqueProducts: new Set(
        orders.flatMap((o) => {
          const items = o.itemsSnapshot as Array<{ productId: string }>;
          return items.map((i) => i.productId);
        })
      ).size,
    };

    // Upsert daily report
    await prisma.dailySalesReport.upsert({
      where: { date: startOfDay },
      update: stats,
      create: {
        date: startOfDay,
        ...stats,
      },
    });

    return stats;
  }
  /**
   * Get comprehensive report summary for admin reports page
   */
  async getReportSummary(startDate: Date, endDate: Date) {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, isPreorder: true },
            },
            supplier: {
              select: { id: true, businessName: true },
            },
          },
        },
      },
    });

    // Get previous period for comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(startDate);

    const previousOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: previousEndDate,
        },
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // Calculate summary metrics
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PAID);
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const previousOrderCount = previousOrders.length;

    const revenueChange = previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100 * 100) / 100
      : 0;
    const ordersChange = previousOrderCount > 0
      ? Math.round(((totalOrders - previousOrderCount) / previousOrderCount) * 100 * 100) / 100
      : 0;

    // Count preorder orders
    const preorderOrders = orders.filter((o) =>
      o.items?.some((item) => item.product?.isPreorder)
    ).length;

    // Calculate average delivery days using Delivery table
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: { not: null },
        order: {
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      include: {
        order: { select: { createdAt: true } },
      },
    });

    let avgDeliveryDays = 0;
    if (deliveries.length > 0) {
      const totalDays = deliveries.reduce((sum, d) => {
        if (d.deliveredAt && d.order) {
          const days = Math.ceil(
            (d.deliveredAt.getTime() - d.order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }
        return sum;
      }, 0);
      avgDeliveryDays = totalDays / deliveries.length;
    }

    // Top products
    const productStats: Map<string, { name: string; quantity: number; revenue: number }> = new Map();
    orders.forEach((order) => {
      const items = order.itemsSnapshot as Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      items.forEach((item) => {
        const existing = productStats.get(item.productId) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        productStats.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({ id: productId, name: stats.name, totalSold: stats.quantity, revenue: stats.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Recent sales by date
    const salesByDate: Map<string, { revenue: number; orders: number }> = new Map();
    paidOrders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = salesByDate.get(dateKey) || { revenue: 0, orders: 0 };
      existing.revenue += Number(order.total);
      existing.orders += 1;
      salesByDate.set(dateKey, existing);
    });

    const recentSales = Array.from(salesByDate.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);

    // Orders by status
    const ordersByStatus = Object.values(DeliveryStatus).map((status) => ({
      status: status.toLowerCase(),
      count: orders.filter((o) => o.deliveryStatus === status).length,
    }));

    // Delivery performance by supplier
    const deliveredItems = await prisma.orderItem.findMany({
      where: {
        fulfillmentStatus: 'DELIVERED',
        deliveredAt: { not: null },
        shippedAt: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        supplier: {
          select: { id: true, businessName: true },
        },
      },
    });

    // Group by supplier for delivery performance
    const supplierDeliveryStats: Map<string | null, {
      supplier: { id: string; businessName: string } | null;
      delivered: number;
      totalDays: number;
      onTime: number;
      late: number;
    }> = new Map();

    deliveredItems.forEach((item) => {
      const supplierId = item.supplierId;
      const existing = supplierDeliveryStats.get(supplierId) || {
        supplier: item.supplier,
        delivered: 0,
        totalDays: 0,
        onTime: 0,
        late: 0,
      };

      existing.delivered += 1;

      if (item.deliveredAt && item.shippedAt) {
        const days = Math.ceil(
          (item.deliveredAt.getTime() - item.shippedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        existing.totalDays += days;
        // Consider > 5 days as late
        if (days <= 5) {
          existing.onTime += 1;
        } else {
          existing.late += 1;
        }
      }

      supplierDeliveryStats.set(supplierId, existing);
    });

    const deliveryPerformance = Array.from(supplierDeliveryStats.values()).map((stats) => ({
      supplier: stats.supplier,
      delivered: stats.delivered,
      avgDays: stats.delivered > 0 ? stats.totalDays / stats.delivered : 0,
      onTime: stats.onTime,
      late: stats.late,
    }));

    // Preorder products
    const preorderProducts = await prisma.product.findMany({
      where: {
        isPreorder: true,
        active: true,
      },
      select: {
        id: true,
        name: true,
        orderItems: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            quantity: true,
            fulfillmentStatus: true,
          },
        },
      },
      take: 20,
    });

    const formattedPreorderProducts = preorderProducts
      .map((product) => ({
        id: product.id,
        name: product.name,
        pendingOrders: product.orderItems.filter((i) => i.fulfillmentStatus === 'PENDING').length,
        totalOrdered: product.orderItems.reduce((sum, i) => sum + i.quantity, 0),
      }))
      .filter((p) => p.totalOrdered > 0)
      .sort((a, b) => b.totalOrdered - a.totalOrdered);

    // Count total unique products sold
    const totalProducts = productStats.size;

    return {
      summary: {
        totalRevenue,
        totalOrders,
        totalProducts,
        averageOrderValue,
        revenueChange,
        ordersChange,
        preorderOrders,
        avgDeliveryDays,
      },
      topProducts,
      recentSales,
      ordersByStatus,
      deliveryPerformance,
      preorderProducts: formattedPreorderProducts,
    };
  }
}

export const reportService = new ReportService();
