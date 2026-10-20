import { describe, it, expect, vi } from 'vitest';
import { DiscountType, FulfillmentStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

vi.mock('../src/config/database', () => ({ default: {}, prisma: {} }));
vi.mock('../src/config/queue', () => ({}));

import { calculateOrderDeliveryFee, matchDeliveryZone, DeliveryZoneRule } from '../src/modules/orders/delivery-fee';
import { calculateDiscount, couponProblem, normalizeCouponCode } from '../src/modules/coupons/coupon.service';
import { fulfillmentProblem } from '../src/modules/orders/fulfillment';
import { csvCell, toCsv } from '../src/modules/reports/report-csv';
import { sanitizeFolder, publicIdPath } from '../src/modules/upload/upload.service';
import { issuedBeforePasswordChange, readOnlyForSupport } from '../src/middleware/auth';
import { updateCustomerProfileSchema } from '../src/validations';
import { AppError } from '../src/middleware/errorHandler';

const zone = (overrides: Partial<DeliveryZoneRule>): DeliveryZoneRule => ({
  zoneName: 'Accra',
  zoneType: 'city',
  region: null,
  deliveryFee: null,
  available: true,
  ...overrides,
});

const settings = { default_fee: 30, free_delivery_threshold: 2000 };

describe('delivery fees', () => {
  it('prefers a city zone over a region zone', () => {
    const zones = [
      zone({ zoneName: 'Greater Accra', zoneType: 'region', deliveryFee: 40 }),
      zone({ zoneName: 'accra', zoneType: 'city', deliveryFee: 15 }),
    ];
    expect(matchDeliveryZone(zones, { city: 'Accra', region: 'Greater Accra' })?.deliveryFee).toBe(15);
  });

  it('falls back to the store default when a product has no zones', () => {
    const fee = calculateOrderDeliveryFee(
      [{ label: 'Phone', supplierId: 's1', deliveryZones: [] }],
      { city: 'Kumasi' },
      settings,
      500
    );
    expect(fee).toBe(30);
  });

  it('charges each supplier once, at its highest item fee', () => {
    const fee = calculateOrderDeliveryFee(
      [
        { label: 'A', supplierId: 's1', deliveryZones: [zone({ deliveryFee: 10 })] },
        { label: 'B', supplierId: 's1', deliveryZones: [zone({ deliveryFee: 25 })] },
        { label: 'C', supplierId: 's2', deliveryZones: [zone({ deliveryFee: 12 })] },
      ],
      { city: 'Accra' },
      settings,
      500
    );
    expect(fee).toBe(37);
  });

  it('refuses destinations a product cannot be delivered to', () => {
    expect(() =>
      calculateOrderDeliveryFee(
        [{ label: 'Fridge', supplierId: null, deliveryZones: [zone({ available: false })] }],
        { city: 'Accra' },
        settings,
        500
      )
    ).toThrow(AppError);
  });

  it('is free at or above the threshold', () => {
    const fee = calculateOrderDeliveryFee(
      [{ label: 'TV', supplierId: null, deliveryZones: [zone({ deliveryFee: 50 })] }],
      { city: 'Accra' },
      settings,
      2000
    );
    expect(fee).toBe(0);
  });
});

describe('coupons', () => {
  const base = {
    id: 'c1',
    code: 'SAVE10',
    description: null,
    type: DiscountType.PERCENTAGE,
    value: 10 as any,
    minSubtotal: null,
    maxDiscount: null,
    usageLimit: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('normalises codes', () => {
    expect(normalizeCouponCode('  save10 ')).toBe('SAVE10');
  });

  it('applies percentages with a cap', () => {
    expect(calculateDiscount(base, 500)).toBe(50);
    expect(calculateDiscount({ ...base, maxDiscount: 20 as any }, 500)).toBe(20);
  });

  it('never discounts more than the subtotal', () => {
    expect(calculateDiscount({ ...base, type: DiscountType.FIXED, value: 100 as any }, 60)).toBe(60);
  });

  it.each([
    [{ active: false }, /no longer active/],
    [{ endsAt: new Date(Date.now() - 1000) }, /expired/],
    [{ startsAt: new Date(Date.now() + 60_000) }, /not active yet/],
    [{ usageLimit: 5, usedCount: 5 }, /fully redeemed/],
    [{ minSubtotal: 1000 as any }, /minimum order/],
  ])('rejects %o', (overrides, message) => {
    expect(couponProblem({ ...base, ...overrides } as any, 500)).toMatch(message);
  });

  it('accepts a usable coupon', () => {
    expect(couponProblem(base as any, 500)).toBeNull();
  });
});

describe('fulfillment steps', () => {
  const paidMomo = { paymentMethod: PaymentMethod.MOMO, paymentStatus: PaymentStatus.PAID, cancelledAt: null };
  const unpaidMomo = { ...paidMomo, paymentStatus: PaymentStatus.PENDING };
  const unpaidCod = { paymentMethod: PaymentMethod.COD, paymentStatus: PaymentStatus.PENDING, cancelledAt: null };

  it('allows the next step', () => {
    expect(fulfillmentProblem(FulfillmentStatus.PENDING, FulfillmentStatus.CONFIRMED, unpaidMomo)).toBeNull();
    expect(fulfillmentProblem(FulfillmentStatus.SHIPPED, FulfillmentStatus.DELIVERED, paidMomo)).toBeNull();
  });

  it('blocks skipping straight to DELIVERED', () => {
    expect(fulfillmentProblem(FulfillmentStatus.PENDING, FulfillmentStatus.DELIVERED, paidMomo)).toMatch(/only be moved to/);
  });

  it('blocks preparing an unpaid Mobile Money order', () => {
    expect(fulfillmentProblem(FulfillmentStatus.CONFIRMED, FulfillmentStatus.PROCESSING, unpaidMomo)).toMatch(/not been paid/);
  });

  it('lets cash-on-delivery orders ship before payment', () => {
    expect(fulfillmentProblem(FulfillmentStatus.PROCESSING, FulfillmentStatus.SHIPPED, unpaidCod)).toBeNull();
  });

  it('blocks changes to cancelled orders and cancelling via fulfillment', () => {
    expect(
      fulfillmentProblem(FulfillmentStatus.PENDING, FulfillmentStatus.CONFIRMED, { ...paidMomo, cancelledAt: new Date() })
    ).toMatch(/cancelled/);
    expect(fulfillmentProblem(FulfillmentStatus.PENDING, FulfillmentStatus.CANCELLED, paidMomo)).toMatch(/cancelling the order/);
  });

  it('treats DELIVERED as final', () => {
    expect(fulfillmentProblem(FulfillmentStatus.DELIVERED, FulfillmentStatus.SHIPPED, paidMomo)).toMatch(/can't be changed/);
  });
});

describe('report CSV', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+233244123456')).toBe("'+233244123456");
  });

  it('builds a header row and data rows', () => {
    expect(toCsv([{ n: 1 }], [{ header: 'N', value: (r) => r.n }])).toBe('N\r\n1\r\n');
  });
});

