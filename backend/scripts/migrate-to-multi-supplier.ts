import { PrismaClient, SupplierStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface OrderItemSnapshot {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sku?: string;
}

async function main() {
  console.log('Starting multi-supplier data migration...\n');

  // 1. Create default platform supplier for existing products
  let platformSupplier = await prisma.supplier.findFirst({
    where: { slug: 'platform-store' },
  });

  if (!platformSupplier) {
    console.log('Creating default platform supplier...');
    platformSupplier = await prisma.supplier.create({
      data: {
        name: 'Platform Store',
        slug: 'platform-store',
        email: 'store@platform.com',
        phone: '+237600000000',
        businessAddress: 'Platform HQ',
        city: 'Douala',
        region: 'Littoral',
        description: 'Default platform store for legacy products',
        status: SupplierStatus.ACTIVE,
        verified: true,
        verifiedAt: new Date(),
        commissionRate: 0, // No commission for platform's own products
      },
    });
    console.log(`Created platform supplier: ${platformSupplier.id}\n`);
  } else {
    console.log(`Platform supplier already exists: ${platformSupplier.id}\n`);
  }

  // 2. Assign existing products to platform supplier
  const unassignedProducts = await prisma.product.findMany({
    where: { supplierId: null },
  });

  if (unassignedProducts.length > 0) {
    console.log(`Assigning ${unassignedProducts.length} products to platform supplier...`);
    await prisma.product.updateMany({
      where: { supplierId: null },
      data: { supplierId: platformSupplier.id },
    });
    console.log('Products assigned successfully.\n');
  } else {
    console.log('All products already have suppliers assigned.\n');
  }

  // 3. Create order items from existing orders
  const orders = await prisma.order.findMany({
    include: {
      items: true,
    },
  });

  let createdItemsCount = 0;

  for (const order of orders) {
    // Skip if order already has items
    if (order.items.length > 0) {
      console.log(`Order ${order.orderNumber} already has ${order.items.length} items, skipping...`);
      continue;
    }

    const itemsSnapshot = order.itemsSnapshot as OrderItemSnapshot[];

    if (!Array.isArray(itemsSnapshot) || itemsSnapshot.length === 0) {
      console.log(`Order ${order.orderNumber} has no valid items snapshot, skipping...`);
      continue;
    }

    console.log(`Creating ${itemsSnapshot.length} order items for order ${order.orderNumber}...`);

    for (const item of itemsSnapshot) {
      // Try to find the product
      const product = item.productId ? await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, supplierId: true, sku: true },
      }) : null;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          supplierId: product?.supplierId || platformSupplier.id,
          productName: item.name,
          productSku: product?.sku || item.sku,
          productImage: item.imageUrl,
          unitPrice: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          currency: order.currency,
          commissionRate: 0,
          commissionAmount: 0,
          fulfillmentStatus: order.deliveryStatus === 'DELIVERED' ? 'DELIVERED' :
                            order.deliveryStatus === 'IN_TRANSIT' ? 'SHIPPED' : 'PENDING',
          deliveredAt: order.deliveryStatus === 'DELIVERED' ? order.updatedAt : null,
        },
      });
      createdItemsCount++;
    }
  }

  console.log(`\nCreated ${createdItemsCount} order items.`);

  // 4. Summary
  const supplierCount = await prisma.supplier.count();
  const productCount = await prisma.product.count({ where: { supplierId: { not: null } } });
  const orderItemCount = await prisma.orderItem.count();

  console.log('\n=== Migration Summary ===');
  console.log(`Total suppliers: ${supplierCount}`);
  console.log(`Products with suppliers: ${productCount}`);
  console.log(`Order items created: ${orderItemCount}`);
  console.log('=========================\n');

  console.log('Multi-supplier data migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
