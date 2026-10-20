import prisma from '../../config/database';
import { Prisma, PayoutStatus, PaymentStatus } from '@prisma/client';
import { parsePaginationParams } from '../../utils/helpers';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import { settingsService } from '../settings/settings.service';

export const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  [PayoutStatus.PENDING]: [PayoutStatus.PROCESSING, PayoutStatus.COMPLETED, PayoutStatus.FAILED],
  [PayoutStatus.PROCESSING]: [PayoutStatus.COMPLETED, PayoutStatus.FAILED],
  [PayoutStatus.COMPLETED]: [],
  [PayoutStatus.FAILED]: [],
};

export interface PayoutListParams {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: PayoutStatus;
  startDate?: Date;
  endDate?: Date;
}

export class PayoutService {
  /**
   * Get all payouts (admin)
   */
  async getPayouts(params: PayoutListParams) {
    const { page, limit, skip } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.SupplierPayoutWhereInput = {};

    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.startDate || params.endDate) {
      where.periodStart = {};
      if (params.startDate) {
        where.periodStart.gte = params.startDate;
      }
      if (params.endDate) {
        where.periodEnd = { lte: params.endDate };
      }
    }

    const [payouts, total] = await Promise.all([
      prisma.supplierPayout.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplierPayout.count({ where }),
    ]);

