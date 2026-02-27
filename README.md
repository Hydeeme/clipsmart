# ClipSmart

A production-ready video-to-shorts SaaS platform that transforms long-form videos into viral-ready vertical clips with AI-powered analysis and editing.

## Features

- **Video Upload & Import**: Upload MP4 files or import from YouTube
- **FFmpeg Multi-Step Pipeline**: 
  1. Audio normalization (loudnorm)
  2. Silence detection (silencedetect)
  3. Segment cutting (15-60s)
  4. Safe center-weighted crop
  5. Scale to 1080x1920
  6. Subtitle burn (ASS)
  7. Final render (libx264)
- **AI-Powered Analysis**:
  - Viral Score (0-100) with breakdown
  - Hook generation
  - Title suggestions
  - A/B hook testing
- **Modern UI**: Dark mode, responsive design with Shadcn UI

## Tech Stack

### Backend
- NestJS with TypeScript
- Prisma ORM with PostgreSQL
- BullMQ with Redis for background jobs
- FFmpeg for video processing
- OpenAI GPT / DeepSeek for AI features

### Frontend
- Next.js 14 with App Router
- TypeScript
- TailwindCSS
- Shadcn UI
- Zustand for state management

## Quick Start

### Using Docker Compose

```bash
# Clone the repository
git clone <repo-url>
cd clipsmart

# Create .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Add your API keys to backend/.env
# OPENAI_API_KEY=sk-...

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate dev

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Manual Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
clipsmart/
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── projects/      # Project management
│   │   ├── video/         # Video upload & streaming
│   │   ├── processing/    # Video processing & workers
│   │   ├── ai/            # AI integration (OpenAI/DeepSeek)
│   │   └── common/        # Shared services
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand stores
│   │   └── lib/           # Utilities & API
│   └── Dockerfile
└── docker-compose.yml
```

## Viral Score System

The viral score (0-100) is calculated based on:

| Category | Points | Criteria |
|----------|--------|----------|
| Hook | 30 | Keywords in first 3s, questions, "you/your" |
| Emotion | 20 | Emotional words, exclamation emphasis |
| Pacing | 15 | Words per second, silence frequency |
| Clarity | 15 | Avg sentence length, filler words |
| Platform | 20 | Duration 15-60s, vertical format, subtitles |

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project details
- `GET /api/v1/projects/:id/status` - Get processing status

### Video
- `POST /api/v1/video/:projectId/upload` - Upload video
- `POST /api/v1/video/:projectId/import-youtube` - Import from YouTube
- `GET /api/v1/video/:projectId/stream` - Stream video

## Environment Variables

See `.env.example` files in both `backend` and `frontend` directories.

## License

MIT
