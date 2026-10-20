# Multi-Supplier E-Commerce Transformation Plan

## Executive Summary

Transform the current single-vendor e-commerce application into a full-featured multi-supplier marketplace. This will enable multiple suppliers to sell products through a unified storefront while maintaining separate inventory, orders, and payouts.

---

## Architecture Overview

### Current State
- Single admin manages all products
- All products share a single inventory pool
- Orders go to a single fulfillment entity
- Payments collected by platform owner

### Target State
- **Platform Admin**: Manages suppliers, categories, platform settings, commissions
- **Suppliers**: Manage their own products, inventory, orders, and view payouts
- **Customers**: Shop from multiple suppliers in a single cart/checkout
- **Order Splitting**: Orders automatically split by supplier for fulfillment
- **Payment Splitting**: Automated commission calculation and supplier payouts

---

## Phase 1: Database Schema Changes

### New Models

#### 1. Supplier Model
```prisma
model Supplier {
  id                String    @id @default(cuid())

  // Basic Info
  name              String
  slug              String    @unique
  description       String?
  logo              String?   // Logo URL
  banner            String?   // Banner image URL

  // Contact
  email             String    @unique
  phone             String
  whatsapp          String?

  // Business Info
  businessName      String?
  businessAddress   String
  city              String
  region            String
  taxId             String?   // Tax identification number

  // Banking (for payouts)
  bankName          String?
  bankAccountNumber String?
  bankAccountName   String?
  momoNumber        String?   // Mobile money for payouts
  momoProvider      String?   // MTN, ORANGE, AIRTEL

  // Platform Settings
  commissionRate    Decimal   @default(10) @db.Decimal(5, 2) // Platform commission %
  status            SupplierStatus @default(PENDING)
  verified          Boolean   @default(false)
  verifiedAt        DateTime?

  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  admins            SupplierAdmin[]
  products          Product[]
  orderItems        OrderItem[]
  payouts           SupplierPayout[]

  @@index([status])
  @@index([verified])
}

enum SupplierStatus {
  PENDING     // Awaiting approval
  ACTIVE      // Can sell
  SUSPENDED   // Temporarily disabled
  REJECTED    // Application rejected
}
```

#### 2. SupplierAdmin Model (Supplier Staff)
```prisma
model SupplierAdmin {
  id            String    @id @default(cuid())
  supplierId    String

  email         String    @unique
  passwordHash  String
  name          String
  phone         String?
  role          SupplierRole @default(STAFF)

  active        Boolean   @default(true)
  lastLoginAt   DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  supplier      Supplier  @relation(fields: [supplierId], references: [id])

  @@index([supplierId])
}

enum SupplierRole {
  OWNER   // Full access, can manage other staff
  MANAGER // Can manage products, orders, view payouts
  STAFF   // Can only manage products and view orders
}
```

#### 3. OrderItem Model (Split Orders by Supplier)
```prisma
model OrderItem {
  id              String    @id @default(cuid())
  orderId         String
  productId       String
  supplierId      String

  // Snapshot at order time
  productName     String
  productSku      String?
  productImage    String?
  unitPrice       Decimal   @db.Decimal(10, 2)
  quantity        Int
  totalPrice      Decimal   @db.Decimal(10, 2)
  currency        String    @default("XAF")

  // Supplier-specific fulfillment
  fulfillmentStatus FulfillmentStatus @default(PENDING)
  fulfilledAt     DateTime?
  trackingNumber  String?
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  order           Order     @relation(fields: [orderId], references: [id])
  product         Product   @relation(fields: [productId], references: [id])
  supplier        Supplier  @relation(fields: [supplierId], references: [id])

  @@index([orderId])
  @@index([supplierId])
  @@index([fulfillmentStatus])
}

enum FulfillmentStatus {
  PENDING       // Awaiting supplier action
  CONFIRMED     // Supplier confirmed
  PROCESSING    // Being prepared
  SHIPPED       // Handed to delivery
  DELIVERED     // Completed
  CANCELLED     // Cancelled
}
```

