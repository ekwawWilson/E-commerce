# Architecture

## System Overview

A mobile-first, multi-supplier e-commerce marketplace for Ghana. Customers shop
from many suppliers in one cart (as guests or with an account) and pay with MTN
Mobile Money or cash on delivery. Platform admins manage the catalogue,
suppliers, orders, couriers and reports; suppliers manage their own products,
fulfil their order items, and view payouts.

```
 Web (Next.js)                 Mobile (Expo)
 ├── (shop)    storefront      customer app
 ├── admin     dashboard            │
 └── supplier  portal               │
        │                           │
        └──────── REST /api ────────┘
                    │
            Backend (Express)
             │      │        │
     PostgreSQL   Redis    Supabase Storage, MTN MoMo,
     (Supabase)  (BullMQ)  SMTP, Twilio / Africa's Talking, Meta WhatsApp
```

## Technology Stack

### Web frontend (`frontend/`)
- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling/UI**: Tailwind CSS, shadcn/ui (Radix)
- **State**: Zustand (cart, auth, customer, supplier-auth, history); TanStack Query for server data
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts (admin reports)

### Mobile app (`mobile/`)
- Expo 54 / React Native 0.81, React Navigation, Zustand, TanStack Query
- Customer-facing only; uses the same public and customer API as the web storefront
- API base URL comes from `EXPO_PUBLIC_API_URL` (see `mobile/.env.example`)

### Backend (`backend/`)
- **Runtime**: Node.js 20+, Express 4, TypeScript (compiled to CommonJS)
- **ORM**: Prisma 5 on PostgreSQL (Supabase; pooled `DATABASE_URL` plus `DIRECT_URL` for migrations)
- **Validation**: Zod
- **Auth**: JWT for three kinds of user (admin, supplier staff, customer); see Security
- **Jobs**: BullMQ on Redis (optional)
- **Logging**: Winston, with Morgan request logs
- **Testing**: Vitest (`backend/tests/`)

### External services
- **Image storage**: Supabase Storage (local `public/uploads` in development)
- **Payments**: MTN MoMo Collections API. Telecel Cash and AirtelTigo Money exist in the
  schema but are rejected at payment time until an integration is added.
- **SMS**: Twilio or Africa's Talking (`SMS_PROVIDER`; defaults to a mock that only logs)
- **Email**: Nodemailer over SMTP
- **WhatsApp**: Twilio or Meta WhatsApp Business API (`WHATSAPP_PROVIDER`; defaults to a mock)
- **PDF**: PDFKit (invoices and delivery notes, with QR codes)

---

## Backend Structure

Each feature lives in `backend/src/modules/<feature>/` as routes → controller →
service. Services call Prisma directly; there is no separate repository layer.

| Module | Responsibility |
|---|---|
| `auth`, `customer-auth`, `supplier-auth` | Login and tokens for admins, customers (incl. Google) and supplier staff |
| `products`, `categories`, `specifications` | Catalogue, variants, specification templates; writes go through `product-write.core.ts` |
| `cart` | Session carts identified by the `X-Cart-Id` header |
| `orders` | Checkout, order lookup/tracking, admin order management |
| `payments` | MoMo initiation, webhook and status verification |
| `suppliers`, `supplier-portal`, `payouts` | Admin supplier management, the supplier-facing API, payouts |
| `delivery` | Couriers and delivery assignment |
| `reports`, `settings`, `upload`, `pdf`, `notifications` | Reporting, store settings, image upload, PDF generation, queues/workers |

Route groups are mounted in `backend/src/routes/index.ts`; everything under
`/api/admin` goes through `authenticate` + `requireAdmin` (`routes/admin.ts`),
with `requireRole('ADMIN', 'SUPER_ADMIN')` on sensitive routes. Endpoint details
are in [backend/API.md](backend/API.md).

---

## Data Model

Defined in `backend/prisma/schema.prisma`.

- **Users**: `Admin`; `Customer`, `CustomerAddress`, `WishlistItem`; `Supplier`, `SupplierAdmin`
- **Catalogue**: `Category` (hierarchical), `Product`, `ProductCategory` (many-to-many),
  `ProductImage`, `ProductSpecification`, `SpecificationTemplate`, `ProductDeliveryZone`
- **Variants**: `ProductVariant`, `ProductOption`, `ProductOptionValue`, `ProductVariantOption`.
  Price and stock live on the variant. `Product.price`/`Product.stock` are
  rollups (cheapest variant / total stock) maintained by `recalcProductRollup()`;
  simple products get a single "Default" variant.
