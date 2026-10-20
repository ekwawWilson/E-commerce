import prisma from '../../config/database';
import config from '../../config';
import { PaymentMethod, PaymentStatus, DeliveryStatus, FulfillmentStatus, Prisma } from '@prisma/client';
import { generateOrderNumber, generateTrackingNumber, parsePaginationParams, sanitizePhoneNumber } from '../../utils/helpers';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import { cartService, CartWithItems } from '../cart/cart.service';
import { couponService } from '../coupons/coupon.service';
import { recalcProductRollup } from '../products/product-write.core';
import { settingsService } from '../settings/settings.service';
import { OrderItemSnapshot, DeliverySettings } from '../../types';
import { emailQueue, smsQueue, pdfQueue } from '../../config/queue';
import { sendOrderConfirmationEmail } from '../notifications/email.service';
import { calculateOrderDeliveryFee } from './delivery-fee';
import logger from '../../utils/logger';

export interface CheckoutData {
  cartId: string;
  customerId?: string; // Set from the authenticated customer, never the request body
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    region?: string;
    deliveryNotes?: string;
  };
  paymentMethod: PaymentMethod;
  momoPhoneNumber?: string;
  couponCode?: string;
  notes?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  supplierId?: string;
}

export type CancelActor =
  | { type: 'customer'; customerId: string }
  | { type: 'admin'; adminId: string }
  | { type: 'system' };