#### 4. SupplierPayout Model
```prisma
model SupplierPayout {
  id              String    @id @default(cuid())
  supplierId      String

  // Period
  periodStart     DateTime
  periodEnd       DateTime

  // Amounts
  grossAmount     Decimal   @db.Decimal(10, 2) // Total sales
  commissionAmount Decimal  @db.Decimal(10, 2) // Platform commission
  netAmount       Decimal   @db.Decimal(10, 2) // Amount to pay supplier
  currency        String    @default("XAF")

  // Status
  status          PayoutStatus @default(PENDING)

  // Payment Details
  paymentMethod   String?   // BANK_TRANSFER, MOMO
  paymentReference String?
  paidAt          DateTime?

  // Metadata
  orderItemIds    String[]  // Order items included in this payout
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  supplier        Supplier  @relation(fields: [supplierId], references: [id])

  @@index([supplierId])
  @@index([status])
  @@index([periodStart, periodEnd])
}

enum PayoutStatus {
  PENDING     // Awaiting processing
  PROCESSING  // Being processed
  COMPLETED   // Successfully paid
  FAILED      // Payment failed
}
```

### Modified Models

#### Product Model Changes
```prisma
model Product {
  // ... existing fields ...

  // ADD: Supplier relationship
  supplierId      String
  supplier        Supplier  @relation(fields: [supplierId], references: [id])

  // ADD: Order items relation
  orderItems      OrderItem[]

  @@index([supplierId])
  @@index([supplierId, active])
}
```

#### Order Model Changes
```prisma
model Order {
  // ... existing fields ...

  // ADD: Order items (replaces itemsSnapshot JSON)
  items           OrderItem[]

  // ADD: Multi-supplier tracking
  supplierCount   Int       @default(1)  // Number of suppliers in order

  // KEEP: itemsSnapshot for backward compatibility during migration
}
```

#### Admin Model Changes
```prisma
enum AdminRole {
  SUPER_ADMIN   // Full platform access
  ADMIN         // Platform admin
  SUPPORT       // Customer support only
}
```

---

## Phase 2: Backend Implementation

### 2.1 New Modules

#### Supplier Module (`/modules/suppliers/`)
```
suppliers/
├── supplier.controller.ts
├── supplier.service.ts
├── supplier.repository.ts
└── supplier.validation.ts
```

**Endpoints:**
- `POST /api/suppliers/register` - Supplier registration
- `GET /api/suppliers` - List suppliers (public, with filters)
- `GET /api/suppliers/:slug` - Supplier storefront page
- `GET /api/suppliers/:slug/products` - Supplier's products

**Admin Endpoints:**
- `GET /api/admin/suppliers` - List all suppliers
- `GET /api/admin/suppliers/:id` - Supplier details
- `PATCH /api/admin/suppliers/:id/status` - Approve/suspend supplier
- `PATCH /api/admin/suppliers/:id/commission` - Update commission rate

#### Supplier Auth Module (`/modules/supplier-auth/`)
```
supplier-auth/
├── supplier-auth.controller.ts
├── supplier-auth.service.ts
└── supplier-auth.middleware.ts
```

**Endpoints:**
- `POST /api/supplier/auth/login` - Supplier login
- `POST /api/supplier/auth/register` - Register supplier + owner
- `GET /api/supplier/auth/me` - Current supplier admin info
- `PUT /api/supplier/auth/password` - Change password

#### Supplier Portal Module (`/modules/supplier-portal/`)
```
supplier-portal/
├── portal.controller.ts
├── portal.service.ts
├── dashboard.service.ts
└── portal.validation.ts
```

**Endpoints:**
- `GET /api/supplier/dashboard` - Dashboard stats
- `GET /api/supplier/products` - Supplier's products
- `POST /api/supplier/products` - Create product
- `PUT /api/supplier/products/:id` - Update product
- `DELETE /api/supplier/products/:id` - Delete product
- `GET /api/supplier/orders` - Orders containing supplier's items
- `PATCH /api/supplier/orders/:orderId/items/:itemId/fulfill` - Update fulfillment
- `GET /api/supplier/payouts` - Payout history
- `GET /api/supplier/profile` - Supplier profile
- `PUT /api/supplier/profile` - Update profile

#### Payout Module (`/modules/payouts/`)
```
payouts/
├── payout.controller.ts
├── payout.service.ts
└── payout.scheduler.ts
```

**Admin Endpoints:**
- `GET /api/admin/payouts` - All payouts
- `POST /api/admin/payouts/generate` - Generate payout batch
- `PATCH /api/admin/payouts/:id/process` - Mark as processing
- `PATCH /api/admin/payouts/:id/complete` - Mark as completed

### 2.2 Modified Modules

