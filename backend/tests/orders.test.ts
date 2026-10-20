import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FulfillmentStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prismaMock = vi.hoisted(() => {
  const mock: any = {
    order: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    orderItem: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    productVariant: { update: vi.fn() },
    inventoryLog: { create: vi.fn() },
    payment: { update: vi.fn() },
    supplier: { findMany: vi.fn() },
    supplierPayout: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    cart: { findUnique: vi.fn() },
    cartItem: { update: vi.fn() },
    setting: { findUnique: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((arg: any) => (typeof arg === 'function' ? arg(mock) : Promise.all(arg)));
  return mock;
});

vi.mock('../src/config/database', () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock('../src/config/queue', () => ({ emailQueue: null, smsQueue: null, pdfQueue: null }));
vi.mock('../src/modules/products/product-write.core', () => ({ recalcProductRollup: vi.fn() }));
vi.mock('../src/modules/notifications/email.service', () => ({ sendOrderConfirmationEmail: vi.fn() }));
vi.mock('../src/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { orderService } from '../src/modules/orders/order.service';
import { updateItemFulfillment } from '../src/modules/orders/fulfillment';
import { payoutService } from '../src/modules/payouts/payout.service';
import { cartService } from '../src/modules/cart/cart.service';
import { checkout as checkoutController } from '../src/modules/orders/order.controller';
import { NotFoundError, AppError } from '../src/middleware/errorHandler';

beforeEach(() => {
  vi.clearAllMocks();
});

const baseOrder = {
  id: 'ord_1',
  orderNumber: 'ORD-20261020-ABCDE',
  customerId: 'cus_1',
  customerName: 'Ama Mensah',
  customerPhone: '024 412 3456',
  customerEmail: 'ama@example.com',
  customerAddress: '12 Ring Road',
  customerCity: 'Accra',
  customerRegion: 'Greater Accra',
  paymentMethod: PaymentMethod.MOMO,
  paymentStatus: PaymentStatus.PENDING,
  deliveryStatus: 'PENDING',
  cancelledAt: null,
  couponCode: null,
  itemsSnapshot: [],
  subtotal: 100,
  discount: 0,
  deliveryFee: 30,
  total: 130,
  currency: 'GHS',
  createdAt: new Date(),
  delivery: null,
};

describe('order tracking', () => {
  it('finds an order with the matching phone, in any format', async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder);
    const result = await orderService.trackOrder({ orderNumber: 'ord-20261020-abcde', phone: '+233244123456' });
    expect(result.orderNumber).toBe(baseOrder.orderNumber);
  });

  it('finds an order by its email, ignoring case', async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder);
    await expect(
      orderService.trackOrder({ orderNumber: baseOrder.orderNumber, email: 'AMA@example.com' })
    ).resolves.toBeTruthy();
  });

  it('treats a wrong phone exactly like a missing order', async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder);
    await expect(
      orderService.trackOrder({ orderNumber: baseOrder.orderNumber, phone: '0200000000' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('public order lookup', () => {
  it('returns no personal details', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder, payment: null, items: [] });
    const view = await orderService.getPublicOrder('ord_1');
    const json = JSON.stringify(view);
    expect(json).not.toContain('Ama Mensah');
    expect(json).not.toContain('412 3456');
    expect(json).not.toContain('Ring Road');
    expect(json).not.toContain('ama@example.com');
  });
});

describe('checkout', () => {
  it('links the order to the signed-in customer, ignoring any customerId in the body', async () => {
    const spy = vi.spyOn(orderService, 'checkout').mockResolvedValue({ id: 'ord_1' } as any);
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    await checkoutController(
      { body: { cartId: 'c1', customerId: 'someone-else' }, customer: { id: 'cus_1' } } as any,
      res,
      vi.fn()
    );

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'cus_1' }));
    spy.mockRestore();
  });
});

describe('order cancellation', () => {
  const items = [
    { id: 'i1', productId: 'p1', variantId: 'v1', quantity: 2, productName: 'Phone', variantName: '128GB', fulfillmentStatus: FulfillmentStatus.PENDING },
  ];

  beforeEach(() => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.orderItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.productVariant.update.mockResolvedValue({ stock: 7 });
  });

  it('returns stock and fails the unpaid payment', async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce({ ...baseOrder, items, payment: { id: 'pay_1', status: PaymentStatus.PENDING } })
      .mockResolvedValue({ ...baseOrder, paymentStatus: PaymentStatus.FAILED, items: [], payment: null, delivery: null });

    const result = await orderService.cancelOrder('ord_1', { type: 'customer', customerId: 'cus_1' }, 'Changed my mind');

    expect(prismaMock.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { increment: 2 } },
    });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.FAILED }) })
    );
    expect(result.refundDue).toBe(false);
  });

  it("won't let a customer cancel someone else's order", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder, customerId: 'other', items, payment: null });
    await expect(
      orderService.cancelOrder('ord_1', { type: 'customer', customerId: 'cus_1' }, 'x')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("won't let a customer cancel once preparation has started", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...baseOrder,
      items: [{ ...items[0], fulfillmentStatus: FulfillmentStatus.PROCESSING }],
      payment: null,
    });
    await expect(
      orderService.cancelOrder('ord_1', { type: 'customer', customerId: 'cus_1' }, 'x')
    ).rejects.toThrow(/already being prepared/);
  });

  it('rolls back if an item shipped while cancelling', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder, items, payment: null });
    prismaMock.orderItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      orderService.cancelOrder('ord_1', { type: 'admin', adminId: 'adm_1' }, 'x')
    ).rejects.toThrow(/changed while cancelling/);
    expect(prismaMock.productVariant.update).not.toHaveBeenCalled();
  });

  it('flags a refund when the order was paid', async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce({ ...baseOrder, items, payment: { id: 'pay_1', status: PaymentStatus.PAID } })
      .mockResolvedValue({ ...baseOrder, paymentStatus: PaymentStatus.PAID, items: [], payment: null, delivery: null });

    const result = await orderService.cancelOrder('ord_1', { type: 'admin', adminId: 'adm_1' }, 'Out of stock');

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(result.refundDue).toBe(true);
  });
});

