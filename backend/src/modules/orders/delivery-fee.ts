import { AppError } from '../../middleware/errorHandler';

export interface DeliveryZoneRule {
  zoneName: string;
  zoneType: string; // "city" | "region" | "country" | "international"
  region: string | null;
  deliveryFee: unknown; // Prisma Decimal or null
  available: boolean;
}

export interface DeliveryFeeItem {
  label: string;
  supplierId: string | null;
  deliveryZones: DeliveryZoneRule[];
}

export interface DeliveryDestination {
  city: string;
  region?: string | null;
}

export interface DeliverySettingsInput {
  default_fee: number;
  free_delivery_threshold: number;
}

const same = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Pick the most specific zone that covers the destination: city, then region,
 * then a country-wide zone. Returns null when the product has no matching zone.
 */
export function matchDeliveryZone(
  zones: DeliveryZoneRule[],
  destination: DeliveryDestination
): DeliveryZoneRule | null {
  const city = zones.find((z) => z.zoneType === 'city' && same(z.zoneName, destination.city));
  if (city) return city;

  const region = zones.find(
    (z) =>
      z.zoneType === 'region' &&
      (same(z.zoneName, destination.region) || same(z.region, destination.region))
  );
  if (region) return region;

  return zones.find((z) => z.zoneType === 'country') ?? null;
}

/**
 * Delivery fee for an order.
 *
 * Each supplier ships its own items, so the fee is charged per supplier: the
 * highest applicable fee among that supplier's items. An item's fee is its
 * matching zone's fee, or the store default when the product has no zones or
 * the zone has no fee. A product whose matching zone is marked unavailable
 * can't be delivered there. Orders at or above the free-delivery threshold
 * (after discounts) ship free.
 */
export function calculateOrderDeliveryFee(
  items: DeliveryFeeItem[],
  destination: DeliveryDestination,
  settings: DeliverySettingsInput,
  discountedSubtotal: number
): number {
  const feeBySupplier = new Map<string, number>();

  for (const item of items) {
    let fee = settings.default_fee;

    if (item.deliveryZones.length > 0) {
      const zone = matchDeliveryZone(item.deliveryZones, destination);

      if (zone && !zone.available) {
        throw new AppError(
          `${item.label} can't be delivered to ${destination.city}`,
          400
        );
      }

      if (zone && zone.deliveryFee !== null && zone.deliveryFee !== undefined) {
        fee = Number(zone.deliveryFee);
      }
    }

    const key = item.supplierId ?? 'platform';
    feeBySupplier.set(key, Math.max(feeBySupplier.get(key) ?? 0, fee));
  }

  if (discountedSubtotal >= settings.free_delivery_threshold) {
    return 0;
  }

  let total = 0;
  for (const fee of feeBySupplier.values()) total += fee;
  return Math.round(total * 100) / 100;
}
