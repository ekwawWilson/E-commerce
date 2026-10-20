# E-Commerce Application - Folder Structure

```
ecommerce-app/
├── .env.example                    # Root environment variables template
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Prettier configuration
├── docker-compose.yml              # Docker services orchestration
├── package.json                    # Root package.json (workspaces)
├── ARCHITECTURE.md                 # System architecture documentation
├── FOLDER_STRUCTURE.md             # This file
│
├── frontend/                       # Next.js Frontend Application
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   │
│   ├── public/
│   │   └── images/                 # Static images
│   │
│   └── src/
│       ├── app/                    # Next.js App Router
│       │   ├── layout.tsx          # Root layout
│       │   ├── page.tsx            # Home page
│       │   ├── globals.css         # Global styles
│       │   │
│       │   ├── (shop)/             # Shop route group
│       │   │   ├── products/
│       │   │   │   ├── page.tsx    # Products listing
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx # Product details
│       │   │   ├── cart/
│       │   │   │   └── page.tsx    # Shopping cart
│       │   │   ├── checkout/
│       │   │   │   └── page.tsx    # Checkout page
│       │   │   └── orders/
│       │   │       └── [orderNumber]/
│       │   │           └── page.tsx # Order confirmation/tracking
│       │   │
│       │   ├── admin/              # Admin route group
│       │   │   ├── login/
│       │   │   │   └── page.tsx    # Admin login
│       │   │   └── (dashboard)/    # Protected dashboard routes
│       │   │       ├── layout.tsx  # Dashboard layout with sidebar
│       │   │       ├── products/
│       │   │       │   ├── page.tsx
│       │   │       │   ├── new/
│       │   │       │   │   └── page.tsx
│       │   │       │   └── [id]/
│       │   │       │       └── page.tsx
│       │   │       ├── orders/
│       │   │       │   ├── page.tsx
│       │   │       │   └── [id]/
│       │   │       │       └── page.tsx
│       │   │       ├── couriers/
│       │   │       │   └── page.tsx
│       │   │       ├── reports/
│       │   │       │   └── page.tsx
│       │   │       └── settings/
│       │   │           └── page.tsx
│       │   │
│       │   └── api/                # API routes (revalidation, etc.)
│       │       └── revalidate/
│       │           └── route.ts
│       │
│       ├── components/
│       │   ├── ui/                 # shadcn/ui components
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── input.tsx
│       │   │   ├── select.tsx
│       │   │   ├── table.tsx
│       │   │   ├── toast.tsx
│       │   │   └── ...
│       │   │
│       │   ├── shared/             # Shared components
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   ├── Navigation.tsx
│       │   │   ├── LoadingSpinner.tsx
│       │   │   ├── ErrorBoundary.tsx
│       │   │   └── ...
│       │   │
│       │   ├── shop/               # Shop-specific components
│       │   │   ├── ProductCard.tsx
│       │   │   ├── ProductGrid.tsx
│       │   │   ├── ProductGallery.tsx
│       │   │   ├── CartDrawer.tsx
│       │   │   ├── CartItem.tsx
│       │   │   ├── CheckoutForm.tsx
│       │   │   └── ...
│       │   │
│       │   ├── admin/              # Admin-specific components
│       │   │   ├── Sidebar.tsx
│       │   │   ├── DashboardHeader.tsx
│       │   │   ├── ProductForm.tsx
│       │   │   ├── OrdersTable.tsx
│       │   │   ├── OrderDetails.tsx
│       │   │   ├── ReportCharts.tsx
│       │   │   └── ...
│       │   │
│       │   └── forms/              # Form components
│       │       ├── ProductForm.tsx
│       │       ├── CustomerForm.tsx
│       │       └── ...
│       │
│       ├── hooks/                  # Custom React hooks
│       │   ├── useCart.ts
│       │   ├── useProducts.ts
│       │   ├── useOrders.ts
│       │   ├── useAuth.ts
│       │   └── ...
│       │
│       ├── stores/                 # Zustand stores
│       │   ├── cartStore.ts
│       │   ├── authStore.ts
│       │   └── ...
│       │
│       ├── lib/
│       │   ├── api/                # API client functions
│       │   │   ├── client.ts       # Base API client
│       │   │   ├── products.ts
│       │   │   ├── cart.ts
│       │   │   ├── orders.ts
│       │   │   ├── admin.ts
│       │   │   └── ...
│       │   │
│       │   ├── utils/              # Utility functions
│       │   │   ├── formatters.ts
│       │   │   ├── cn.ts           # Tailwind class merging
│       │   │   └── ...
│       │   │
│       │   └── validations/        # Client-side validations
│       │       └── index.ts
│       │
│       └── types/                  # Frontend-specific types
│           └── index.ts
│
├── backend/                        # Express.js Backend API
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── migrations/             # Database migrations
│   │   └── seed/
│   │       └── index.ts            # Database seeding
│   │
│   ├── tests/
│   │   ├── unit/                   # Unit tests
│   │   ├── integration/            # Integration tests
│   │   └── fixtures/               # Test fixtures
│   │
│   └── src/
│       ├── index.ts                # Application entry point
│       │
│       ├── config/                 # Configuration
│       │   ├── index.ts
│       │   ├── database.ts
│       │   ├── redis.ts
│       │   └── cloudinary.ts
│       │
│       ├── middleware/             # Express middleware
│       │   ├── auth.ts             # JWT authentication
│       │   ├── validation.ts       # Request validation
│       │   ├── errorHandler.ts     # Global error handler
│       │   ├── rateLimiter.ts      # Rate limiting
│       │   └── upload.ts           # File upload (multer)
│       │
│       ├── routes/                 # Route definitions
│       │   ├── index.ts            # Route aggregator
│       │   ├── public.ts           # Public API routes
│       │   └── admin.ts            # Admin API routes
│       │
│       ├── modules/                # Feature modules
│       │   │
│       │   ├── auth/               # Authentication module
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   └── auth.repository.ts
│       │   │
│       │   ├── products/           # Products module
│       │   │   ├── products.controller.ts
│       │   │   ├── products.service.ts
│       │   │   └── products.repository.ts
│       │   │
│       │   ├── categories/         # Categories module
│       │   │   ├── categories.controller.ts
│       │   │   ├── categories.service.ts
│       │   │   └── categories.repository.ts
│       │   │
│       │   ├── cart/               # Cart module
│       │   │   ├── cart.controller.ts
│       │   │   ├── cart.service.ts
│       │   │   └── cart.repository.ts
│       │   │
│       │   ├── orders/             # Orders module
│       │   │   ├── orders.controller.ts
│       │   │   ├── orders.service.ts
│       │   │   └── orders.repository.ts
│       │   │
│       │   ├── payments/           # Payments module
│       │   │   ├── payments.controller.ts
│       │   │   ├── payments.service.ts
│       │   │   └── providers/
│       │   │       ├── mtn-momo.ts
│       │   │       ├── airtel-money.ts
│       │   │       └── index.ts
│       │   │
│       │   ├── delivery/           # Delivery module
│       │   │   ├── delivery.controller.ts
│       │   │   ├── delivery.service.ts
│       │   │   └── delivery.repository.ts
│       │   │
│       │   ├── notifications/      # Notifications module
│       │   │   ├── notifications.service.ts
│       │   │   └── providers/
│       │   │       ├── sms.ts
│       │   │       ├── email.ts
│       │   │       ├── whatsapp.ts
│       │   │       └── index.ts
│       │   │
│       │   ├── upload/             # Upload module
│       │   │   ├── upload.controller.ts
│       │   │   ├── upload.service.ts
│       │   │   └── providers/
│       │   │       ├── cloudinary.ts
│       │   │       ├── s3.ts
│       │   │       └── index.ts
│       │   │
│       │   ├── pdf/                # PDF generation module
│       │   │   ├── pdf.controller.ts
│       │   │   ├── pdf.service.ts
│       │   │   └── templates/
│       │   │       ├── invoice.ts
│       │   │       └── deliveryNote.ts
│       │   │
│       │   ├── reports/            # Reports module
│       │   │   ├── reports.controller.ts
│       │   │   └── reports.service.ts
│       │   │
│       │   └── settings/           # Settings module
│       │       ├── settings.controller.ts
│       │       ├── settings.service.ts
│       │       └── settings.repository.ts
│       │
│       ├── utils/                  # Utility functions
│       │   ├── logger.ts           # Winston logger
│       │   ├── generateOrderNumber.ts
│       │   ├── slugify.ts
│       │   └── ...
│       │
│       ├── validations/            # Zod validation schemas
│       │   └── index.ts
│       │
│       └── types/                  # Backend-specific types
│           └── index.ts
│
├── workers/                        # BullMQ Background Workers
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── index.ts                # Workers entry point
│       │
│       ├── config/                 # Configuration
│       │   ├── index.ts
│       │   └── redis.ts
│       │
│       ├── queues/                 # Queue definitions
│       │   ├── index.ts
│       │   ├── notificationQueue.ts
│       │   ├── orderProcessingQueue.ts
│       │   └── cleanupQueue.ts
│       │
│       ├── processors/             # Job processors
│       │   ├── notificationProcessor.ts
│       │   ├── orderProcessor.ts
│       │   └── cleanupProcessor.ts
│       │
│       ├── jobs/                   # Job definitions
│       │   ├── sendSms.ts
│       │   ├── sendEmail.ts
│       │   ├── sendWhatsApp.ts
│       │   ├── processPayment.ts
│       │   ├── generateInvoice.ts
│       │   └── cleanExpiredCarts.ts
│       │
│       └── utils/                  # Utility functions
│           └── logger.ts
│
└── shared/                         # Shared Code (Types, Constants, Validations)
    ├── package.json
    ├── tsconfig.json
    │
    └── src/
        ├── index.ts                # Main export
        │
        ├── types/                  # Shared TypeScript types
        │   └── index.ts
        │
        ├── constants/              # Shared constants
        │   └── index.ts
        │
        └── validations/            # Shared Zod schemas
            └── index.ts
```

## Module Responsibilities

### Frontend Modules
- **app/**: Next.js App Router pages and layouts
- **components/ui/**: Reusable shadcn/ui components
- **components/shop/**: E-commerce specific components
- **components/admin/**: Admin dashboard components
- **hooks/**: Custom React hooks for data fetching
- **stores/**: Zustand state management
- **lib/api/**: API client for backend communication

### Backend Modules
- **auth**: Admin authentication (JWT)
- **products**: Product CRUD operations
- **categories**: Category management
- **cart**: Cart persistence and management
- **orders**: Order processing
- **payments**: Payment gateway integration
- **delivery**: Delivery tracking
- **notifications**: SMS/Email/WhatsApp services
- **upload**: Image upload to Cloudinary/S3
- **pdf**: Invoice and delivery note generation
- **reports**: Sales and delivery reports
- **settings**: Application configuration

### Worker Jobs
- **Notifications**: Send SMS, Email, WhatsApp messages
- **Order Processing**: Payment confirmation, inventory updates
- **Cleanup**: Cart expiration, order archival