describe('fulfillment updates', () => {
  it('only applies if the item is still in the status that was checked', async () => {
    prismaMock.orderItem.findFirst.mockResolvedValue({
      id: 'i1',
      orderId: 'ord_1',
      fulfillmentStatus: FulfillmentStatus.PENDING,
      order: { paymentMethod: PaymentMethod.COD, paymentStatus: PaymentStatus.PENDING, cancelledAt: null },
    });
    prismaMock.orderItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateItemFulfillment('sup_1', 'i1', { status: FulfillmentStatus.CONFIRMED })
    ).rejects.toThrow(/updated by someone else/);

    expect(prismaMock.orderItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1', fulfillmentStatus: FulfillmentStatus.PENDING } })
    );
  });

  it("can't touch another supplier's items", async () => {
    prismaMock.orderItem.findFirst.mockResolvedValue(null);
    await expect(
      updateItemFulfillment('sup_2', 'i1', { status: FulfillmentStatus.CONFIRMED })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('payouts', () => {
  beforeEach(() => {
    prismaMock.supplier.findMany.mockResolvedValue([{ id: 'sup_1', businessName: 'Shop', commissionRate: 10 }]);
    prismaMock.setting.findUnique.mockResolvedValue(null);
    prismaMock.orderItem.findMany.mockResolvedValue([
      { id: 'i1', totalPrice: new Prisma.Decimal(100), commissionAmount: new Prisma.Decimal(10) },
    ]);
    prismaMock.supplierPayout.create.mockResolvedValue({ id: 'po_1' });
  });

  it('only pays delivered, unpaid-out items from paid, uncancelled orders', async () => {
    prismaMock.orderItem.updateMany.mockResolvedValue({ count: 1 });

    await payoutService.generatePayouts(new Date('2026-10-01'), new Date('2026-10-31'));

    expect(prismaMock.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fulfillmentStatus: 'DELIVERED',
          payoutId: null,
          order: { paymentStatus: PaymentStatus.PAID, cancelledAt: null },
        }),
      })
    );
    expect(prismaMock.supplierPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ netAmount: 90 }) })
    );
  });

  it('rolls back instead of double-paying when another run claimed the items', async () => {
    prismaMock.orderItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      payoutService.generatePayouts(new Date('2026-10-01'), new Date('2026-10-31'))
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects a reversed period', async () => {
    await expect(
      payoutService.generatePayouts(new Date('2026-10-31'), new Date('2026-10-01'))
    ).rejects.toThrow(/before its end/);
  });

  it('treats a completed payout as final', async () => {
    prismaMock.supplierPayout.findUnique.mockResolvedValue({ id: 'po_1', status: 'COMPLETED' });
    await expect(payoutService.updatePayoutStatus('po_1', 'PENDING' as any)).rejects.toThrow(/can't be changed/);
  });

  it('releases the items of a failed payout so they can be paid later', async () => {
    prismaMock.supplierPayout.findUnique.mockResolvedValue({ id: 'po_1', status: 'PROCESSING' });
    prismaMock.supplierPayout.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.supplierPayout.findUniqueOrThrow.mockResolvedValue({ id: 'po_1', status: 'FAILED' });

    await payoutService.updatePayoutStatus('po_1', 'FAILED' as any);

    expect(prismaMock.orderItem.updateMany).toHaveBeenCalledWith({ where: { payoutId: 'po_1' }, data: { payoutId: null } });
  });
});

describe('checkout price check', () => {
  const cartItem = (snapshot: number, current: number, supplierStatus = 'ACTIVE') => ({
    id: 'ci1',
    productId: 'p1',
    variantId: 'v1',
    quantity: 1,
    snapshotPrice: new Prisma.Decimal(snapshot),
    snapshotName: 'Phone',
    snapshotVariantName: null,
    currency: 'GHS',
    variant: { id: 'v1', name: 'Default', sku: null, price: new Prisma.Decimal(current), stock: 5, active: true, isPreorder: false },
    product: {
      id: 'p1', name: 'Phone', slug: 'phone', price: new Prisma.Decimal(current), stock: 5, active: true,
      supplierId: 's1', images: [], supplier: { id: 's1', businessName: 'Shop', slug: 'shop', status: supplierStatus },
      deliveryZones: [],
    },
  });

  it('updates the cart and stops checkout when a price has changed', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 'cart_1', cartId: 'c1', items: [cartItem(900, 1000)] });

    await expect(cartService.validateCartForCheckout('c1')).rejects.toThrow(/Prices in your cart have changed/);
    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci1' },
      data: { snapshotPrice: new Prisma.Decimal(1000) },
    });
  });

  it("rejects products from a supplier who isn't active", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 'cart_1', cartId: 'c1', items: [cartItem(1000, 1000, 'SUSPENDED')] });
    await expect(cartService.validateCartForCheckout('c1')).rejects.toThrow(/no longer available/);
  });

  it('passes an unchanged cart', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 'cart_1', cartId: 'c1', items: [cartItem(1000, 1000)] });
    await expect(cartService.validateCartForCheckout('c1')).resolves.toBeTruthy();
  });
});
