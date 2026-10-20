import { PrismaClient, AdminRole, PaymentMethod, PaymentStatus, DeliveryStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Ghana storefront seed — phones and consumer electronics.
 *
 * Prices are in GHS (Ghanaian Cedi) at realistic Ghana retail levels.
 * Delivery fees/thresholds are GHS magnitudes, not the XAF values this seed
 * previously carried (a 2000 delivery fee would have been absurd in Cedis).
 */

const CURRENCY = 'GHS';

interface SeedVariant {
  name: string;
  sku?: string;
  price: number;
  comparePrice?: number;
  stock?: number;
  isPreorder?: boolean;
  optionValues?: Array<{ option: string; value: string }>;
}

/** Delivery zones applied to every product, so PDPs show real estimates. */
const STANDARD_ZONES = [
  { zoneName: 'Accra', zoneType: 'city', region: 'Greater Accra', minDays: 1, maxDays: 2, available: true },
  { zoneName: 'Tema', zoneType: 'city', region: 'Greater Accra', minDays: 1, maxDays: 2, available: true },
  { zoneName: 'Kumasi', zoneType: 'city', region: 'Ashanti', minDays: 2, maxDays: 3, available: true },
  { zoneName: 'Takoradi', zoneType: 'city', region: 'Western', minDays: 2, maxDays: 4, available: true },
  { zoneName: 'Tamale', zoneType: 'city', region: 'Northern', minDays: 3, maxDays: 5, available: true },
  { zoneName: 'National (All Ghana)', zoneType: 'country', minDays: 2, maxDays: 6, available: true },
];

async function main() {
  console.log('🌱 Starting database seed (Ghana / electronics)...\n');

  // ============================================
  // 1. Admin users
  // ============================================
  console.log('👤 Creating admin users...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@ecommerce.com' },
    update: {},
    create: {
      email: 'superadmin@ecommerce.com',
      passwordHash: superAdminPassword,
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      active: true,
    },
  });

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: AdminRole.ADMIN,
      active: true,
    },
  });

  console.log(`  ✓ Created super admin: ${superAdmin.email}`);
  console.log(`  ✓ Created admin: ${admin.email}`);

  // ============================================
  // 2. Categories
  // ============================================
  console.log('\n📁 Creating categories...');

  const mk = (
    name: string,
    slug: string,
    description: string,
    sortOrder: number,
    parentId?: string
  ) =>
    prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description, sortOrder, parentId, active: true },
    });

  const phones = await mk('Phones', 'phones', 'Smartphones and mobile devices', 1);
  const laptops = await mk('Laptops', 'laptops', 'Laptops and notebooks', 2);
  const tablets = await mk('Tablets', 'tablets', 'Tablets and e-readers', 3);
  const audio = await mk('Audio', 'audio', 'Headphones, earbuds and speakers', 4);
  const wearables = await mk('Wearables', 'wearables', 'Smartwatches and fitness trackers', 5);
  const accessories = await mk('Accessories', 'accessories', 'Chargers, cases and power banks', 6);

  // Sub-categories give the sidebar some depth.
  const android = await mk('Android Phones', 'android-phones', 'Android smartphones', 1, phones.id);
  const iphone = await mk('iPhone', 'iphone', 'Apple iPhone', 2, phones.id);

  console.log('  ✓ Created 8 categories');

  // ============================================
  // 3. Products
  // ============================================
  console.log('\n📦 Creating products...');

  const img = (slug: string, n: number, isPrimary = false) => ({
    url: `https://images.unsplash.com/photo-${slug}?w=800&q=80`,
    publicId: `products/${slug}-${n}`,
    isPrimary,
    sortOrder: n,
  });

  const products = [
    {
      name: 'iPhone 15 Pro Max 256GB',
      slug: 'iphone-15-pro-max-256gb',
      description:
        'Apple flagship with the A17 Pro chip, aerospace-grade titanium body and a 5x telephoto camera. Includes 1-year Apple warranty.',
      price: 18999,
      comparePrice: 20499,
      sku: 'APL-I15PM',
      stock: 14,
      categoryIds: [iphone.id, phones.id],
      featured: true,
      // Storage × colour matrix — the canonical phone-retail variant shape.
      variants: [
        {
          name: '256GB / Natural Titanium',
          sku: 'APL-I15PM-256-NT',
          price: 18999,
          comparePrice: 20499,
          stock: 6,
          optionValues: [
            { option: 'Storage', value: '256GB' },
            { option: 'Colour', value: 'Natural Titanium' },
          ],
        },
        {
          name: '256GB / Blue Titanium',
          sku: 'APL-I15PM-256-BT',
          price: 18999,
          comparePrice: 20499,
          stock: 4,
          optionValues: [
            { option: 'Storage', value: '256GB' },
            { option: 'Colour', value: 'Blue Titanium' },
          ],
        },
        {
          name: '512GB / Natural Titanium',
          sku: 'APL-I15PM-512-NT',
          price: 21499,
          stock: 3,
          optionValues: [
            { option: 'Storage', value: '512GB' },
            { option: 'Colour', value: 'Natural Titanium' },
          ],
        },
        {
          name: '1TB / Natural Titanium',
          sku: 'APL-I15PM-1TB-NT',
          price: 24999,
          stock: 1,
          optionValues: [
            { option: 'Storage', value: '1TB' },
            { option: 'Colour', value: 'Natural Titanium' },
          ],
        },
      ] as SeedVariant[],
      specifications: [
        { key: 'Storage', value: '256GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '8GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '6.7 inches', group: 'Display', sortOrder: 2 },
        { key: 'Resolution', value: '2796 x 1290', group: 'Display', sortOrder: 3 },
        { key: 'Chipset', value: 'Apple A17 Pro', group: 'Performance', sortOrder: 4 },
        { key: 'Main Camera', value: '48MP + 12MP + 12MP', group: 'Camera', sortOrder: 5 },
        { key: 'Battery', value: '4441 mAh', group: 'Power', sortOrder: 6 },
        { key: 'Network', value: '5G', group: 'Connectivity', sortOrder: 7 },
        { key: 'Colour', value: 'Natural Titanium', group: 'Design', sortOrder: 8 },
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      slug: 'samsung-galaxy-s24-ultra-512gb',
      description:
        'Galaxy AI flagship with a built-in S Pen, 200MP camera and a titanium frame. Two-year local warranty.',
      price: 17499,
      comparePrice: 19999,
      sku: 'SAM-S24U',
      stock: 9,
      categoryIds: [android.id, phones.id],
      featured: true,
      variants: [
        {
          name: '256GB / Titanium Black',
          sku: 'SAM-S24U-256-TB',
          price: 16499,
          comparePrice: 18999,
          stock: 5,
          optionValues: [
            { option: 'Storage', value: '256GB' },
            { option: 'Colour', value: 'Titanium Black' },
          ],
        },
        {
          name: '512GB / Titanium Black',
          sku: 'SAM-S24U-512-TB',
          price: 17499,
          comparePrice: 19999,
          stock: 3,
          optionValues: [
            { option: 'Storage', value: '512GB' },
            { option: 'Colour', value: 'Titanium Black' },
          ],
        },
        {
          name: '512GB / Titanium Violet',
          sku: 'SAM-S24U-512-TV',
          price: 17499,
          stock: 1,
          optionValues: [
            { option: 'Storage', value: '512GB' },
            { option: 'Colour', value: 'Titanium Violet' },
          ],
        },
      ] as SeedVariant[],
      specifications: [
        { key: 'Storage', value: '512GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '12GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '6.8 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'Snapdragon 8 Gen 3', group: 'Performance', sortOrder: 3 },
        { key: 'Main Camera', value: '200MP + 50MP + 12MP + 10MP', group: 'Camera', sortOrder: 4 },
        { key: 'Battery', value: '5000 mAh', group: 'Power', sortOrder: 5 },
        { key: 'Network', value: '5G', group: 'Connectivity', sortOrder: 6 },
        { key: 'S Pen', value: 'Included', group: 'Design', sortOrder: 7 },
      ],
    },
    {
      name: 'Google Pixel 8 Pro 128GB',
      slug: 'google-pixel-8-pro-128gb',
      description:
        'The best of Google AI with Magic Editor, Call Screen and seven years of OS updates.',
      price: 11499,
      comparePrice: 12999,
      sku: 'GOO-P8P-128',
      stock: 4,
      categoryIds: [android.id, phones.id],
      specifications: [
        { key: 'Storage', value: '128GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '12GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '6.7 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'Google Tensor G3', group: 'Performance', sortOrder: 3 },
        { key: 'Main Camera', value: '50MP + 48MP + 48MP', group: 'Camera', sortOrder: 4 },
        { key: 'Battery', value: '5050 mAh', group: 'Power', sortOrder: 5 },
        { key: 'Network', value: '5G', group: 'Connectivity', sortOrder: 6 },
      ],
    },
    {
      name: 'Tecno Camon 30 Pro 256GB',
      slug: 'tecno-camon-30-pro-256gb',
      description:
        'Popular mid-range camera phone built for African networks, with a 50MP selfie sensor and fast charging.',
      price: 3299,
      comparePrice: 3799,
      sku: 'TEC-C30P-256',
      stock: 40,
      categoryIds: [android.id, phones.id],
      specifications: [
        { key: 'Storage', value: '256GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '8GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '6.78 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'MediaTek Dimensity 8200', group: 'Performance', sortOrder: 3 },
        { key: 'Main Camera', value: '50MP OIS', group: 'Camera', sortOrder: 4 },
        { key: 'Battery', value: '5000 mAh', group: 'Power', sortOrder: 5 },
        { key: 'Network', value: '5G', group: 'Connectivity', sortOrder: 6 },
      ],
    },
    {
      name: 'Infinix Zero 30 5G 256GB',
      slug: 'infinix-zero-30-5g-256gb',
      description: 'Content-creator phone with 4K60 front video and a 144Hz AMOLED display.',
      price: 2899,
      sku: 'INF-Z30-256',
      stock: 33,
      categoryIds: [android.id, phones.id],
      specifications: [
        { key: 'Storage', value: '256GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '12GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '6.78 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'MediaTek Dimensity 8020', group: 'Performance', sortOrder: 3 },
        { key: 'Main Camera', value: '108MP OIS', group: 'Camera', sortOrder: 4 },
        { key: 'Battery', value: '5000 mAh', group: 'Power', sortOrder: 5 },
        { key: 'Network', value: '5G', group: 'Connectivity', sortOrder: 6 },
      ],
    },
    {
      name: 'Samsung Galaxy A15 128GB',
      slug: 'samsung-galaxy-a15-128gb',
      description: 'Reliable everyday Samsung with a Super AMOLED screen and two-day battery life.',
      price: 1849,
      comparePrice: 2099,
      sku: 'SAM-A15-128',
      stock: 52,
      categoryIds: [android.id, phones.id],
      specifications: [
        { key: 'Storage', value: '128GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '6GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '6.5 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'MediaTek Helio G99', group: 'Performance', sortOrder: 3 },
        { key: 'Main Camera', value: '50MP', group: 'Camera', sortOrder: 4 },
        { key: 'Battery', value: '5000 mAh', group: 'Power', sortOrder: 5 },
      ],
    },
    {
      name: 'MacBook Air 13" M3 256GB',
      slug: 'macbook-air-13-m3-256gb',
      description: 'Apple M3 in a fanless 1.24kg chassis with up to 18 hours of battery life.',
      price: 21499,
      sku: 'APL-MBA13-M3',
      stock: 6,
      categoryIds: [laptops.id],
      featured: true,
      specifications: [
        { key: 'Storage', value: '256GB SSD', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '8GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '13.6 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'Apple M3', group: 'Performance', sortOrder: 3 },
        { key: 'Battery', value: 'Up to 18 hours', group: 'Power', sortOrder: 4 },
        { key: 'Weight', value: '1.24 kg', group: 'Design', sortOrder: 5 },
      ],
    },
    {
      name: 'HP Pavilion 15 Core i5 512GB',
      slug: 'hp-pavilion-15-i5-512gb',
      description: 'Dependable everyday laptop for study and office work, with a full-size keyboard.',
      price: 8499,
      comparePrice: 9499,
      sku: 'HP-PAV15-512',
      stock: 11,
      categoryIds: [laptops.id],
      specifications: [
        { key: 'Storage', value: '512GB SSD', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '16GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '15.6 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'Intel Core i5-1335U', group: 'Performance', sortOrder: 3 },
        { key: 'Battery', value: 'Up to 8 hours', group: 'Power', sortOrder: 4 },
      ],
    },
    {
      name: 'iPad Air 11" M2 128GB',
      slug: 'ipad-air-11-m2-128gb',
      description: 'M2-powered iPad Air with Apple Pencil Pro support — great for notes and design.',
      price: 9799,
      sku: 'APL-IPADAIR-128',
      stock: 8,
      categoryIds: [tablets.id],
      specifications: [
        { key: 'Storage', value: '128GB', group: 'Memory', sortOrder: 0 },
        { key: 'RAM', value: '8GB', group: 'Memory', sortOrder: 1 },
        { key: 'Screen Size', value: '11 inches', group: 'Display', sortOrder: 2 },
        { key: 'Chipset', value: 'Apple M2', group: 'Performance', sortOrder: 3 },
        { key: 'Battery', value: 'Up to 10 hours', group: 'Power', sortOrder: 4 },
      ],
    },
    {
      name: 'Sony WH-1000XM5 Headphones',
      slug: 'sony-wh-1000xm5',
      description: 'Reference noise cancelling over-ears with 30-hour battery and multipoint pairing.',
      price: 4299,
      comparePrice: 4899,
      sku: 'SON-XM5-BLK',
      stock: 17,
      categoryIds: [audio.id],
      specifications: [
        { key: 'Battery', value: '30 hours', group: 'Power', sortOrder: 0 },
        { key: 'Noise Cancelling', value: 'Adaptive ANC', group: 'Audio', sortOrder: 1 },
        { key: 'Connectivity', value: 'Bluetooth 5.2', group: 'Connectivity', sortOrder: 2 },
        { key: 'Weight', value: '250 g', group: 'Design', sortOrder: 3 },
      ],
    },
    {
      name: 'Apple AirPods Pro (2nd gen)',
      slug: 'apple-airpods-pro-2',
      description: 'Active noise cancellation with Adaptive Audio and a USB-C charging case.',
      price: 2799,
      sku: 'APL-APP2-USBC',
      stock: 0,
      categoryIds: [audio.id],
      specifications: [
        { key: 'Battery', value: '6 hours (30 with case)', group: 'Power', sortOrder: 0 },
        { key: 'Noise Cancelling', value: 'Active ANC', group: 'Audio', sortOrder: 1 },
        { key: 'Connectivity', value: 'Bluetooth 5.3', group: 'Connectivity', sortOrder: 2 },
      ],
    },
    {
      name: 'Samsung Galaxy Watch 6 Classic 47mm',
      slug: 'samsung-galaxy-watch-6-classic-47mm',
      description:
        'Rotating-bezel smartwatch with body composition and sleep coaching. Pre-order now for the next shipment.',
      price: 3499,
      sku: 'SAM-GW6C-47',
      stock: 0,
      isPreorder: true,
      preorderNote: 'Ships in 2–3 weeks',
      categoryIds: [wearables.id],
      specifications: [
        { key: 'Screen Size', value: '1.5 inches', group: 'Display', sortOrder: 0 },
        { key: 'Battery', value: '425 mAh', group: 'Power', sortOrder: 1 },
        { key: 'Water Resistance', value: '5ATM + IP68', group: 'Design', sortOrder: 2 },
      ],
    },
    {
      name: 'Anker 20,000mAh Power Bank',
      slug: 'anker-20000mah-power-bank',
      description: '65W USB-C power delivery — charges a laptop and a phone at the same time.',
      price: 549,
      comparePrice: 699,
      sku: 'ANK-PB20K-65W',
      stock: 75,
      categoryIds: [accessories.id],
      specifications: [
        { key: 'Capacity', value: '20000 mAh', group: 'Power', sortOrder: 0 },
        { key: 'Output', value: '65W USB-C PD', group: 'Power', sortOrder: 1 },
        { key: 'Weight', value: '430 g', group: 'Design', sortOrder: 2 },
      ],
    },
  ];

  for (const productData of products) {
    const { categoryIds, specifications, variants: _variants, ...rest } = productData as typeof productData & { variants?: SeedVariant[] };

    const createdProduct = await prisma.product.upsert({
      where: { slug: rest.slug },
      update: {},
      create: {
        ...rest,
        currency: CURRENCY,
        lowStockThreshold: 5,
        active: true,
      },
    });

    for (let i = 0; i < categoryIds.length; i++) {
      await prisma.productCategory.create({
        data: { productId: createdProduct.id, categoryId: categoryIds[i], sortOrder: i },
      });
    }

    // Placeholder art until real product photography is uploaded via the admin
    // media manager — pointing at per-product files that don't exist yet would
    // render as broken images across the storefront.
    await prisma.productImage.create({
      data: {
        productId: createdProduct.id,
        url: '/images/product-placeholder.svg',
        publicId: `products/${rest.slug}`,
        alt: rest.name,
        isPrimary: true,
        sortOrder: 0,
      },
    });

    for (const spec of specifications) {
      await prisma.productSpecification.create({
        data: { ...spec, productId: createdProduct.id },
      });
    }

    for (const zone of STANDARD_ZONES) {
      await prisma.productDeliveryZone.create({
        data: { ...zone, productId: createdProduct.id },
      });
    }

    // Variants. Products that declare storage/colour axes get a real matrix;
    // everything else gets a single synthesised "Default" variant so cart and
    // checkout always operate on a variant row.
    const variantInputs =
      (productData as { variants?: SeedVariant[] }).variants ?? [
        {
          name: 'Default',
          sku: rest.sku,
          price: rest.price,
          comparePrice: rest.comparePrice,
          stock: rest.stock,
          isPreorder: rest.isPreorder ?? false,
        },
      ];

    const optionNames: string[] = [];
    for (const v of variantInputs) {
      for (const ov of v.optionValues ?? []) {
        if (!optionNames.includes(ov.option)) optionNames.push(ov.option);
      }
    }

    const optionValueIds = new Map<string, string>();
    for (const [oi, optionName] of optionNames.entries()) {
      const option = await prisma.productOption.create({
        data: { productId: createdProduct.id, name: optionName, sortOrder: oi },
      });
      const values = Array.from(
        new Set(
          variantInputs.flatMap((v) =>
            (v.optionValues ?? []).filter((o) => o.option === optionName).map((o) => o.value)
          )
        )
      );
      for (const [vi, value] of values.entries()) {
        const created = await prisma.productOptionValue.create({
          data: { optionId: option.id, value, sortOrder: vi },
        });
        optionValueIds.set(`${optionName}::${value}`, created.id);
      }
    }

    for (const [vi, v] of variantInputs.entries()) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: createdProduct.id,
          name: v.name,
          sku: v.sku ?? null,
          price: v.price,
          comparePrice: v.comparePrice,
          stock: v.stock ?? 0,
          lowStockThreshold: 5,
          isPreorder: v.isPreorder ?? false,
          isDefault: vi === 0,
          active: true,
          sortOrder: vi,
        },
      });

      for (const ov of v.optionValues ?? []) {
        const ovId = optionValueIds.get(`${ov.option}::${ov.value}`);
        if (ovId) {
          await prisma.productVariantOption.create({
            data: { variantId: variant.id, optionValueId: ovId },
          });
        }
      }
    }

    // price/stock on Product are rollups over the variants.
    const allVariants = await prisma.productVariant.findMany({
      where: { productId: createdProduct.id, active: true },
      select: { price: true, stock: true },
    });
    if (allVariants.length > 0) {
      const minPrice = allVariants.reduce(
        (m, v) => (v.price.lessThan(m) ? v.price : m),
        allVariants[0].price
      );
      await prisma.product.update({
        where: { id: createdProduct.id },
        data: {
          price: minPrice,
          stock: allVariants.reduce((sum, v) => sum + v.stock, 0),
        },
      });
    }
  }

  console.log(`  ✓ Created ${products.length} products with specs and delivery zones`);

  // ============================================
  // 4. Couriers
  // ============================================
  console.log('\n🚚 Creating couriers...');

  const couriers = [
    { name: 'Kwame Mensah', phone: '+233244000001', email: 'kwame.mensah@delivery.com.gh' },
    { name: 'Ama Owusu', phone: '+233244000002', email: 'ama.owusu@delivery.com.gh' },
    { name: 'Kofi Boateng', phone: '+233551000003', email: 'kofi.boateng@delivery.com.gh' },
  ];

  for (const courier of couriers) {
    await prisma.courier.create({ data: courier });
  }

  console.log(`  ✓ Created ${couriers.length} couriers`);

  // ============================================
  // 5. Application settings
  // ============================================
  console.log('\n⚙️  Creating application settings...');

  const settings = [
    {
      key: 'store_info',
      value: {
        name: 'TechHub Ghana',
        address: 'Oxford Street, Osu',
        city: 'Accra',
        country: 'Ghana',
        phone: '+233302000000',
        email: 'support@techhub.com.gh',
        whatsapp: '+233244000000',
      },
    },
    {
      key: 'payment_methods_enabled',
      value: {
        momo: true,
        cod: true,
        // Only MTN has a live integration; the others are listed in the schema
        // but payment.service rejects them until an aggregator is wired up.
        momo_providers: ['MTN_MOMO'],
      },
    },
    {
      key: 'delivery_settings',
      value: {
        default_fee: 30,
        free_delivery_threshold: 2000,
        estimated_days_min: 1,
        estimated_days_max: 5,
        delivery_zones: ['Accra', 'Tema', 'Kumasi', 'Takoradi', 'Tamale'],
      },
    },
    {
      key: 'notification_settings',
      value: {
        admin_email: 'admin@ecommerce.com',
        admin_whatsapp: '+233244000000',
        send_order_confirmation_sms: true,
        send_delivery_updates_sms: true,
        send_order_confirmation_email: true,
      },
    },
    {
      key: 'currency_settings',
      value: {
        default_currency: CURRENCY,
        currency_symbol: 'GH₵',
        decimal_places: 2,
      },
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log(`  ✓ Created ${settings.length} settings`);

  // ============================================
  // 6. Sample orders
  // ============================================
  console.log('\n🛒 Creating sample orders...');

  const sampleProducts = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    take: 2,
  });

  const orderSeeds = [
    {
      orderNumber: 'ORD-20260101-001',
      customerName: 'Akosua Danso',
      customerPhone: '+233244123456',
      customerEmail: 'akosua.danso@example.com',
      customerAddress: '12 Independence Avenue',
      customerCity: 'Accra',
      customerRegion: 'Greater Accra',
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.PAID,
      deliveryStatus: DeliveryStatus.DELIVERED,
      product: sampleProducts[0],
      quantity: 1,
    },
    {
      orderNumber: 'ORD-20260101-002',
      customerName: 'Yaw Antwi',
      customerPhone: '+233551234567',
      customerEmail: 'yaw.antwi@example.com',
      customerAddress: '45 Prempeh II Street',
      customerCity: 'Kumasi',
      customerRegion: 'Ashanti',
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      deliveryStatus: DeliveryStatus.IN_TRANSIT,
      product: sampleProducts[1],
      quantity: 2,
    },
  ];

  const allCouriers = await prisma.courier.findMany();

  for (const [i, o] of orderSeeds.entries()) {
    if (!o.product) continue;

    const unitPrice = Number(o.product.price);
    const subtotal = unitPrice * o.quantity;
    const deliveryFee = subtotal >= 2000 ? 0 : 30;
    const total = subtotal + deliveryFee;

    const order = await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerAddress: o.customerAddress,
        customerCity: o.customerCity,
        customerRegion: o.customerRegion,
        itemsSnapshot: [
          {
            productId: o.product.id,
            name: o.product.name,
            price: unitPrice,
            quantity: o.quantity,
          },
        ],
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        deliveryStatus: o.deliveryStatus,
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        currency: CURRENCY,
        supplierCount: 1,
      },
    });

    // OrderItems drive the multi-supplier fulfilment and payout flows; the
    // previous seed omitted them entirely, leaving those paths untested.
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: o.product.id,
        productName: o.product.name,
        productSku: o.product.sku,
        unitPrice,
        quantity: o.quantity,
        totalPrice: subtotal,
        currency: CURRENCY,
        fulfillmentStatus: o.deliveryStatus === DeliveryStatus.DELIVERED ? 'DELIVERED' : 'SHIPPED',
        deliveredAt: o.deliveryStatus === DeliveryStatus.DELIVERED ? new Date() : null,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: o.paymentMethod,
        provider: o.paymentMethod === PaymentMethod.MOMO ? 'MTN_MOMO' : null,
        amount: total,
        currency: CURRENCY,
        status: o.paymentStatus,
        phoneNumber: o.paymentMethod === PaymentMethod.MOMO ? o.customerPhone : null,
        paidAt: o.paymentStatus === PaymentStatus.PAID ? new Date() : null,
      },
    });

    await prisma.delivery.create({
      data: {
        orderId: order.id,
        courierId: allCouriers[i % allCouriers.length]?.id,
        status: o.deliveryStatus,
        trackingNumber: `TRK-${o.orderNumber}`,
        assignedAt: new Date(),
        pickedUpAt: new Date(),
        deliveredAt: o.deliveryStatus === DeliveryStatus.DELIVERED ? new Date() : null,
      },
    });
  }

  console.log(`  ✓ Created ${orderSeeds.length} sample orders`);

  // ============================================
  // 7. Inventory logs
  // ============================================
  console.log('\n📋 Creating sample inventory logs...');

  const logProducts = await prisma.product.findMany({ take: 3 });

  for (const p of logProducts) {
    await prisma.inventoryLog.create({
      data: {
        productId: p.id,
        productName: p.name,
        previousStock: p.stock + 10,
        newStock: p.stock,
        change: -10,
        reason: 'SALE',
        referenceType: 'ORDER',
      },
    });
  }

  console.log(`  ✓ Created ${logProducts.length} inventory log entries`);

  console.log('\n✅ Database seed completed successfully!\n');
  console.log('📝 Summary:');
  console.log('   - 2 Admin users (superadmin@ecommerce.com / admin@ecommerce.com)');
  console.log('   - 8 Categories (Phones, Laptops, Tablets, Audio, Wearables, Accessories + 2 sub)');
  console.log(`   - ${products.length} Products (GHS pricing, specs, delivery zones)`);
  console.log('   - 3 Couriers (Ghana)');
  console.log('   - 5 Application settings (GHS, Ghana zones, MTN MoMo)');
  console.log('   - 2 Sample orders with order items');
  console.log('   - 3 Inventory log entries\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
