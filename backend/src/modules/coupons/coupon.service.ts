import { Coupon, DiscountType, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError, NotFoundError } from '../../middleware/errorHandler';
import { cartService } from '../cart/cart.service';

type Tx = Prisma.TransactionClient;

export interface CouponInput {
  code: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active?: boolean;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Discount a coupon gives on a subtotal, never more than the subtotal itself.
 */
export function calculateDiscount(
  coupon: Pick<Coupon, 'type' | 'value' | 'maxDiscount'>,
  subtotal: number
): number {
  const value = Number(coupon.value);
  let discount = coupon.type === DiscountType.PERCENTAGE ? (subtotal * value) / 100 : value;

  if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
    discount = Math.min(discount, Number(coupon.maxDiscount));
  }

  return round2(Math.max(0, Math.min(discount, subtotal)));
}

/**
 * Why a coupon can't be used right now, or null if it can. Usage limits are
 * re-checked atomically when the coupon is redeemed.
 */
export function couponProblem(coupon: Coupon, subtotal: number, now = new Date()): string | null {
  if (!coupon.active) return 'This coupon is no longer active';
  if (coupon.startsAt && coupon.startsAt > now) return 'This coupon is not active yet';
  if (coupon.endsAt && coupon.endsAt < now) return 'This coupon has expired';
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return 'This coupon has been fully redeemed';
  }
  if (coupon.minSubtotal !== null && subtotal < Number(coupon.minSubtotal)) {
    return `This coupon needs a minimum order of ${Number(coupon.minSubtotal).toFixed(2)}`;
  }
  return null;
}

export class CouponService {
  /**
   * Look up a coupon for a subtotal and return the discount it gives.
   */
  async evaluate(code: string, subtotal: number) {
    const coupon = await prisma.coupon.findUnique({ where: { code: normalizeCouponCode(code) } });

    if (!coupon) {
      throw new AppError('Coupon code not found', 400);
    }

    const problem = couponProblem(coupon, subtotal);
    if (problem) {
      throw new AppError(problem, 400);
    }

    return { coupon, discount: calculateDiscount(coupon, subtotal) };
  }

  /**
   * Preview a coupon against a cart, computing the subtotal server-side.
   */
  async previewForCart(code: string, cartId: string) {
    const cart = await cartService.getCart(cartId);
    const { subtotal } = cartService.calculateCartTotals(cart);
    const { coupon, discount } = await this.evaluate(code, subtotal);

    return {
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: Number(coupon.value),
      subtotal,
      discount,
    };
  }

  /**
   * Count one use of a coupon. A single conditional UPDATE, so two concurrent
   * checkouts can't both take the last use.
   */
  async redeem(tx: Tx, couponId: string) {
    const updated = await tx.$executeRaw`
      UPDATE "coupons"
      SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
      WHERE "id" = ${couponId}
        AND "active" = true
        AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
    `;

    if (updated === 0) {
      throw new AppError('This coupon has been fully redeemed', 409);
    }
  }

  /**
   * Give a use back, e.g. when the order that used it is cancelled.
   */
  async release(tx: Tx, code: string) {
    await tx.$executeRaw`
      UPDATE "coupons"
      SET "usedCount" = "usedCount" - 1, "updatedAt" = NOW()
      WHERE "code" = ${normalizeCouponCode(code)} AND "usedCount" > 0
    `;
  }

  // ============================================
  // ADMIN
  // ============================================

  async list() {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: CouponInput) {
    const code = normalizeCouponCode(data.code);
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new AppError('A coupon with this code already exists', 409);
    }

    return prisma.coupon.create({ data: { ...data, code } });
  }

  async update(id: string, data: Partial<CouponInput>) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundError('Coupon');
    }

    const code = data.code ? normalizeCouponCode(data.code) : undefined;
    if (code && code !== coupon.code) {
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (existing) {
        throw new AppError('A coupon with this code already exists', 409);
      }
    }

    return prisma.coupon.update({ where: { id }, data: { ...data, code } });
  }

  async remove(id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundError('Coupon');
    }

    // Coupons already used stay on record for order history; just switch them off
    if (coupon.usedCount > 0) {
      return prisma.coupon.update({ where: { id }, data: { active: false } });
    }

    return prisma.coupon.delete({ where: { id } });
  }
}

export const couponService = new CouponService();
