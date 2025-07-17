# Quick Start Guide

## Prerequisites

- Docker & Docker Compose (recommended) or:
  - Node.js 18+ & pnpm
  - Python 3.12+
  - PostgreSQL 15+
  - Redis 7+

## 5-Step Local Setup

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/shingo25/crypto-article-system.git
cd crypto-article-system

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Required: OPENAI_API_KEY
# Optional: GEMINI_API_KEY, COINMARKETCAP_API_KEY
```

### 2. Docker Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Manual Setup (Alternative)

```bash
# Backend setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd crypto-article-system
pnpm install
pnpm build

# Database setup
cd prisma
pnpm prisma migrate deploy
```

### 4. Start Services

```bash
# Using Docker
# Already running from step 2

# Manual start
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start PostgreSQL
# (Ensure PostgreSQL is running)

# Terminal 3: Start Backend
PYTHONPATH=. python api_server.py

# Terminal 4: Start Frontend
cd crypto-article-system
pnpm dev

# Terminal 5: Start Celery Worker
celery -A celery_app worker --loglevel=info

# Terminal 6: Start Scheduler
python scheduler.py
```

### 5. Access the System

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Default Login: admin@crypto-system.local / ChangeMe123!

## One-Click Demo Article Generation

```bash
# Run the seed script
./scripts/generate_demo_article.sh

# Or using pnpm
pnpm demo

# This will:
# 1. Collect sample topics
# 2. Generate a demo article
# 3. Save to drafts
# 4. Open in browser
```

## Common Pitfalls & FAQ

### Issue: "Connection refused" on localhost:3000

Solution: Ensure all services are running. Check with:
```bash
docker-compose ps  # For Docker
# or
ps aux | grep -E 'node|python'  # For manual setup
```

### Issue: "Invalid API key" errors

Solution:
1. Verify .env file has correct API keys
2. Restart services after changing .env
3. Test connection in Settings > API Settings

### Issue: "Database connection failed"

Solution:
```bash
# Docker: Reset database
docker-compose down -v
docker-compose up -d

# Manual: Check PostgreSQL
psql -U postgres -c "\l"
```

### Issue: "Module not found" errors

Solution:
```bash
# Python
pip install -r requirements.txt --upgrade

# Node.js
cd crypto-article-system
pnpm install
```

### Issue: WordPress connection fails

Solution:
1. Enable Application Passwords in WordPress
2. Use format: https://site.com (no trailing slash)
3. Test with: curl -u username:app_password https://site.com/wp-json/wp/v2/posts

### Issue: High memory usage

Solution:
```bash
# Limit Docker resources
docker-compose down
# Edit docker-compose.yml to add memory limits
docker-compose up -d
```

## Development Tips

### Hot Reload

- Frontend: Automatic with Next.js
- Backend: Use --reload flag:
```bash
uvicorn api_server:app --reload
```

### Database Access

```bash
# Docker
docker-compose exec postgres psql -U postgres crypto_articles

# Direct
psql postgresql://postgres:password@localhost/crypto_articles
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
tail -f logs/article_pipeline.log
```

### Reset Everything

```bash
# Complete reset
docker-compose down -v
rm -rf output/* logs/*
docker-compose up -d
```