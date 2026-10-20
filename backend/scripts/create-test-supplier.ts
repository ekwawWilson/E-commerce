import { PrismaClient, SupplierStatus, SupplierRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test supplier with login credentials...\n');

  // Check if test supplier already exists
  let testSupplier = await prisma.supplier.findFirst({
    where: { email: 'supplier@test.com' },
  });

  if (!testSupplier) {
    console.log('Creating test supplier...');
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Test Supplier Store',
        slug: 'test-supplier',
        email: 'supplier@test.com',
        phone: '+237600000001',
        businessAddress: '123 Test Street',
        city: 'Douala',
        region: 'Littoral',
        description: 'A test supplier for development purposes',
        status: SupplierStatus.ACTIVE,
        verified: true,
        verifiedAt: new Date(),
        commissionRate: 10,
      },
    });
    console.log(`Created supplier: ${testSupplier.id}`);
  } else {
    console.log(`Test supplier already exists: ${testSupplier.id}`);
  }

  // Check if supplier admin already exists
  let supplierAdmin = await prisma.supplierAdmin.findFirst({
    where: { email: 'supplier@test.com' },
  });

  if (!supplierAdmin) {
    console.log('Creating supplier admin...');
    const passwordHash = await bcrypt.hash('supplier123', 10);

    supplierAdmin = await prisma.supplierAdmin.create({
      data: {
        supplierId: testSupplier.id,
        email: 'supplier@test.com',
        passwordHash,
        name: 'Test Supplier Owner',
        phone: '+237600000001',
        role: SupplierRole.OWNER,
        active: true,
      },
    });
    console.log(`Created supplier admin: ${supplierAdmin.id}`);
  } else {
    console.log(`Supplier admin already exists: ${supplierAdmin.id}`);
  }

  console.log('\n=== Test Supplier Credentials ===');
  console.log('Email: supplier@test.com');
  console.log('Password: supplier123');
  console.log('Login URL: http://localhost:3000/supplier/login');
  console.log('================================\n');
}

main()
  .catch((e) => {
    console.error('Failed to create test supplier:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