describe('upload folders', () => {
  it('accepts plain nested folders', () => {
    expect(sanitizeFolder('suppliers/abc123')).toBe('suppliers/abc123');
    expect(sanitizeFolder(undefined)).toBe('products');
  });

  it.each(['../etc', 'products/../../src', 'a b', 'x/./y'])('rejects %s', (folder) => {
    expect(() => sanitizeFolder(folder)).toThrow(AppError);
  });

  it('trims leading and trailing slashes rather than allowing absolute paths', () => {
    expect(sanitizeFolder('/products/')).toBe('products');
  });

  it('strips the storage prefix from public IDs', () => {
    expect(publicIdPath('supabase:suppliers/s1/x.jpg')).toBe('suppliers/s1/x.jpg');
    expect(publicIdPath('local:products/abc')).toBe('products/abc');
  });
});

describe('sessions after a password change', () => {
  const changedAt = new Date('2026-10-20T12:00:00Z');

  it('rejects tokens issued before the change', () => {
    expect(issuedBeforePasswordChange(changedAt.getTime() / 1000 - 60, changedAt)).toBe(true);
  });

  it('accepts tokens issued at or after the change', () => {
    expect(issuedBeforePasswordChange(Math.floor(changedAt.getTime() / 1000), changedAt)).toBe(false);
    expect(issuedBeforePasswordChange(changedAt.getTime() / 1000 + 5, changedAt)).toBe(false);
  });

  it('accepts everything when the password was never changed', () => {
    expect(issuedBeforePasswordChange(1, null)).toBe(false);
  });
});

describe('SUPPORT role', () => {
  const run = (method: string, role: string) => {
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();
    readOnlyForSupport({ method, admin: { role } } as any, res, next);
    return { res, next };
  };

  it('can read', () => {
    expect(run('GET', 'SUPPORT').next).toHaveBeenCalled();
  });

  it('cannot change the catalogue', () => {
    const { res, next } = run('POST', 'SUPPORT');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not limit full admins', () => {
    expect(run('DELETE', 'ADMIN').next).toHaveBeenCalled();
  });
});

describe('customer profile updates', () => {
  it('drops fields a customer must not set', () => {
    const parsed = updateCustomerProfileSchema.parse({
      name: 'Ama',
      active: true,
      emailVerified: true,
      passwordHash: 'x',
      googleId: 'g',
    });
    expect(parsed).toEqual({ name: 'Ama' });
  });
});
