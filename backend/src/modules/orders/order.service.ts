import prisma from '../../config/database';
import config from '../../config';
import { PaymentMethod, PaymentStatus, DeliveryStatus, FulfillmentStatus, Prisma } from '@prisma/client';
import { generateOrderNumber, generateTrackingNumber, parsePaginationParams, calculateDeliveryFee } from '../../utils/helpers';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import { cartService } from '../cart/cart.service';
import { recalcProductRollup } from '../products/product-write.core';
import { settingsService } from '../settings/settings.service';
import { OrderItemSnapshot, DeliverySettings } from '../../types';
import { emailQueue, smsQueue, pdfQueue } from '../../config/queue';
import { sendOrderConfirmationEmail, sendDeliveryUpdateEmail } from '../notifications/email.service';

export interface CheckoutData {
  cartId: string;
  customerId?: string; // Optional - set for logged-in customers
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

export class OrderService {
  /**
   * Create order from checkout
   */
  async checkout(data: CheckoutData) {
    // Validate cart
    const cart = await cartService.validateCartForCheckout(data.cartId);

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

    // Calculate totals
    const cartTotals = cartService.calculateCartTotals(cart);
    const deliveryFee = calculateDeliveryFee(
      cartTotals.subtotal,
      deliverySettings.default_fee,
      deliverySettings.free_delivery_threshold
    );
    const total = cartTotals.subtotal + deliveryFee;

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
          subtotal: cartTotals.subtotal,
          deliveryFee,
          discount: 0,
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
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        payment: true,
        delivery: {
          include: {
            courier: true,
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
   * Track order (public)
   */
  async trackOrder(params: { orderNumber?: string; phone?: string; email?: string }) {
    const { orderNumber, phone, email } = params;

    const where: Prisma.OrderWhereInput = {};

    if (orderNumber) {
      where.orderNumber = orderNumber;
    } else if (phone) {
      where.customerPhone = { contains: phone };
    } else if (email) {
      where.customerEmail = email;
    } else {
      throw new AppError('Order number, phone, or email is required', 400);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        delivery: {
          select: {
            status: true,
            trackingNumber: true,
            estimatedDate: true,
            pickedUpAt: true,
            inTransitAt: true,
            deliveredAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt,
      delivery: order.delivery,
      items: order.itemsSnapshot,
    }));
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
    const order = await this.getOrderById(id);

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

    // Send email directly (doesn't require Redis)
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
        console.error('Failed to send order confirmation email:', error);
      }
    }

    // Email notification via queue (if queue is available - fallback)
    if (order.customerEmail && emailQueue) {
      await emailQueue.add('order-confirmation', {
        to: order.customerEmail,
        subject: `Order Confirmation - ${order.orderNumber}`,
        template: 'order-confirmation',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          items: order.itemsSnapshot,
          subtotal: Number(order.subtotal),
          deliveryFee: Number(order.deliveryFee),
          total: Number(order.total),
          currency: order.currency,
        },
        orderId,
      });
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
}

export const orderService = new OrderService();
