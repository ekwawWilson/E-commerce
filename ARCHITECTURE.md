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
| `orders` | Checkout and quotes, tracking, cancellation and refunds, fulfillment rules (`fulfillment.ts`), delivery fees (`delivery-fee.ts`) |
| `payments` | MoMo initiation, webhook and status verification |
| `coupons` | Coupon validation, redemption and admin management |
| `account-tokens` | Password reset (all account types) and email/phone verification tokens |
| `suppliers`, `supplier-portal`, `payouts` | Admin supplier management, the supplier-facing API (incl. image uploads), payouts |
| `delivery` | Couriers and delivery assignment |
| `reports`, `settings`, `upload`, `pdf`, `notifications` | Reporting, store settings, image upload, PDF generation, queues/workers |

Route groups are mounted in `backend/src/routes/index.ts`; everything under
`/api/admin` goes through `authenticate` + `requireAdmin` (`routes/admin.ts`),
with `requireRole('ADMIN', 'SUPER_ADMIN')` on money-affecting routes and
`readOnlyForSupport` on the catalogue. Endpoint details
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
  `fulfillmentStatus`; `SupplierPayout` groups order items into payouts, and
  `OrderItem.payoutId` ties each item to at most one payout.
- **Discounts**: `Coupon`; orders record `couponCode` and `discount`.
- **Accounts**: `AuthToken` holds hashed password-reset and verification tokens;
  `passwordChangedAt` on each account type invalidates older sessions.
- **Operations**: `Report`, `DailySalesReport`, `InventoryLog`, `AuditLog`, `Setting`, `NotificationLog`

### Enums
- **PaymentMethod**: MOMO, COD
- **PaymentStatus**: PENDING, PAID, FAILED, REFUNDED
- **DeliveryStatus**: PENDING, PICKED_UP, IN_TRANSIT, DELIVERED
- **FulfillmentStatus** (per order item): PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- **AdminRole**: ADMIN, SUPER_ADMIN, SUPPORT
- **SupplierRole**: OWNER, MANAGER, STAFF
- **SupplierStatus**: PENDING, ACTIVE, SUSPENDED, REJECTED
- **PayoutStatus**: PENDING, PROCESSING, COMPLETED, FAILED
- **MobileMoneyProvider**: MTN_MOMO, TELECEL_CASH, AIRTELTIGO_MONEY
- **DiscountType**: PERCENTAGE, FIXED
- **AccountType** / **AuthTokenPurpose**: who a token belongs to and what it's for

---

## Key Flows

### Checkout
1. The cart is created on first add and identified by `X-Cart-Id`.
2. `POST /api/orders/quote` prices the cart for a destination and coupon, so the
   checkout page shows exactly what will be charged.
3. `POST /api/orders/checkout` first re-validates the cart: items from inactive
   products or suppliers are refused, and if any price changed since it was added the
   cart is updated and checkout stops with a 409 so the customer sees the new total.
4. It then runs one transaction: redeems the coupon (a conditional update, so the last
   use can't be taken twice), creates the `Order` (linked to the customer when a
   customer token is sent), one `OrderItem` per line (with supplier and commission) and a
   `PENDING` `Payment`, and decrements variant stock with a `stock >= quantity` guard so
   concurrent orders can't oversell.
5. Delivery fees come from each product's delivery zone for the destination (city, then
   region, then country-wide), else the store default; each supplier is charged once at
   its highest fee, and orders over the free-delivery threshold ship free.
6. Coupons are platform-funded: commission and payouts use the full item price.

### Tracking
`GET /api/orders/track` needs the order number **and** the phone number or email used
at checkout; a wrong pair looks the same as a missing order. `GET /api/orders/:id`
returns an order summary with no personal details, for the confirmation and payment
pages.

### Cancellation and refunds
- Customers can cancel while every item is still PENDING or CONFIRMED; admins while
  nothing has shipped. Cancelling returns stock, gives back the coupon use, and fails an
  unpaid payment. Unpaid Mobile Money orders are cancelled automatically after
  `UNPAID_ORDER_TTL_HOURS` (default 24) by a timer in the API process.
- A cancelled order that was paid stays PAID until an admin sends the money back
  (outside the system) and records it with `POST /api/admin/orders/:id/refund`.

### Fulfillment and payouts
- Order items move one step at a time (PENDING → CONFIRMED → PROCESSING → SHIPPED →
  DELIVERED). Mobile Money orders must be paid before PROCESSING; cash-on-delivery orders
  are marked paid by an admin when the cash is collected.
- Payouts include only DELIVERED items from paid, uncancelled orders that aren't already
  in a payout. COMPLETED and FAILED payouts are final; a failed payout releases its items.

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

Reports don't use a queue: `POST /api/admin/reports/generate` records the request and
`GET /api/admin/reports/:id/download` builds the CSV from live data.

---

## Security

1. **Authentication**: admin, supplier and customer tokens are JWTs signed with the one
   `JWT_SECRET` and told apart by a `type` claim (`admin`, `supplier`, `customer`). Each
   middleware rejects other types; admin tokens issued before the claim existed are still
   accepted.
2. **Production config guard**: the backend refuses to start with `NODE_ENV=production` if
   `JWT_SECRET` is missing, short or a template placeholder, or if `MOMO_SIMULATE` is on.
3. **Google sign-in**: the ID token is verified with Google (audience must be one of our
   client IDs); the email and Google ID always come from the verified token.
4. **Passwords**: reset by emailed single-use link (hashed in `AuthToken`, 1 hour); a
   password change or reset sets `passwordChangedAt`, which invalidates every older token.
   Requests for a reset get the same answer whether or not the account exists.
5. **Authorization**: admin roles via `requireRole` and `readOnlyForSupport`; supplier
   roles plus per-user permission overrides; suppliers upload only into their own folder.
6. **Input**: Zod validation on every customer and supplier route (unknown fields are
   dropped) and a sanitize middleware; Prisma parameterises queries.
7. **HTTP**: Helmet (CSP), CORS limited to `CORS_ORIGINS`, rate limits (general, login,
   sign-up, password reset, checkout, webhook).

---

## Monitoring & Logging

- Winston logs to the console and `backend/logs/` (`error.log`, `combined.log`)
- Health checks: backend `GET /api/health`, frontend `GET /api/health`

---

## Deployment

Not deployed yet. The intended setup:

| Part | Host |
|---|---|
| Backend API (and in-process workers) | Render |
| Web frontend | Vercel |
| PostgreSQL + image storage | Supabase |
| Redis | Optional, any hosted Redis |

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for environment variables and steps.
The Docker setup described in [DOCKER.md](DOCKER.md) is not present in this repository.
