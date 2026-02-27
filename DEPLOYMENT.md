# ClipSmart Deployment Guide

## Prerequisites

- Node.js 18+ (backend & frontend)
- PostgreSQL 14+
- Redis 7+
- FFmpeg installed on the system
- Python 3.9+ with faster-whisper installed

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clipsmart?schema=public

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
AI_PROVIDER=openai

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Storage
UPLOAD_DIR=./uploads
PROCESSED_DIR=./processed
MAX_FILE_SIZE=2147483648

# App
NODE_ENV=production
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# FFmpeg
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# Whisper
WHISPER_MODEL=base
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Local Development

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate dev

# View logs
docker-compose logs -f backend
```

### Manual Setup

1. **Database Setup**
```bash
# Start PostgreSQL and Redis
# Create database

# Run migrations
cd backend
npx prisma migrate dev
npx prisma generate
```

2. **Install FFmpeg**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

3. **Install Whisper**
```bash
pip install faster-whisper
```

4. **Start Backend**
```bash
cd backend
npm install
npm run start:dev
```

5. **Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment

### Vercel (Frontend)

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables in Vercel dashboard
4. Deploy

### Railway (Backend)

1. Connect your GitHub repo to Railway
2. Set Dockerfile path to `backend/Dockerfile`
3. Add environment variables:
   - `DATABASE_URL` (use Railway PostgreSQL)
   - `REDIS_URL` (use Railway Redis)
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
4. Deploy

### Manual Server Deployment

1. **Clone and Build**
```bash
git clone <repo>
cd clipsmart

# Build backend
cd backend
npm ci
npm run build

# Build frontend
cd ../frontend
npm ci
npm run build
```

2. **Setup Database**
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

3. **Install FFmpeg and Whisper**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg
pip3 install faster-whisper

# Create directories
mkdir -p uploads processed
```

4. **Start with PM2**
```bash
# Backend
pm2 start dist/main.js --name clipsmart-api

# Frontend (using serve)
pm install -g serve
pm2 start "serve -s dist -l 3000" --name clipsmart-web
```

5. **Setup Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

- Use Railway dashboard for backend metrics
- Use Vercel analytics for frontend
- Set up Sentry for error tracking

## Scaling

1. **Horizontal Scaling**
   - Use Redis for session sharing
   - Store uploads on S3/R2
   - Use managed PostgreSQL

2. **Background Workers**
   - Scale worker processes independently
   - Monitor queue depth
   - Set up alerts for failed jobs

## Security Checklist

- [ ] Use strong JWT secret
- [ ] Enable CORS properly
- [ ] Set up rate limiting
- [ ] Use HTTPS only
- [ ] Sanitize user inputs
- [ ] Validate file uploads
- [ ] Set up proper logging
