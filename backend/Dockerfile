# Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install FFmpeg and other runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    ffprobe \
    python3 \
    py3-pip \
    py3-numpy

# Install faster-whisper
RUN pip3 install faster-whisper

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads and processed directories
RUN mkdir -p uploads processed

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