#### Products Module Changes
- Add `supplierId` to product creation
- Filter products by supplier for supplier portal
- Include supplier info in product responses (for storefront)

#### Orders Module Changes
- Create `OrderItem` records during checkout
- Calculate supplier-specific amounts
- Split order notifications by supplier
- Update fulfillment logic for per-supplier tracking

#### Cart Module Changes
- Include supplier info in cart item display
- Group cart items by supplier for checkout preview

### 2.3 New Middleware

#### Supplier Authentication (`supplier-auth.middleware.ts`)
```typescript
// authenticateSupplier - Validates supplier JWT
// requireSupplierRole(...roles) - Role-based access
// requireActiveSupplier - Checks supplier status is ACTIVE
```

#### Multi-tenant Isolation
```typescript
// ensureSupplierOwnership - Validates resource belongs to supplier
// Example: Supplier can only update their own products
```

### 2.4 Updated Authentication

**JWT Payloads:**
```typescript
// Platform Admin JWT
{
  type: 'admin',
  adminId: string,
  email: string,
  role: AdminRole
}

// Supplier Admin JWT
{
  type: 'supplier',
  supplierAdminId: string,
  supplierId: string,
  email: string,
  role: SupplierRole
}
```

---

## Phase 3: Order Flow Changes

### 3.1 Checkout Process

```
1. Customer adds items from multiple suppliers
2. Cart displays items grouped by supplier
3. Checkout creates:
   - 1 Order record (master order)
   - N OrderItem records (one per product, linked to supplier)
   - 1 Payment record
   - 1 Delivery record (platform-managed delivery)
4. Each supplier notified of their items
5. Suppliers fulfill their portions independently
6. Platform delivery picks up from suppliers
```

### 3.2 Order Splitting Logic

```typescript
// During checkout
const orderItems = cartItems.map(item => ({
  productId: item.productId,
  supplierId: item.product.supplierId,
  productName: item.product.name,
  quantity: item.quantity,
  unitPrice: item.product.price,
  totalPrice: item.quantity * item.product.price,
  fulfillmentStatus: 'PENDING'
}));

// Group for notifications
const supplierGroups = groupBy(orderItems, 'supplierId');
for (const [supplierId, items] of Object.entries(supplierGroups)) {
  await notifySupplierNewOrder(supplierId, order, items);
}
```

### 3.3 Fulfillment Workflow

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
   ↓          ↓           ↓           ↓
   └──────────┴───────────┴───────────┴──→ CANCELLED
