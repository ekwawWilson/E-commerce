#!/bin/sh
set -e

echo "🚀 Starting backend application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
max_retries=30
counter=0

until node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('✅ Database connected'); process.exit(0); })
  .catch(() => process.exit(1));
" 2>/dev/null; do
  counter=$((counter + 1))
  if [ $counter -ge $max_retries ]; then
    echo "❌ Failed to connect to database after $max_retries attempts"
    exit 1
  fi
  echo "⏳ Waiting for database... (attempt $counter/$max_retries)"
  sleep 2
done

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "✅ Starting server..."
exec node dist/index.js
