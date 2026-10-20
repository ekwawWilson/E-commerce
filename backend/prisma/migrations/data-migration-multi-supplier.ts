/**
 * Data Migration Script for Multi-Supplier Support
 *
 * This script should be run after the Prisma migration is applied.
 * It creates a default platform supplier and assigns existing products to it (optional).
 *
 * Run with: npx tsx prisma/migrations/data-migration-multi-supplier.ts
 */

import { PrismaClient, SupplierStatus, SupplierRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting multi-supplier data migration...');

  // Check if a platform supplier already exists
  const existingPlatformSupplier = await prisma.supplier.findFirst({
    where: { slug: 'platform-store' },
  });

  let platformSupplierId: string;

  if (existingPlatformSupplier) {
    console.log('Platform supplier already exists, skipping creation.');
    platformSupplierId = existingPlatformSupplier.id;
  } else {
    // Create a default platform supplier for existing products (optional)
    console.log('Creating platform supplier...');

    const platformSupplier = await prisma.supplier.create({
      data: {
        businessName: 'Platform Store',
        slug: 'platform-store',
        email: 'platform@example.com',
        description: 'Official platform store for marketplace products',
        status: SupplierStatus.ACTIVE,
        commissionRate: 0, // Platform doesn't pay commission to itself
        verified: true,
      },
    });

    platformSupplierId = platformSupplier.id;
    console.log(`Created platform supplier with ID: ${platformSupplierId}`);

    // Create a platform supplier admin
    const hashedPassword = await bcrypt.hash('platform-admin-password', 12);

    await prisma.supplierAdmin.create({
      data: {
        supplierId: platformSupplierId,
        email: 'platform-admin@example.com',
        name: 'Platform Admin',
        passwordHash: hashedPassword,
        role: SupplierRole.OWNER,
        active: true,
      },
    });

    console.log('Created platform supplier admin');
  }

  // Option 1: Assign all existing products to platform supplier
  // Uncomment this section if you want existing products to belong to the platform
  /*
  const productsWithoutSupplier = await prisma.product.count({
    where: { supplierId: null },
  });

  if (productsWithoutSupplier > 0) {
    console.log(`Assigning ${productsWithoutSupplier} products to platform supplier...`);

    await prisma.product.updateMany({
      where: { supplierId: null },
      data: { supplierId: platformSupplierId },
    });

    console.log('Products assigned successfully');
  }
  */

  // Option 2: Leave existing products without a supplier (multi-supplier ready)
  // Products without a supplier are treated as "platform" products
  const productsWithoutSupplier = await prisma.product.count({
    where: { supplierId: null },
  });

  if (productsWithoutSupplier > 0) {
    console.log(`Note: ${productsWithoutSupplier} products have no supplier assigned.`);
    console.log('These products will be treated as platform products.');
    console.log('You can assign them to suppliers later through the admin panel.');
  }

  // Create OrderItems for existing orders (migration)
  const ordersWithoutItems = await prisma.order.findMany({
    where: {
      items: { none: {} },
    },
    select: {
      id: true,
      itemsSnapshot: true,
    },
  });

  if (ordersWithoutItems.length > 0) {
    console.log(`Creating OrderItems for ${ordersWithoutItems.length} existing orders...`);

    for (const order of ordersWithoutItems) {
      const snapshot = order.itemsSnapshot as Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
      }>;

      if (!Array.isArray(snapshot)) continue;

      for (const item of snapshot) {
        // Get product's supplier if it exists
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { supplierId: true },
        });

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            supplierId: product?.supplierId || null,
            productName: item.name,
            productPrice: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
            commission: 0, // Historical orders have no commission
            currency: 'XAF',
            fulfillmentStatus: 'DELIVERED', // Assume existing orders are fulfilled
          },
        });
      }
    }

    console.log('OrderItems created successfully');
  }

  console.log('Multi-supplier data migration completed!');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
