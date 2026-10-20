import { Prisma } from '@prisma/client';
import config from '../../config';
import { slugify } from '../../utils/helpers';
import { settingsService } from '../settings/settings.service';
import prisma from '../../config/database';

/**
 * Shared write logic for products.
 *
 * The admin service and the supplier portal both create and update products,
 * and previously each carried its own near-identical copy of the nested
 * category/image/specification/delivery-zone handling. They had already
 * drifted (the supplier copy hardcoded a currency and omitted delivery zones),
 * so variant support is implemented here once rather than twice.
 */

export interface ProductImageInput {
  url: string;
  publicId: string;
  alt?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ProductSpecificationInput {
  key: string;
  value: string;
  group?: string;
  sortOrder?: number;
}

export interface ProductDeliveryZoneInput {
  zoneName: string;
  zoneType?: string;
  region?: string;
  minDays: number;
  maxDays: number;
  deliveryFee?: number;
  available?: boolean;
  notes?: string;
}

export interface ProductVariantInput {
  id?: string;
  name: string;
  sku?: string;
  price: number;
  comparePrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  isPreorder?: boolean;
  active?: boolean;
  sortOrder?: number;
  /** Option values this variant represents, e.g. ["256GB", "Graphite"]. */
  optionValues?: Array<{ option: string; value: string }>;
}

export interface ProductWriteData {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  comparePrice?: number;
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  supplierId?: string | null;
  isPreorder?: boolean;
  preorderNote?: string;
  categoryIds?: string[];
  images?: ProductImageInput[];
  specifications?: ProductSpecificationInput[];
  deliveryZones?: ProductDeliveryZoneInput[];
  variants?: ProductVariantInput[];
  active?: boolean;
  featured?: boolean;
}

/** Everything the storefront and admin UI need for a single product. */
export const PRODUCT_DETAIL_INCLUDE = {
  categories: { include: { category: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  specifications: { orderBy: { sortOrder: 'asc' } },
  deliveryZones: { orderBy: { zoneName: 'asc' } },
  options: {
    orderBy: { sortOrder: 'asc' },
    include: { values: { orderBy: { sortOrder: 'asc' } } },
  },
  variants: {
    orderBy: { sortOrder: 'asc' },
    include: { options: { include: { optionValue: { include: { option: true } } } } },
  },
} satisfies Prisma.ProductInclude;

/**
 * Resolve a unique slug, throwing if it collides with a different product.
 */
export async function resolveSlug(
  name: string | undefined,
  requestedSlug: string | undefined,
  currentProductId?: string
): Promise<string | undefined> {
  let slug = requestedSlug;
  if (name && !requestedSlug) {
    slug = slugify(name);
  }
  if (!slug) return undefined;

  const clash = await prisma.product.findFirst({
    where: {
      slug,
      ...(currentProductId ? { NOT: { id: currentProductId } } : {}),
    },
    select: { id: true },
  });

  if (clash) {
    throw new Error('A product with this slug already exists');
  }

  return slug;
}

/**
 * Recompute a product's denormalised price/stock rollups from its variants.
 *
 * `Product.price` and `Product.stock` remain the columns the catalogue filters
 * and sorts on, but with variants they are derived values: price is the
 * cheapest active variant ("from GH₵X") and stock is the sum across variants.
 * Must be called inside the same transaction as any variant mutation, and
 * after the stock decrement at checkout, or listings drift from reality.
 */
export async function recalcProductRollup(
  productId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  const variants = await tx.productVariant.findMany({
    where: { productId, active: true },
    select: { price: true, stock: true },
  });

  if (variants.length === 0) return;

  const minPrice = variants.reduce(
    (min, v) => (v.price.lessThan(min) ? v.price : min),
    variants[0].price
  );
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  await tx.product.update({
    where: { id: productId },
    data: { price: minPrice, stock: totalStock },
  });
}

/**
 * Replace a product's variants (and their option axes) wholesale.
 *
 * Products with no explicit variants get a single default variant synthesised
 * from the product-level price/stock/SKU. That keeps one code path everywhere
 * downstream — cart, checkout and stock decrement always operate on a variant
 * row, with no "simple product" branch to forget.
 */
export async function writeVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  data: {
    variants?: ProductVariantInput[];
    price: number;
    comparePrice?: number;
    sku?: string;
    stock?: number;
    lowStockThreshold?: number;
    isPreorder?: boolean;
  }
): Promise<void> {
  const inputs: ProductVariantInput[] =
    data.variants && data.variants.length > 0
      ? data.variants
      : [
          {
            name: 'Default',
            sku: data.sku,
            price: data.price,
            comparePrice: data.comparePrice,
            stock: data.stock ?? 0,
            lowStockThreshold: data.lowStockThreshold ?? 5,
            isPreorder: data.isPreorder ?? false,
            active: true,
            sortOrder: 0,
          },
        ];

  // Clear existing structure. Variant rows are referenced by CartItem, so this
  // is only safe because carts snapshot name/price and are revalidated at
  // checkout; the FK is restrict-on-delete for OrderItem which keeps history.
  await tx.productVariantOption.deleteMany({
    where: { variant: { productId } },
  });
  await tx.cartItem.deleteMany({ where: { variant: { productId } } });
  await tx.productVariant.deleteMany({ where: { productId } });
  await tx.productOptionValue.deleteMany({ where: { option: { productId } } });
  await tx.productOption.deleteMany({ where: { productId } });

  // Recreate option axes from the distinct axes named across the variants.
  const optionNames: string[] = [];
  for (const v of inputs) {
    for (const ov of v.optionValues ?? []) {
      if (!optionNames.includes(ov.option)) optionNames.push(ov.option);
    }
  }

  const optionValueIds = new Map<string, string>(); // `${option}::${value}` -> id

  for (const [i, optionName] of optionNames.entries()) {
    const values = Array.from(
      new Set(
        inputs.flatMap((v) =>
          (v.optionValues ?? [])
            .filter((ov) => ov.option === optionName)
            .map((ov) => ov.value)
        )
      )
    );

    const option = await tx.productOption.create({
      data: { productId, name: optionName, sortOrder: i },
    });

    for (const [j, value] of values.entries()) {
      const created = await tx.productOptionValue.create({
        data: { optionId: option.id, value, sortOrder: j },
      });
      optionValueIds.set(`${optionName}::${value}`, created.id);
    }
  }

  for (const [i, v] of inputs.entries()) {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: v.name,
        sku: v.sku || null,
        price: v.price,
        comparePrice: v.comparePrice,
        stock: v.stock ?? 0,
        lowStockThreshold: v.lowStockThreshold ?? 5,
        isPreorder: v.isPreorder ?? false,
        active: v.active ?? true,
        isDefault: i === 0,
        sortOrder: v.sortOrder ?? i,
      },
    });