- **Cart & orders**: `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Delivery`, `Courier`.
  Orders and order items snapshot customer and product details so history
  survives later edits or deletes.
- **Multi-supplier**: each `OrderItem` records its supplier, commission and its own
  `fulfillmentStatus`; `SupplierPayout` groups order items into payouts.
- **Operations**: `Report`, `DailySalesReport`, `InventoryLog`, `AuditLog`, `Setting`, `NotificationLog`

### Enums
- **PaymentMethod**: MOMO, COD
- **PaymentStatus**: PENDING, PAID, FAILED
- **DeliveryStatus**: PENDING, PICKED_UP, IN_TRANSIT, DELIVERED
- **FulfillmentStatus** (per order item): PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- **AdminRole**: ADMIN, SUPER_ADMIN, SUPPORT
- **SupplierRole**: OWNER, MANAGER, STAFF
- **SupplierStatus**: PENDING, ACTIVE, SUSPENDED, REJECTED
- **PayoutStatus**: PENDING, PROCESSING, COMPLETED, FAILED
- **MobileMoneyProvider**: MTN_MOMO, TELECEL_CASH, AIRTELTIGO_MONEY

---

## Key Flows

### Checkout
1. The cart is created on first add and identified by `X-Cart-Id`.
2. `POST /api/orders/checkout` runs one transaction: it creates the `Order`, one `OrderItem`
   per line (with supplier and commission) and a `PENDING` `Payment`, and decrements
   variant stock with a `stock >= quantity` guard so concurrent orders can't oversell.
3. Order notifications are queued.

### Mobile Money payment
1. `POST /api/payments/initiate` assigns a fresh `transactionId` and sends an MTN
   request-to-pay to the customer's phone.
2. The client polls `GET /api/payments/verify/:transactionId`; MTN may also call
   `POST /api/payments/webhook`.
3. **Both paths ask MTN for the status.** The webhook is unauthenticated and the client
   knows its own `transactionId`, so the webhook body is only used to find the payment,
   never to decide its status.
4. Status changes are conditional updates: PAID is final, and repeating a status is a
   no-op, so a webhook racing a verify call can't undo a payment or notify twice.

Outside production, `MOMO_SIMULATE` (on by default) fakes MTN so every payment
succeeds. Production refuses to start with it enabled.

---

## Background Jobs

BullMQ queues are created in `backend/src/config/queue.ts`, and their workers run
**inside the API process** (started from `backend/src/index.ts`). Both only exist
when `REDIS_URL` is set; without Redis, notification calls are skipped.

| Queue | Worker | Jobs |
|---|---|---|
| `email` | `email.worker.ts` | Order/payment emails to customers and admins |
| `sms` | `sms.worker.ts` | Order and payment SMS |
| `whatsapp` | `whatsapp.worker.ts` | Admin/customer WhatsApp messages |
| `pdf` | `pdf.worker.ts` | Invoices and delivery notes |
| `report` | — | Report generation is queued, but no worker processes it yet |

---

## Security

1. **Authentication**: admin, supplier and customer tokens are JWTs signed with the one
   `JWT_SECRET` and told apart by a `type` claim (`admin`, `supplier`, `customer`). Each
   middleware rejects other types; admin tokens issued before the claim existed are still
   accepted.
2. **Production config guard**: the backend refuses to start with `NODE_ENV=production` if
   `JWT_SECRET` is missing, short or a template placeholder, or if `MOMO_SIMULATE` is on.
3. **Authorization**: admin roles via `requireRole`; supplier roles plus per-user permission overrides.
4. **Input**: Zod validation and a sanitize middleware; Prisma parameterises queries.
5. **HTTP**: Helmet (CSP), CORS limited to `CORS_ORIGINS`, rate limits (general, checkout, webhook).

---

## Monitoring & Logging

- Winston logs to the console and `backend/logs/` (`error.log`, `combined.log`)
- Health checks: backend `GET /api/health`, frontend `GET /api/health`

---

## Deployment

| Part | Host |
|---|---|
| Backend API (and in-process workers) | Render |
| Web frontend | Vercel |
| PostgreSQL + image storage | Supabase |
| Redis | Optional, any hosted Redis |

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for environment variables and steps.
The Docker setup described in [DOCKER.md](DOCKER.md) is not present in this repository.
