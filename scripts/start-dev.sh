#!/bin/bash
# Development Startup Script

set -e

echo "🚀 Starting E-commerce Development Environment"
echo "================================================"

# The Docker setup in DOCKER.md was never added to this repository
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found. See the note at the top of DOCKER.md."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration values"
fi

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run Prisma migrations
echo "📦 Running database migrations..."
docker compose exec -T backend npx prisma migrate deploy

# Seed database if needed
if [ "$1" = "--seed" ]; then
    echo "🌱 Seeding database..."
    docker compose exec -T backend npm run db:seed
fi

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📍 Services:"
echo "   Frontend:        http://localhost:3000"
echo "   Backend API:     http://localhost:4000"
echo "   API Docs:        http://localhost:4000/api-docs"
echo "   Mailpit UI:      http://localhost:8025"
echo ""
echo "📍 Dev Tools (use --profile dev-tools to enable):"
echo "   pgAdmin:         http://localhost:5050"
echo "   Redis Commander: http://localhost:8081"
echo ""
echo "📍 Commands:"
echo "   View logs:       docker compose logs -f"
echo "   Stop:            docker compose down"
echo "   Restart:         docker compose restart"
echo ""
