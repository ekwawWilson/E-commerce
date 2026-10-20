#!/bin/bash
# Production Startup Script

set -e

echo "🚀 Starting E-commerce Production Environment"
echo "=============================================="

# The Docker setup in DOCKER.md was never added to this repository
if [ ! -f docker-compose.prod.yml ]; then
    echo "❌ docker-compose.prod.yml not found. See the note at the top of DOCKER.md."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env.production file exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "   Please create .env.production with your production configuration."
    exit 1
fi

# Validate required environment variables
source .env.production

required_vars=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "CORS_ORIGINS"
    "NEXT_PUBLIC_API_URL"
    "NEXT_PUBLIC_APP_URL"
    "CLOUDINARY_CLOUD_NAME"
    "CLOUDINARY_API_KEY"
    "CLOUDINARY_API_SECRET"
    "SMTP_HOST"
    "SMTP_USER"
    "SMTP_PASS"
    "SMTP_FROM"
    "PAYSTACK_SECRET_KEY"
    "PAYSTACK_PUBLIC_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    exit 1
fi

echo "✅ Environment validation passed"

# Build containers
echo "🔨 Building production containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Start containers
echo "🚀 Starting production containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health status
echo "🏥 Checking service health..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Production environment is running!"
echo ""
echo "📍 Services:"
echo "   Application:     https://your-domain.com"
echo "   Backend API:     https://your-domain.com/api"
echo ""
echo "📍 Commands:"
echo "   View logs:       docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:            docker compose -f docker-compose.prod.yml down"
echo "   Restart:         docker compose -f docker-compose.prod.yml restart"
echo ""
