# E-Commerce Application

A multi-supplier e-commerce marketplace for Ghana: a Next.js web app (storefront, admin and supplier dashboards), an Express.js API, and an Expo mobile app for customers.

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Redis** (v7 or higher) — optional; without it email/SMS/WhatsApp/PDF jobs don't run

## Local Setup

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

### 2. Create Database

```bash
sudo -u postgres psql
```

In the PostgreSQL shell:
```sql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE ecommerce_db;
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO postgres;
\q
```

### 3. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

### 4. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 5. Set Up Environment Variables

The `.env` files are already configured for local development:

**Backend** (`backend/.env`):
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

**Frontend** (`frontend/.env.local`):
- API URL: `http://localhost:4000/api`

### 6. Run Database Migrations

```bash
cd backend
npx prisma migrate deploy   # apply existing migrations
npx prisma migrate dev      # or, while changing the schema
npx prisma db seed  # Optional: seed sample data
```

### 7. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Or start both from the repository root with `npm run dev`.

MoMo payments are simulated outside production (every payment succeeds), so you can
test checkout without MTN credentials. Set `MOMO_SIMULATE=false` in `backend/.env`
to call the MTN sandbox instead.

### 8. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Admin Panel:** http://localhost:3000/admin

### 9. Mobile App (optional)

```bash
cd mobile
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your machine's LAN IP
npm install
npx expo start
```

### 10. Run Tests

```bash
cd backend && npx vitest run
cd ../frontend && npx vitest run
```

## Default Admin Credentials

After seeding the database:
- **Email:** admin@example.com
- **Password:** admin123

## Project Structure

```
ecommerce-app/
├── backend/           # Express.js API
│   ├── src/
│   │   ├── modules/   # Feature modules
│   │   ├── middleware/
│   │   └── utils/
│   └── prisma/        # Database schema & migrations
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/       # App router pages: (shop), admin, supplier
│   │   ├── components/
│   │   ├── lib/       # API clients & utilities
│   │   └── stores/    # Zustand stores
├── mobile/            # Expo (React Native) customer app
├── shared/            # Types, constants and validations shared by packages
└── README.md
```

## Features

- Product catalog with categories, variants (e.g. storage/colour) and specifications
- Multiple suppliers, each with their own portal, products, order fulfillment and payouts
- Shopping cart (persistent, guest or signed in)
- Customer accounts (email/password or Google), saved addresses, order tracking
- Admin dashboard: products, orders, suppliers, couriers, reports, store settings
- Image upload (Supabase Storage; local `public/uploads` in development)
- Payments: MTN Mobile Money and cash on delivery
- Notifications via email, SMS and WhatsApp, plus PDF invoices and delivery notes

## Troubleshooting

### Port already in use
```bash
# Kill process on port 4000
kill $(lsof -t -i :4000)

# Kill process on port 3000
kill $(lsof -t -i :3000)
```

### Database connection issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check Redis is running
sudo systemctl status redis
```

### Reset database
```bash
cd backend
npx prisma migrate reset
```