    for (const ov of v.optionValues ?? []) {
      const optionValueId = optionValueIds.get(`${ov.option}::${ov.value}`);
      if (optionValueId) {
        await tx.productVariantOption.create({
          data: { variantId: variant.id, optionValueId },
        });
      }
    }
  }
}

/**
 * Replace the nested collections that both write paths manage identically.
 * Each collection is only touched when the caller supplied it, so partial
 * updates don't wipe data the client didn't send.
 */
export async function writeNestedCollections(
  tx: Prisma.TransactionClient,
  productId: string,
  data: Pick<ProductWriteData, 'categoryIds' | 'images' | 'specifications' | 'deliveryZones'>
): Promise<void> {
  if (data.categoryIds !== undefined) {
    await tx.productCategory.deleteMany({ where: { productId } });
    if (data.categoryIds.length > 0) {
      await tx.productCategory.createMany({
        data: data.categoryIds.map((categoryId, index) => ({
          productId,
          categoryId,
          sortOrder: index,
        })),
      });
    }
  }

  if (data.images !== undefined) {
    await tx.productImage.deleteMany({ where: { productId } });
    if (data.images.length > 0) {
      await tx.productImage.createMany({
        data: data.images.map((image, index) => ({
          productId,
          url: image.url,
          publicId: image.publicId,
          alt: image.alt,
          sortOrder: image.sortOrder ?? index,
          isPrimary: image.isPrimary ?? index === 0,
        })),
      });
    }
  }

  if (data.specifications !== undefined) {
    await tx.productSpecification.deleteMany({ where: { productId } });
    if (data.specifications.length > 0) {
      await tx.productSpecification.createMany({
        data: data.specifications.map((spec, index) => ({
          productId,
          key: spec.key,
          value: spec.value,
          group: spec.group,
          sortOrder: spec.sortOrder ?? index,
        })),
      });
    }
  }

  if (data.deliveryZones !== undefined) {
    await tx.productDeliveryZone.deleteMany({ where: { productId } });
    if (data.deliveryZones.length > 0) {
      await tx.productDeliveryZone.createMany({
        data: data.deliveryZones.map((zone) => ({
          productId,
          zoneName: zone.zoneName,
          zoneType: zone.zoneType || 'city',
          region: zone.region,
          minDays: zone.minDays,
          maxDays: zone.maxDays,
          deliveryFee: zone.deliveryFee,
          available: zone.available ?? true,
          notes: zone.notes,
        })),
      });
    }
  }
}

