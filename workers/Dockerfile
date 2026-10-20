# Workers Dockerfile
# BullMQ Background Workers

# ============================================
# Base Stage
# ============================================
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat openssl

# ============================================
# Dependencies Stage
# ============================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ============================================
# Development Stage
# ============================================
FROM base AS development

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Copy Prisma schema from backend (shared)
# This will be mounted via docker-compose volume

# Start development workers with hot reload
CMD ["npm", "run", "dev"]

# ============================================
# Builder Stage
# ============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Production Stage
# ============================================
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy Prisma schema for runtime
COPY prisma ./prisma

# Generate Prisma client in production
RUN npx prisma generate

# Set ownership
RUN chown -R worker:nodejs /app

USER worker

# Start workers
CMD ["npm", "start"]
