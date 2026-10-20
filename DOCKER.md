# Docker Setup Guide

> **Status: not available.** This guide describes a Docker Compose setup whose
> files (`docker-compose.yml`, `docker-compose.prod.yml` and the backend/frontend
> Dockerfiles) are not in this repository, so none of the commands below work as-is.
> For local development follow [README.md](README.md); production runs on Render
> (backend) and Vercel (frontend), see [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

This document explains how to run the e-commerce application using Docker.

## Prerequisites

- Docker Engine 24.0+
- Docker Compose v2.20+
- At least 4GB RAM available for Docker

## Quick Start (Development)

1. **Clone and configure**
   ```bash
   # Copy environment file
   cp .env.example .env

   # Edit .env with your configuration
   nano .env
   ```

2. **Start the application**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh

   # Start development environment
   ./scripts/start-dev.sh

   # Or with database seeding
   ./scripts/start-dev.sh --seed
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - API Docs: http://localhost:4000/api-docs
   - Mailpit (Email): http://localhost:8025

## Development Commands

```bash
# Start all services
docker compose up -d

# Start with dev tools (pgAdmin, Redis Commander)
docker compose --profile dev-tools up -d

# View logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Rebuild containers
docker compose up -d --build

# Run Prisma migrations
docker compose exec backend npx prisma migrate deploy

# Seed database
docker compose exec backend npm run db:seed

# Access container shell
docker compose exec backend sh
docker compose exec frontend sh

# View Prisma Studio
docker compose exec backend npx prisma studio
```

## Production Deployment

1. **Configure production environment**
   ```bash
   # Copy production environment template
   cp .env.production.example .env.production

   # Edit with your production values
   nano .env.production
   ```

2. **Set up SSL certificates**
   ```bash
   # Option 1: Let's Encrypt (recommended)
   certbot certonly --standalone -d yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

   # Option 2: Self-signed (testing only)
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/ssl/privkey.pem \
     -out nginx/ssl/fullchain.pem
   ```

3. **Deploy**
   ```bash
   # Start production environment
   ./scripts/start-prod.sh
   ```

## Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Reverse Proxy)                │
│                      Port 80/443 (external)                 │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
    ┌───────────────────────┐   ┌───────────────────────┐
    │      Frontend         │   │       Backend         │
    │    (Next.js:3000)     │   │   (Express.js:4000)   │
    └───────────────────────┘   └───────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        ┌───────────────────────┐           ┌───────────────────────┐
        │     PostgreSQL        │           │        Redis          │
        │      Port 5432        │           │      Port 6379        │
        └───────────────────────┘           └───────────────────────┘
```

## Database Management

### Migrations

```bash
# Run pending migrations
docker compose exec backend npx prisma migrate deploy

# Create new migration (development)
docker compose exec backend npx prisma migrate dev --name migration_name

# Reset database (WARNING: destroys all data)
docker compose exec backend npx prisma migrate reset
```

### Backup & Restore

```bash
# Create backup
./scripts/backup-db.sh

# Restore from backup
./scripts/restore-db.sh ./backups/ecommerce_backup_20240101_120000.sql.gz
```

## Monitoring

### Health Checks

All services have built-in health checks:

```bash
# Check service health
docker compose ps

# Backend health
curl http://localhost:4000/health

# Frontend health
curl http://localhost:3000/api/health
```

### Logs

```bash
# All services
docker compose logs -f

# Specific service with timestamps
docker compose logs -f --timestamps backend

# Last 100 lines
docker compose logs --tail=100 backend
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   lsof -i :3000

   # Change port in .env
   FRONTEND_PORT=3001
   ```

2. **Database connection failed**
   ```bash
   # Check if postgres is healthy
   docker compose ps postgres

   # View postgres logs
   docker compose logs postgres

   # Restart postgres
   docker compose restart postgres
   ```

3. **Build fails with memory error**
   ```bash
   # Increase Docker memory limit (Docker Desktop settings)
   # Or use build with limited parallelism
   docker compose build --parallel 1
   ```

4. **Prisma client mismatch**
   ```bash
   # Regenerate Prisma client
   docker compose exec backend npx prisma generate
   docker compose restart backend
   ```

### Cleanup

```bash
# Remove containers and networks
docker compose down

# Remove containers, networks, and volumes (WARNING: destroys data)
docker compose down -v

# Remove all unused images
docker system prune -a

# Remove everything including volumes
docker system prune -a --volumes
```

## Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `REDIS_PASSWORD` | Redis password |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `CLOUDINARY_*` | Cloudinary credentials |
| `SMTP_*` | Email server configuration |
| `PAYSTACK_*` | Payment gateway keys |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PORT` | 5432 | PostgreSQL external port |
| `REDIS_PORT` | 6379 | Redis external port |
| `BACKEND_PORT` | 4000 | Backend API port |
| `FRONTEND_PORT` | 3000 | Frontend port |

## Security Recommendations

1. **Production secrets**
   - Use strong, unique passwords
   - Generate JWT secrets with `openssl rand -base64 64`
   - Never commit `.env.production` to git

2. **Network security**
   - Use internal networks for database/redis
   - Only expose ports through nginx
   - Enable SSL in production

3. **Updates**
   - Regularly update base images
   - Monitor for security advisories
   - Keep dependencies updated
