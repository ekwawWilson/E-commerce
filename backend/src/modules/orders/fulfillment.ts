import { FulfillmentStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError, NotFoundError } from '../../middleware/errorHandler';
import { orderService } from './order.service';

/**
 * Allowed next steps for an order item. Items move forward one step at a time,
 * so an item can't jump from PENDING to DELIVERED (which would make it eligible
 * for a supplier payout). Cancelling isn't a step here: it goes through order
 * cancellation, which also returns the stock.
 */
export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  [FulfillmentStatus.PENDING]: [FulfillmentStatus.CONFIRMED],
  [FulfillmentStatus.CONFIRMED]: [FulfillmentStatus.PROCESSING],
  [FulfillmentStatus.PROCESSING]: [FulfillmentStatus.SHIPPED],
  [FulfillmentStatus.SHIPPED]: [FulfillmentStatus.DELIVERED],
  [FulfillmentStatus.DELIVERED]: [],
  [FulfillmentStatus.CANCELLED]: [],
};

// Steps that commit stock to the customer. Mobile Money orders must be paid
// first; cash-on-delivery orders are paid at the door.
const NEEDS_PAYMENT: FulfillmentStatus[] = [
  FulfillmentStatus.PROCESSING,
  FulfillmentStatus.SHIPPED,
  FulfillmentStatus.DELIVERED,
];

export function fulfillmentProblem(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
  order: { paymentMethod: PaymentMethod; paymentStatus: PaymentStatus; cancelledAt: Date | null }
): string | null {
  if (order.cancelledAt) {
    return 'This order has been cancelled';
  }
  if (to === FulfillmentStatus.CANCELLED) {
    return 'Items are cancelled by cancelling the order. Please contact the platform admin.';
  }
  if (!FULFILLMENT_TRANSITIONS[from].includes(to)) {
    const next = FULFILLMENT_TRANSITIONS[from];
    return next.length
      ? `An item that is ${from} can only be moved to ${next.join(' or ')}`
      : `An item that is ${from} can't be changed`;
  }
  if (
    NEEDS_PAYMENT.includes(to) &&
    order.paymentMethod === PaymentMethod.MOMO &&
    order.paymentStatus !== PaymentStatus.PAID
  ) {
    return 'This order has not been paid yet';
  }
  return null;
}

/**
 * Move one of a supplier's order items to its next fulfillment step. Used by
 * both the supplier portal and the admin supplier screens.
 */
export async function updateItemFulfillment(
  supplierId: string,
  orderItemId: string,
  data: { status: FulfillmentStatus; trackingNumber?: string; notes?: string }
) {
  if (!Object.values(FulfillmentStatus).includes(data.status)) {
    throw new AppError('Invalid fulfillment status', 400);
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: { id: orderItemId, supplierId },
    include: { order: { select: { paymentMethod: true, paymentStatus: true, cancelledAt: true } } },
  });

  if (!orderItem) {
    throw new NotFoundError('Order item');
  }

  const problem = fulfillmentProblem(orderItem.fulfillmentStatus, data.status, orderItem.order);
  if (problem) {
    throw new AppError(problem, 400);
  }

  const updates: Prisma.OrderItemUpdateManyMutationInput = {
    fulfillmentStatus: data.status,
  };

  if (data.trackingNumber) {
    updates.trackingNumber = data.trackingNumber;
  }
  if (data.notes) {
    updates.notes = data.notes;
  }

  if (data.status === FulfillmentStatus.CONFIRMED) {
    updates.fulfilledAt = new Date();
  } else if (data.status === FulfillmentStatus.SHIPPED) {
    updates.shippedAt = new Date();
  } else if (data.status === FulfillmentStatus.DELIVERED) {
    updates.deliveredAt = new Date();
  }

  // Conditional on the status we validated against, so two concurrent updates
  // can't both apply.
  const { count } = await prisma.orderItem.updateMany({
    where: { id: orderItemId, fulfillmentStatus: orderItem.fulfillmentStatus },
    data: updates,
  });

  if (count === 0) {
    throw new AppError('This item was updated by someone else. Please refresh and try again.', 409);
  }

  await orderService.reconcileDeliveryStatus(orderItem.orderId);

  return prisma.orderItem.findUniqueOrThrow({
    where: { id: orderItemId },
    include: { order: { select: { orderNumber: true } } },
  });
}