// Items a customer may still cancel: the supplier hasn't started preparing them
const CUSTOMER_CANCELLABLE: FulfillmentStatus[] = [FulfillmentStatus.PENDING, FulfillmentStatus.CONFIRMED];
// Items an admin may cancel: anything that hasn't left the supplier yet
const ADMIN_CANCELLABLE: FulfillmentStatus[] = [
  FulfillmentStatus.PENDING,
  FulfillmentStatus.CONFIRMED,
  FulfillmentStatus.PROCESSING,
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function sameContact(
  order: { customerPhone: string; customerEmail: string | null },
  contact: { phone?: string; email?: string }
): boolean {
  if (contact.phone) {
    const digits = (p: string) => sanitizePhoneNumber(p).replace(/\D/g, '');
    return digits(order.customerPhone) === digits(contact.phone);
  }
  if (contact.email && order.customerEmail) {
    return order.customerEmail.trim().toLowerCase() === contact.email.trim().toLowerCase();
  }
  return false;
}

export class OrderService {
  /**
   * Create order from checkout
   */
  /**
   * Price a cart for a destination: subtotal, coupon discount, delivery fee
   * and total. Shared by checkout and the checkout quote so they always agree.
   */
  private async priceCart(
    cart: CartWithItems,
    destination: { city: string; region?: string },
    couponCode?: string
  ) {
    // Get delivery settings
    const deliverySettingsRecord = await prisma.setting.findUnique({
      where: { key: 'delivery_settings' },
    });

    // Fallbacks are GHS magnitudes; the XAF-scaled values they replaced would
    // have charged a ~GH₵2,000 delivery fee if the setting were ever missing.
    const deliverySettings = (deliverySettingsRecord?.value as unknown || {
      default_fee: 30,
      free_delivery_threshold: 2000,
    }) as DeliverySettings;

    const { subtotal } = cartService.calculateCartTotals(cart);

    const applied = couponCode ? await couponService.evaluate(couponCode, subtotal) : null;
    const discount = applied?.discount ?? 0;
    const discountedSubtotal = round2(subtotal - discount);

    const deliveryFee = calculateOrderDeliveryFee(
      cart.items.map((item) => ({
        label: item.snapshotVariantName ? `${item.snapshotName} (${item.snapshotVariantName})` : item.snapshotName,
        supplierId: item.product.supplierId,
        deliveryZones: item.product.deliveryZones,
      })),
      destination,
      deliverySettings,
      discountedSubtotal
    );

    return {
      subtotal,
      discount,
      couponCode: applied?.coupon.code ?? null,
      coupon: applied?.coupon ?? null,
      deliveryFee,
      total: round2(discountedSubtotal + deliveryFee),
    };
  }

  /**
   * What checkout would charge, without placing the order
   */
  async quote(data: { cartId: string; city: string; region?: string; couponCode?: string }) {
    const cart = await cartService.getCart(data.cartId);
    const { coupon, ...pricing } = await this.priceCart(
      cart,
      { city: data.city, region: data.region },
      data.couponCode
    );
    return pricing;
  }

  async checkout(data: CheckoutData) {
    // Validate cart (availability, stock, current prices)
    const cart = await cartService.validateCartForCheckout(data.cartId);

    const { subtotal, discount, deliveryFee, total, coupon } = await this.priceCart(
      cart,
      { city: data.customer.city, region: data.customer.region },
      data.couponCode
    );
    const applied = coupon ? { coupon } : null;

    // Currency comes from admin store settings so it can be changed without a
    // redeploy; cart item currency still wins, since those were snapshotted at
    // the price the customer actually saw.
    const storeCurrency = await settingsService.getDefaultCurrency();

    // Create items snapshot
    const itemsSnapshot: OrderItemSnapshot[] = cart.items.map((item) => ({
      productId: item.productId,
      name: item.snapshotName,
      price: Number(item.snapshotPrice),
      quantity: item.quantity,
      imageUrl: item.product.images[0]?.url,
    }));

    // Get products with supplier info to create order items
    const productIds = cart.items.map(item => item.productId);
    const productsWithSuppliers = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, supplierId: true, name: true, stock: true },
    });

    // Map products by ID for quick lookup
    const productMap = new Map(productsWithSuppliers.map(p => [p.id, p]));

    // Count unique suppliers
    const uniqueSuppliers = new Set(
      productsWithSuppliers.map(p => p.supplierId).filter(Boolean)
    );

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      if (applied) {
        await couponService.redeem(tx, applied.coupon.id);
      }

      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: data.customerId, // Link to customer if logged in
          customerName: data.customer.name,
          customerPhone: data.customer.phone,
          customerEmail: data.customer.email,
          customerAddress: data.customer.address,
          customerCity: data.customer.city,
          customerRegion: data.customer.region,
          deliveryNotes: data.customer.deliveryNotes,
          itemsSnapshot: itemsSnapshot as unknown as Prisma.InputJsonValue,
          paymentMethod: data.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          deliveryStatus: DeliveryStatus.PENDING,
          subtotal,
          deliveryFee,
          discount,
          couponCode: applied?.coupon.code,
          total,
          currency: cart.items[0]?.currency || storeCurrency,
          notes: data.notes,
          supplierCount: uniqueSuppliers.size || 1,
        },
      });

      // Create OrderItems for each cart item (multi-supplier support)
      for (const item of cart.items) {
        const product = productMap.get(item.productId);
        const supplierId = product?.supplierId;

        // Get supplier commission rate if supplier exists
        let commissionRate = 0;
        if (supplierId) {
          const supplier = await tx.supplier.findUnique({
            where: { id: supplierId },
            select: { commissionRate: true },
          });
          commissionRate = supplier?.commissionRate.toNumber() || 0;
        }

        // Commission is on the full price: coupons are platform-funded
        const itemTotal = Number(item.snapshotPrice) * item.quantity;
        const commission = itemTotal * (commissionRate / 100);

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            supplierId,
            productName: item.snapshotName,
            variantName: item.snapshotVariantName,
            // These snapshot columns existed but were never populated.
            productSku: item.variant?.sku ?? null,
            productImage: item.product.images[0]?.url ?? null,
            unitPrice: Number(item.snapshotPrice),
            quantity: item.quantity,
            totalPrice: itemTotal,
            commissionRate,
            commissionAmount: commission,
            currency: item.currency,
            fulfillmentStatus: FulfillmentStatus.PENDING,
          },
        });
      }

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: data.paymentMethod,
          amount: total,
          currency: cart.items[0]?.currency || storeCurrency,
          status: PaymentStatus.PENDING,
          phoneNumber: data.momoPhoneNumber,
        },
      });

      // Create delivery record
      await tx.delivery.create({
        data: {
          orderId: newOrder.id,
          status: DeliveryStatus.PENDING,
          trackingNumber: generateTrackingNumber(),
        },
      });

      // Reduce stock on the VARIANT row, with an atomic guard against
      // overselling under concurrent checkouts. This must target the variant:
      // stock lives there now, and decrementing Product instead would let two
      // buyers take the last unit of the same variant.
      const touchedProductIds = new Set<string>();

      for (const item of cart.items) {
        const product = productMap.get(item.productId);

        // Preorder variants are allowed to go negative — that is the point of
        // a preorder — so they skip the availability guard.
        if (item.variant.isPreorder) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          const { count } = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });

          if (count === 0) {
            const label = item.snapshotVariantName
              ? `${item.snapshotName} (${item.snapshotVariantName})`
              : item.snapshotName;
            throw new AppError(`${label}: insufficient stock available`, 409);
          }
        }

        touchedProductIds.add(item.productId);

        // Create inventory log
        if (product) {
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              productName: item.snapshotVariantName
                ? `${item.snapshotName} (${item.snapshotVariantName})`
                : item.snapshotName,
              previousStock: product.stock,
              newStock: product.stock - item.quantity,
              change: -item.quantity,
              reason: 'SALE',
              referenceId: newOrder.id,
              referenceType: 'ORDER',
            },
          });
        }
      }

      // Bring Product.price/stock rollups back in step with the variants.
      for (const productId of touchedProductIds) {
        await recalcProductRollup(productId, tx);
      }

      // Clear the cart
      await tx.cartItem.deleteMany({
        where: { cart: { cartId: data.cartId } },
      });

      return newOrder;
    });

    // Queue notifications (if queues are available)
    await this.queueOrderNotifications(order.id);

    // Queue PDF generation (if queue is available)
    if (pdfQueue) {
      await pdfQueue.add('generate-invoice', {
        type: 'invoice',
        orderId: order.id,
      });
    }

    return this.getOrderById(order.id);
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        delivery: {
          include: {
            courier: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            supplier: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  /**
   * Public order view by ID, for the confirmation and payment pages. Contains
   * no personal details: the ID is hard to guess but appears in URLs.
   */
  async getPublicOrder(id: string) {
    const order = await this.getOrderById(id);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      // `status` is kept for older app builds that read it
      status: order.paymentStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      deliveryStatus: order.deliveryStatus,
      cancelledAt: order.cancelledAt,
      items: order.itemsSnapshot,
      itemsSnapshot: order.itemsSnapshot,
      subtotal: order.subtotal,
      discount: order.discount,
      couponCode: order.couponCode,
      deliveryFee: order.deliveryFee,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt,
      delivery: order.delivery
        ? {
            status: order.delivery.status,
            trackingNumber: order.delivery.trackingNumber,
            estimatedDate: order.delivery.estimatedDate,
          }
        : null,
    };
  }

  /**
   * Track order (public). The caller must know both the order number and the
   * phone number or email it was placed with; a wrong pair is indistinguishable
   * from a missing order, so this can't be used to probe for orders.
   */
  async trackOrder(params: { orderNumber: string; phone?: string; email?: string }) {
    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber.trim().toUpperCase() },
      include: {
        delivery: {
          select: {
            status: true,
            trackingNumber: true,
            estimatedDate: true,
            pickedUpAt: true,
            inTransitAt: true,
            deliveredAt: true,
            courier: { select: { name: true } },
          },
        },
      },
    });

    if (!order || !sameContact(order, params)) {
      throw new NotFoundError('Order');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      cancelledAt: order.cancelledAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: [order.customerAddress, order.customerCity, order.customerRegion]
        .filter(Boolean)
        .join(', '),
      itemsSnapshot: order.itemsSnapshot,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      currency: order.currency,
      delivery: order.delivery,
    };
  }

  /**
   * Get paginated list of orders (admin)
   */
  async getOrders(params: OrderListParams) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(params as Record<string, unknown>);

    const where: Prisma.OrderWhereInput = {};

    if (params.status) {
      where.paymentStatus = params.status;
    }

    if (params.deliveryStatus) {
      where.deliveryStatus = params.deliveryStatus;
    }

    if (params.search) {
      where.OR = [
        { orderNumber: { contains: params.search, mode: 'insensitive' } },
        { customerName: { contains: params.search, mode: 'insensitive' } },
        { customerPhone: { contains: params.search } },
        { customerEmail: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    // Filter by supplier (orders containing items from this supplier)
    if (params.supplierId) {
      where.items = {
        some: {
          supplierId: params.supplierId,
        },
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          payment: true,
          delivery: {
            include: { courier: true },
          },
          // When filtering by supplier, order-wide paymentStatus/deliveryStatus
          // reflect the whole order, which may include other suppliers' items.
          // Include this supplier's own items so callers can show its actual
          // per-item fulfillment progress instead of the order-wide status.
          ...(params.supplierId
            ? {
                items: {
                  where: { supplierId: params.supplierId },
                  select: {
                    id: true,
                    productName: true,
                    quantity: true,
                    fulfillmentStatus: true,
                    shippedAt: true,
                    deliveredAt: true,
                  },
                },
              }
            : {}),
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: string,
    data: {
      paymentStatus?: PaymentStatus;
      deliveryStatus?: DeliveryStatus;
      courierId?: string;
      trackingNumber?: string;
      notes?: string;
    }
  ) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.cancelledAt && data.deliveryStatus) {
      throw new AppError('This order has been cancelled', 400);
    }

    // Refunds go through recordRefund so the refund details are captured
    if (data.paymentStatus === PaymentStatus.REFUNDED) {
      throw new AppError('Use the refund action to record a refund', 400);
    }

    const updates: Prisma.OrderUpdateInput = {};

    if (data.paymentStatus) {
      updates.paymentStatus = data.paymentStatus;

      // Update payment record
      await prisma.payment.update({
        where: { orderId: id },
        data: {
          status: data.paymentStatus,
          paidAt: data.paymentStatus === PaymentStatus.PAID ? new Date() : undefined,
          failedAt: data.paymentStatus === PaymentStatus.FAILED ? new Date() : undefined,
        },
      });
    }

    if (data.deliveryStatus) {
      updates.deliveryStatus = data.deliveryStatus;

      // Update delivery record
      const deliveryUpdates: Prisma.DeliveryUpdateInput = {
        status: data.deliveryStatus,
      };

      if (data.courierId) {
        deliveryUpdates.courier = { connect: { id: data.courierId } };
        deliveryUpdates.assignedAt = new Date();
      }

      if (data.trackingNumber) {
        deliveryUpdates.trackingNumber = data.trackingNumber;
      }

      switch (data.deliveryStatus) {
        case DeliveryStatus.PICKED_UP:
          deliveryUpdates.pickedUpAt = new Date();
          break;
        case DeliveryStatus.IN_TRANSIT:
          deliveryUpdates.inTransitAt = new Date();
          break;
        case DeliveryStatus.DELIVERED:
          deliveryUpdates.deliveredAt = new Date();
          break;
      }

      await prisma.delivery.update({
        where: { orderId: id },
        data: deliveryUpdates,
      });
    }

    if (data.notes) {
      updates.notes = data.notes;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updates,
      include: {
        payment: true,
        delivery: { include: { courier: true } },
      },
    });

    // Queue status update notification
    await this.queueStatusUpdateNotification(id);

    return updatedOrder;
  }

  /**
   * Mark order as shipped
   */
  async markAsShipped(
    id: string,
    data: {
      courierId?: string;
      trackingNumber?: string;
      estimatedDeliveryDate?: Date;
      notes?: string;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { delivery: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.cancelledAt) {
      throw new AppError('This order has been cancelled', 400);
    }

    if (!order.delivery) {
      throw new AppError('Delivery record not found', 400);
    }

    // Update delivery
    await prisma.delivery.update({
      where: { orderId: id },
      data: {
        courierId: data.courierId,
        trackingNumber: data.trackingNumber || order.delivery.trackingNumber,
        estimatedDate: data.estimatedDeliveryDate,
        status: DeliveryStatus.PICKED_UP,
        assignedAt: new Date(),
        pickedUpAt: new Date(),
        notes: data.notes,
      },
    });

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { deliveryStatus: DeliveryStatus.PICKED_UP },
      include: {
        payment: true,
        delivery: { include: { courier: true } },
      },
    });

    // Generate delivery note (if queue is available)
    if (pdfQueue) {
      await pdfQueue.add('generate-delivery-note', {
        type: 'delivery_note',
        orderId: id,
      });
    }

    // Queue notification
    await this.queueStatusUpdateNotification(id);

    return updatedOrder;
  }

  /**
   * Cancel an order: cancels its unshipped items, returns their stock, gives
   * back the coupon use and closes an unpaid payment. A paid order stays PAID
   * and is flagged `refundDue` until an admin records the refund.
   */
  async cancelOrder(orderId: string, actor: CancelActor, reason: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order || (actor.type === 'customer' && order.customerId !== actor.customerId)) {
      throw new NotFoundError('Order');
    }

    if (order.cancelledAt) {
      throw new AppError('This order is already cancelled', 400);
    }

    const allowed = actor.type === 'customer' ? CUSTOMER_CANCELLABLE : ADMIN_CANCELLABLE;
    const live = order.items.filter((i) => i.fulfillmentStatus !== FulfillmentStatus.CANCELLED);

    if (live.some((i) => !allowed.includes(i.fulfillmentStatus))) {
      throw new AppError(
        actor.type === 'customer'
          ? 'This order is already being prepared and can no longer be cancelled. Please contact support.'
          : 'Some items have already shipped, so this order can no longer be cancelled',
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      // Conditional on not already cancelled, so concurrent cancels run once
      const { count } = await tx.order.updateMany({
        where: { id: orderId, cancelledAt: null },
        data: { cancelledAt: new Date(), cancelReason: reason },
      });
      if (count === 0) {
        throw new AppError('This order is already cancelled', 409);
      }

      // Conditional too: if a supplier shipped an item in the meantime, the
      // counts differ and the whole cancellation rolls back.
      const cancelled = await tx.orderItem.updateMany({
        where: { id: { in: live.map((i) => i.id) }, fulfillmentStatus: { in: allowed } },
        data: { fulfillmentStatus: FulfillmentStatus.CANCELLED },
      });
      if (cancelled.count !== live.length) {
        throw new AppError('The order changed while cancelling. Please try again.', 409);
      }

      const touchedProductIds = new Set<string>();
      for (const item of live) {
        if (!item.variantId) continue;

        const variant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
        touchedProductIds.add(item.productId);

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            productName: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
            previousStock: variant.stock - item.quantity,
            newStock: variant.stock,
            change: item.quantity,
            reason: 'CANCELLED',
            referenceId: orderId,
            referenceType: 'ORDER',
            performedBy: actor.type === 'admin' ? actor.adminId : null,
          },
        });
      }

      for (const productId of touchedProductIds) {
        await recalcProductRollup(productId, tx);
      }

      if (order.couponCode) {
        await couponService.release(tx, order.couponCode);
      }

      // An unpaid payment can no longer complete; a paid one awaits a refund
      if (order.payment && order.payment.status === PaymentStatus.PENDING) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.FAILED, failedAt: new Date(), failedReason: 'Order cancelled' },
        });
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.FAILED } });
      }
    });

    await this.queueCancellationNotification(orderId).catch((error) =>
      logger.error('Failed to queue cancellation notification:', error)
    );

    const updated = await this.getOrderById(orderId);
    return { order: updated, refundDue: updated.paymentStatus === PaymentStatus.PAID };
  }

  /**
   * Record a refund for a cancelled, paid order. The money itself is sent
   * outside the system (e.g. a MoMo transfer); this records that it was.
   */
  async recordRefund(orderId: string, data: { reason: string; reference?: string }) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });

    if (!order || !order.payment) {
      throw new NotFoundError('Order');
    }
    if (!order.cancelledAt) {
      throw new AppError('Cancel the order before recording a refund', 400);
    }
    if (order.payment.status !== PaymentStatus.PAID) {
      throw new AppError('Only paid orders can be refunded', 400);
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          refundReason: data.reason,
          refundReference: data.reference,
        },
      }),
      prisma.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.REFUNDED } }),
    ]);

    if (smsQueue) {
      await smsQueue.add('refund', {
        to: order.customerPhone,
        message: `A refund of ${order.total} ${order.currency} for order ${order.orderNumber} has been sent.`,
        orderId,
      });
    }

    return this.getOrderById(orderId);
  }

  /**
   * Cancel Mobile Money orders that were never paid, so they stop holding
   * stock. Runs on a timer; safe to run concurrently because cancelOrder is
   * conditional.
   */
  async cancelStaleUnpaidOrders(maxAgeHours = config.unpaidOrderTtlHours) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const stale = await prisma.order.findMany({
      where: {
        paymentMethod: PaymentMethod.MOMO,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        cancelledAt: null,
        createdAt: { lt: cutoff },
      },
      select: { id: true, orderNumber: true },
      take: 100,
    });

    let cancelled = 0;
    for (const order of stale) {
      try {
        await this.cancelOrder(order.id, { type: 'system' }, 'Payment not received in time');
        cancelled++;
      } catch (error) {
        logger.warn(`Could not auto-cancel unpaid order ${order.orderNumber}:`, error);
      }
    }

    return cancelled;
  }

  /**
   * Recompute an order's overall deliveryStatus from its per-supplier
   * OrderItem.fulfillmentStatus values, and persist it if it changed.
   *
   * Multi-supplier orders are fulfilled item-by-item (see supplier-portal
   * and admin supplier services), but customers/admins track progress via
   * the single Order.deliveryStatus field. This keeps that field in sync.
   */
  async reconcileDeliveryStatus(orderId: string) {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { fulfillmentStatus: true },
    });

    const relevant = items.filter((i) => i.fulfillmentStatus !== FulfillmentStatus.CANCELLED);

    if (relevant.length === 0) {
      return;
    }

    let derivedStatus: DeliveryStatus;

    if (relevant.every((i) => i.fulfillmentStatus === FulfillmentStatus.DELIVERED)) {
      derivedStatus = DeliveryStatus.DELIVERED;
    } else if (relevant.some((i) => i.fulfillmentStatus === FulfillmentStatus.SHIPPED || i.fulfillmentStatus === FulfillmentStatus.DELIVERED)) {
      derivedStatus = DeliveryStatus.IN_TRANSIT;
    } else if (relevant.some((i) => i.fulfillmentStatus === FulfillmentStatus.CONFIRMED || i.fulfillmentStatus === FulfillmentStatus.PROCESSING)) {
      derivedStatus = DeliveryStatus.PICKED_UP;
    } else {
      derivedStatus = DeliveryStatus.PENDING;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryStatus: true, delivery: { select: { orderId: true } } },
    });

    if (!order || order.deliveryStatus === derivedStatus) {
      return;
    }

    const deliveryTimestampField =
      derivedStatus === DeliveryStatus.PICKED_UP ? 'pickedUpAt' :
      derivedStatus === DeliveryStatus.IN_TRANSIT ? 'inTransitAt' :
      derivedStatus === DeliveryStatus.DELIVERED ? 'deliveredAt' :
      undefined;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { deliveryStatus: derivedStatus },
      });

      if (order.delivery) {
        await tx.delivery.update({
          where: { orderId },
          data: {
            status: derivedStatus,
            ...(deliveryTimestampField ? { [deliveryTimestampField]: new Date() } : {}),
          },
        });
      }
    });

    await this.queueStatusUpdateNotification(orderId);
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoice(id: string) {
    await this.getOrderById(id);

    if (pdfQueue) {
      await pdfQueue.add('generate-invoice', {
        type: 'invoice',
        orderId: id,
      });
    }

    return { message: 'Invoice generation queued', orderId: id };
  }

  /**
   * Queue order confirmation notifications
   */
  private async queueOrderNotifications(orderId: string) {
    const order = await this.getOrderById(orderId);

    // Confirmation email is sent directly so it works without Redis. (It used
    // to be queued as well, which sent customers two copies.)
    if (order.customerEmail) {
      try {
        await sendOrderConfirmationEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress,
          customerCity: order.customerCity,
          customerRegion: order.customerRegion,
          paymentMethod: order.paymentMethod,
          itemsSnapshot: order.itemsSnapshot as any[],
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
        });
      } catch (error) {
        // Log error but don't fail the order
        logger.error('Failed to send order confirmation email:', error);
      }
    }

    // SMS notification (if queue is available)
    if (smsQueue) {
      await smsQueue.add('order-confirmation', {
        to: order.customerPhone,
        message: `Your order ${order.orderNumber} has been placed successfully. Total: ${order.total} ${order.currency}. Track your order at our website.`,
        orderId,
      });
    }
  }

  /**
   * Queue status update notification
   */
  private async queueStatusUpdateNotification(orderId: string) {
    const order = await this.getOrderById(orderId);

    const statusMessages: Record<DeliveryStatus, string> = {
      [DeliveryStatus.PENDING]: 'is being processed',
      [DeliveryStatus.PICKED_UP]: 'has been picked up for delivery',
      [DeliveryStatus.IN_TRANSIT]: 'is on its way to you',
      [DeliveryStatus.DELIVERED]: 'has been delivered',
    };

    const message = `Your order ${order.orderNumber} ${statusMessages[order.deliveryStatus]}.`;

    // SMS notification (if queue is available)
    if (smsQueue) {
      await smsQueue.add('status-update', {
        to: order.customerPhone,
        message,
        orderId,
      });
    }

    // Email notification (if queue is available)
    if (order.customerEmail && emailQueue) {
      await emailQueue.add('status-update', {
        to: order.customerEmail,
        subject: `Order Update - ${order.orderNumber}`,
        template: 'order-status-update',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status: order.deliveryStatus,
          message,
        },
        orderId,
      });
    }
  }

  private async queueCancellationNotification(orderId: string) {
    const order = await this.getOrderById(orderId);
    const message = `Your order ${order.orderNumber} has been cancelled.${
      order.paymentStatus === PaymentStatus.PAID ? ' Your payment will be refunded.' : ''
    }`;

    if (smsQueue) {
      await smsQueue.add('order-cancelled', { to: order.customerPhone, message, orderId });
    }

    if (order.customerEmail && emailQueue) {
      await emailQueue.add('order-cancelled', {
        to: order.customerEmail,
        subject: `Order Cancelled - ${order.orderNumber}`,
        template: 'order-status-update',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status: 'CANCELLED',
          message,
        },
        orderId,
      });
    }
  }
}

export const orderService = new OrderService();
