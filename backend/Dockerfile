# PocketShield Backend Production Dockerfile
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S pocketshield -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=build --chown=pocketshield:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=pocketshield:nodejs /app/src ./src
COPY --from=build --chown=pocketshield:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p /var/log/pocketshield && chown pocketshield:nodejs /var/log/pocketshield

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Switch to non-root user
USER pocketshield

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "start"]