    return { payouts, total, page, limit };
  }

  /**
   * Get single payout
   */
  async getPayout(payoutId: string) {
    const payout = await prisma.supplierPayout.findUnique({
      where: { id: payoutId },
      include: {
        supplier: {
          select: {
            id: true,
            businessName: true,
            email: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundError('Payout');
    }

    return payout;
  }

  /**
   * Generate payouts for a period.
   *
   * Pays each supplier for its items delivered in the period whose order was
   * paid and not cancelled. Every item can belong to only one payout (via
   * OrderItem.payoutId), so overlapping periods or a second run never pay an
   * item twice.
   */
  async generatePayouts(periodStart: Date, periodEnd: Date) {
    if (!(periodStart < periodEnd)) {
      throw new AppError('The period start must be before its end', 400);
    }

    // Get all active suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        businessName: true,
        commissionRate: true,
      },
    });

    // Payouts are denominated in the store's configured currency, not a
    // hardcoded one — otherwise supplier statements disagree with their orders.
    const payoutCurrency = await settingsService.getDefaultCurrency();

    const payouts = [];

    for (const supplier of suppliers) {
      // Calculate earnings for this period
      const orderItems = await prisma.orderItem.findMany({
        where: {
          supplierId: supplier.id,
          fulfillmentStatus: 'DELIVERED',
          payoutId: null,
          deliveredAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          order: {
            paymentStatus: PaymentStatus.PAID,
            cancelledAt: null,
          },
        },
        select: {
          id: true,
          totalPrice: true,
          commissionAmount: true,
        },
      });

      if (orderItems.length === 0) continue;

      const grossAmount = orderItems.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);
      const commissionAmount = orderItems.reduce((sum, item) => sum + item.commissionAmount.toNumber(), 0);
      const netAmount = grossAmount - commissionAmount;
      const itemIds = orderItems.map((item) => item.id);

      const payout = await prisma.$transaction(async (tx) => {
        const created = await tx.supplierPayout.create({
          data: {
            supplierId: supplier.id,
            periodStart,
            periodEnd,
            grossAmount,
            commissionAmount,
            netAmount,
            currency: payoutCurrency,
            status: 'PENDING',
            orderItemIds: itemIds,
            itemCount: orderItems.length,
          },
        });

        // Claim the items. If a concurrent run claimed any first, the counts
        // differ and this payout is rolled back instead of double-paying.
        const { count } = await tx.orderItem.updateMany({
          where: { id: { in: itemIds }, payoutId: null },
          data: { payoutId: created.id },
        });

        if (count !== itemIds.length) {
          throw new AppError('Payouts are already being generated. Please try again shortly.', 409);
        }

        return created;
      });

      payouts.push(payout);
    }

    return payouts;
  }

  /**
   * Update payout status. COMPLETED and FAILED are final; a failed payout
   * releases its items so the next payout run can include them.
   */
  async updatePayoutStatus(
    payoutId: string,
    status: PayoutStatus,
    paymentReference?: string,
    notes?: string
  ) {
    const payout = await prisma.supplierPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundError('Payout');
    }

    if (!PAYOUT_TRANSITIONS[payout.status].includes(status)) {
      throw new AppError(`A ${payout.status} payout can't be changed to ${status}`, 400);
    }

    const updates: Prisma.SupplierPayoutUpdateManyMutationInput = {
      status,
    };

    if (paymentReference) {
      updates.paymentReference = paymentReference;
    }

    if (notes) {
      updates.notes = notes;
    }

    if (status === PayoutStatus.COMPLETED) {
      updates.paidAt = new Date();
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.supplierPayout.updateMany({
        where: { id: payoutId, status: payout.status },
        data: updates,
      });

      if (count === 0) {
        throw new AppError('This payout was updated by someone else. Please refresh and try again.', 409);
      }

      if (status === PayoutStatus.FAILED) {
        await tx.orderItem.updateMany({
          where: { payoutId },
          data: { payoutId: null },
        });
      }
    });

    return prisma.supplierPayout.findUniqueOrThrow({
      where: { id: payoutId },
      include: {
        supplier: {
          select: { businessName: true },
        },
      },
    });
  }

  /**
   * Get payout summary statistics
   */
  async getPayoutStats() {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.supplierPayout.aggregate({
        where: { status: PayoutStatus.PENDING },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.supplierPayout.aggregate({
        where: { status: PayoutStatus.PROCESSING },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.supplierPayout.aggregate({
        where: { status: PayoutStatus.COMPLETED },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.supplierPayout.aggregate({
        where: { status: PayoutStatus.FAILED },
        _sum: { netAmount: true },
        _count: true,
      }),
    ]);

    return {
      pending: {
        count: pending._count,
        amount: pending._sum.netAmount?.toNumber() || 0,
      },
      processing: {
        count: processing._count,
        amount: processing._sum.netAmount?.toNumber() || 0,
      },
      completed: {
        count: completed._count,
        amount: completed._sum.netAmount?.toNumber() || 0,
      },
      failed: {
        count: failed._count,
        amount: failed._sum.netAmount?.toNumber() || 0,
      },
    };
  }

  /**
   * Get supplier earnings summary
   */
  async getSupplierEarnings(supplierId: string) {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      lifetimeEarnings,
      monthlyEarnings,
      pendingPayouts,
      completedPayouts,
    ] = await Promise.all([
      prisma.orderItem.aggregate({
        where: {
          supplierId,
          fulfillmentStatus: 'DELIVERED',
        },
        _sum: { totalPrice: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          supplierId,
          fulfillmentStatus: 'DELIVERED',
          deliveredAt: { gte: thisMonth },
        },
        _sum: { totalPrice: true },
      }),
      prisma.supplierPayout.aggregate({
        where: {
          supplierId,
          status: PayoutStatus.PENDING,
        },
        _sum: { netAmount: true },
      }),
      prisma.supplierPayout.aggregate({
        where: {
          supplierId,
          status: PayoutStatus.COMPLETED,
        },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      lifetimeEarnings: lifetimeEarnings._sum.totalPrice?.toNumber() || 0,
      monthlyEarnings: monthlyEarnings._sum.totalPrice?.toNumber() || 0,
      pendingPayouts: pendingPayouts._sum.netAmount?.toNumber() || 0,
      totalPaid: completedPayouts._sum.netAmount?.toNumber() || 0,
    };
  }
}

export const payoutService = new PayoutService();