/**
 * Create a product with all of its nested structure, including variants.
 * `defaults` lets the supplier portal force its own rules (supplierId, and
 * products starting inactive pending approval) without duplicating the body.
 */
export async function createProductCore(
  data: ProductWriteData,
  defaults: { supplierId?: string | null; active?: boolean } = {}
) {
  const slug = await resolveSlug(data.name, data.slug);

  return prisma.$transaction(
    async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          slug: slug!,
          description: data.description,
          price: data.price,
          currency: data.currency || (await settingsService.getDefaultCurrency()),
          comparePrice: data.comparePrice,
          sku: data.sku,
          stock: data.stock ?? 0,
          lowStockThreshold: data.lowStockThreshold ?? 5,
          active: defaults.active ?? data.active ?? true,
          featured: data.featured ?? false,
          supplierId: defaults.supplierId !== undefined ? defaults.supplierId : data.supplierId ?? null,
          isPreorder: data.isPreorder ?? false,
          preorderNote: data.preorderNote,
        },
      });

      await writeNestedCollections(tx, product.id, data);
      await writeVariants(tx, product.id, data);
      await recalcProductRollup(product.id, tx);

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: PRODUCT_DETAIL_INCLUDE,
      });
    },
    { timeout: 30000 }
  );
}

/**
 * Update a product and any nested structure the caller supplied.
 */
export async function updateProductCore(
  productId: string,
  data: Partial<ProductWriteData>,
  existing: { slug: string; price: Prisma.Decimal; stock: number; sku: string | null }
) {
  const slug = await resolveSlug(data.name, data.slug, productId);

  return prisma.$transaction(
    async (tx) => {
      await writeNestedCollections(tx, productId, data);

      // Only rebuild variants when the caller sent them, or when the
      // product-level price/stock changed and the product has no explicit
      // variants (so the synthesised default stays in step).
      const hasExplicitVariants = await tx.productVariant.count({
        where: { productId, name: { not: 'Default' } },
      });

      if (data.variants !== undefined || (!hasExplicitVariants && (data.price !== undefined || data.stock !== undefined))) {
        await writeVariants(tx, productId, {
          variants: data.variants,
          price: data.price ?? Number(existing.price),
          comparePrice: data.comparePrice,
          sku: data.sku ?? existing.sku ?? undefined,
          stock: data.stock ?? existing.stock,
          lowStockThreshold: data.lowStockThreshold,
          isPreorder: data.isPreorder,
        });
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          slug,
          description: data.description,
          currency: data.currency,
          comparePrice: data.comparePrice,
          sku: data.sku,
          lowStockThreshold: data.lowStockThreshold,
          active: data.active,
          featured: data.featured,
          ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
          ...(data.isPreorder !== undefined && { isPreorder: data.isPreorder }),
          ...(data.preorderNote !== undefined && { preorderNote: data.preorderNote }),
        },
      });

      // price/stock are rollups — set from variants, never straight from input.
      await recalcProductRollup(productId, tx);

      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: PRODUCT_DETAIL_INCLUDE,
      });
    },
    { timeout: 30000 }
  );
}