```

- Supplier updates fulfillment status per OrderItem
- Platform delivery sees consolidated view
- Customer sees order-level status (worst case of all items)

---

## Phase 4: Commission & Payout System

### 4.1 Commission Calculation

```typescript
// Per OrderItem
const grossAmount = item.totalPrice;
const commissionRate = supplier.commissionRate; // e.g., 10%
const commissionAmount = grossAmount * (commissionRate / 100);
const netAmount = grossAmount - commissionAmount;
```

### 4.2 Payout Generation (Scheduled Job)

```typescript
// Weekly payout job
async function generateWeeklyPayouts() {
  const suppliers = await getActiveSuppliers();

  for (const supplier of suppliers) {
    const deliveredItems = await getDeliveredItemsForPeriod(
      supplier.id,
      periodStart,
      periodEnd
    );

    if (deliveredItems.length === 0) continue;

    const grossAmount = sum(deliveredItems, 'totalPrice');
    const commissionAmount = grossAmount * (supplier.commissionRate / 100);
    const netAmount = grossAmount - commissionAmount;

    await createPayout({
      supplierId: supplier.id,
      periodStart,
      periodEnd,
      grossAmount,
      commissionAmount,
      netAmount,
      orderItemIds: deliveredItems.map(i => i.id),
      status: 'PENDING'
    });
  }
}
```

### 4.3 Payout Processing

- Manual approval by platform admin
- Integration with payment providers for automated payouts
- Mobile money payout support (MTN, Orange, Airtel)
- Bank transfer support

---

## Phase 5: Frontend Changes

### 5.1 New Pages

#### Supplier Portal (`/supplier/`)
```
/supplier/login          - Supplier login
/supplier/register       - Supplier registration
/supplier/dashboard      - Dashboard with stats
/supplier/products       - Product management
/supplier/products/new   - Add product
/supplier/products/:id   - Edit product
/supplier/orders         - Orders with supplier's items
/supplier/orders/:id     - Order detail & fulfillment
/supplier/payouts        - Payout history
/supplier/profile        - Business profile
/supplier/settings       - Account settings
```

#### Platform Admin Additions
```
/admin/suppliers         - Supplier management
/admin/suppliers/:id     - Supplier detail
/admin/payouts           - Payout management
/admin/commissions       - Commission settings
```

#### Shop Page Updates
```
/suppliers               - Supplier directory
/suppliers/:slug         - Supplier storefront
```

### 5.2 Component Updates

#### Cart Component
- Group items by supplier
- Show supplier name per item
- Display shipping info per supplier (if applicable)

#### Checkout Component
- Show order breakdown by supplier
- Explain multi-supplier order handling

#### Product Card
- Add "Sold by [Supplier Name]" label
- Link to supplier storefront

#### Order Tracking
- Show fulfillment status per supplier
- Individual tracking per supplier shipment (if separate)

### 5.3 New Stores

#### Supplier Auth Store (`/stores/supplier-auth.ts`)
```typescript
interface SupplierAuthState {
  supplierAdmin: SupplierAdmin | null;
  supplier: Supplier | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

---

## Phase 6: Notifications

### 6.1 New Notification Types

#### Supplier Notifications
- `supplier_new_order` - New order with supplier's items
- `supplier_order_paid` - Payment confirmed
- `supplier_payout_ready` - Payout generated
- `supplier_payout_completed` - Payout sent

#### Admin Notifications
- `new_supplier_registration` - Supplier registration pending
- `supplier_verified` - Supplier completed verification

#### Customer Notifications
- Update order confirmation to list suppliers
- Per-supplier fulfillment updates

### 6.2 Notification Routing

```typescript
// On new order
async function notifyNewOrder(order: Order) {
  // Customer notification
  await queueEmail({ to: order.customerEmail, template: 'order_confirmation', ... });
  await queueSms({ to: order.customerPhone, message: '...' });

  // Supplier notifications
  const supplierGroups = groupBy(order.items, 'supplierId');
  for (const [supplierId, items] of Object.entries(supplierGroups)) {
    const supplier = await getSupplier(supplierId);
    await queueEmail({
      to: supplier.email,
      template: 'supplier_new_order',
      data: { order, items, supplier }
    });
  }

  // Platform admin notification
  await queueEmail({ to: config.adminEmail, template: 'admin_new_order', ... });
}
```

---

## Phase 7: Migration Strategy

### 7.1 Data Migration Steps

1. **Create New Tables**
   - Run Prisma migration for new models
   - No data loss, additive changes

2. **Create Default Supplier**
   - Create a "Platform" supplier for existing products
   - Assign all existing products to this supplier

3. **Migrate Order Items**
   - Parse `itemsSnapshot` JSON from existing orders
   - Create `OrderItem` records
   - Link to default supplier

4. **Update Admin Roles**
   - Map existing ADMIN to ADMIN
   - Map SUPER_ADMIN to SUPER_ADMIN

### 7.2 Migration Script

```typescript
async function migrateToMultiSupplier() {
  // 1. Create default supplier
  const defaultSupplier = await prisma.supplier.create({
    data: {
      name: 'Platform Store',
      slug: 'platform-store',
      email: 'store@platform.com',
      phone: '+237600000000',
      businessAddress: 'Platform HQ',
      city: 'Douala',
      region: 'Littoral',
      status: 'ACTIVE',
      verified: true,
      verifiedAt: new Date(),
      commissionRate: 0, // No commission for platform's own products
    }
  });

  // 2. Update all products
  await prisma.product.updateMany({
    data: { supplierId: defaultSupplier.id }
  });

  // 3. Migrate order items
  const orders = await prisma.order.findMany();
  for (const order of orders) {
    const items = order.itemsSnapshot as any[];
    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          supplierId: defaultSupplier.id,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          fulfillmentStatus: order.deliveryStatus === 'DELIVERED' ? 'DELIVERED' : 'PENDING'
        }
      });
    }
  }
}
```

---

## Implementation Order

### Week 1-2: Database & Core Backend
1. ✅ Create Prisma schema changes
2. ✅ Run migrations
3. ✅ Create Supplier module
4. ✅ Create Supplier Auth module
5. ✅ Update Product module for supplier relationship

### Week 3-4: Order Flow & Fulfillment
1. ✅ Modify checkout to create OrderItems
2. ✅ Create fulfillment update endpoints
3. ✅ Update order notifications
4. ✅ Implement order splitting logic

### Week 5-6: Payout System
1. ✅ Create Payout module
2. ✅ Implement commission calculation
3. ✅ Create payout generation job
4. ✅ Build payout management endpoints

### Week 7-8: Supplier Portal Frontend
1. ✅ Create supplier auth pages
2. ✅ Build supplier dashboard
3. ✅ Create supplier product management
4. ✅ Build supplier order management
5. ✅ Create payout history page

### Week 9-10: Platform Admin & Shop Updates
1. ✅ Add supplier management to admin
2. ✅ Update shop to show supplier info
3. ✅ Create supplier directory page
4. ✅ Update cart/checkout for multi-supplier

### Week 11-12: Testing & Polish
1. ✅ End-to-end testing
2. ✅ Performance optimization
3. ✅ Documentation
4. ✅ Data migration (if production data exists)

---

## File Structure Summary

### New Backend Files
```
backend/src/
├── modules/
│   ├── suppliers/
│   │   ├── supplier.controller.ts
│   │   ├── supplier.service.ts
│   │   └── supplier.validation.ts
│   ├── supplier-auth/
│   │   ├── supplier-auth.controller.ts
│   │   ├── supplier-auth.service.ts
│   │   └── supplier-auth.middleware.ts
│   ├── supplier-portal/
│   │   ├── portal.controller.ts
│   │   ├── portal.service.ts
│   │   └── dashboard.service.ts
│   └── payouts/
│       ├── payout.controller.ts
│       ├── payout.service.ts
│       └── payout.scheduler.ts
├── routes/
│   ├── supplier.ts          # Public supplier routes
│   └── supplier-portal.ts   # Protected supplier portal routes
└── validations/
    ├── supplier.ts
    └── payout.ts
```

### New Frontend Files
```
frontend/src/
├── app/
│   ├── supplier/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── (portal)/
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── products/page.tsx
│   │       ├── products/new/page.tsx
│   │       ├── products/[id]/edit/page.tsx
│   │       ├── orders/page.tsx
│   │       ├── orders/[id]/page.tsx
│   │       ├── payouts/page.tsx
│   │       └── profile/page.tsx
│   ├── (shop)/
│   │   └── suppliers/
│   │       ├── page.tsx           # Supplier directory
│   │       └── [slug]/page.tsx    # Supplier storefront
│   └── admin/(dashboard)/
│       ├── suppliers/page.tsx
│       ├── suppliers/[id]/page.tsx
│       └── payouts/page.tsx
├── components/
│   └── supplier/
│       ├── sidebar.tsx
│       ├── dashboard-stats.tsx
│       ├── order-item-card.tsx
│       └── payout-table.tsx
├── stores/
│   └── supplier-auth.ts
├── lib/api/
│   └── supplier.ts
└── types/
    └── supplier.ts
```

---

## Security Considerations

1. **Data Isolation**: Suppliers can only access their own data
2. **JWT Separation**: Different token types for admin vs supplier
3. **Rate Limiting**: Per-supplier rate limits
4. **Audit Logging**: Track all supplier actions
5. **Payout Verification**: Manual approval for large payouts
6. **Email Verification**: Verify supplier email before activation

---

## Success Metrics

1. **Supplier Onboarding**: Time from registration to first sale
2. **Order Fulfillment**: Average time per supplier
3. **Payout Accuracy**: Zero discrepancies in payouts
4. **Platform GMV**: Gross merchandise value growth
5. **Supplier Satisfaction**: NPS score from suppliers

---

## Questions for Clarification

Before starting implementation, please confirm:

1. **Commission Model**:
   - Fixed percentage per supplier?
   - Category-based commission?
   - Tiered commission based on volume?

2. **Payout Frequency**:
   - Weekly?
   - Bi-weekly?
   - Monthly?
   - Minimum payout threshold?

3. **Delivery Model**:
   - Platform-managed delivery (current)?
   - Supplier handles own delivery?
   - Hybrid (supplier choice)?

4. **Supplier Verification**:
   - Manual approval only?
   - Document verification required?
   - Automated checks?

5. **Product Approval**:
   - Supplier products go live immediately?
   - Platform approval required?
   - Category-based rules?
