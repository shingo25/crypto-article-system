# Crypto Article System Overview

## Purpose & High-Level Architecture

The Crypto Article System is an AI-driven platform for automated cryptocurrency article generation,
designed to collect trending topics, generate high-quality content, and publish to WordPress
automatically.

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js UI<br/>React + TypeScript]
        WS[WebSocket<br/>Real-time Updates]
    end

    subgraph "API Layer"
        FAPI[FastAPI<br/>REST Endpoints]
        AUTH[Auth Module<br/>JWT + MFA]
    end

    subgraph "Processing Layer"
        QUEUE[Task Queue<br/>Celery + Redis]
        PIPELINE[Article Pipeline<br/>Generation Flow]
        SCHEDULER[Scheduler<br/>Cron Jobs]
    end

    subgraph "Core Services"
        COLLECTOR[Topic Collector<br/>RSS/API/Web]
        GENERATOR[AI Generator<br/>OpenAI/Gemini]
        CHECKER[Fact Checker<br/>Verification]
        PUBLISHER[WP Publisher<br/>Auto-posting]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary DB)]
        REDIS[(Redis<br/>Cache/Queue)]
        PRISMA[Prisma ORM<br/>Type-safe Access]
    end

    subgraph "External Services"
        RSS[RSS Feeds]
        CRYPTO[Crypto APIs]
        AI[AI APIs]
        WP[WordPress]
    end

    UI --> FAPI
    WS --> FAPI
    FAPI --> AUTH
    FAPI --> QUEUE
    QUEUE --> PIPELINE
    SCHEDULER --> PIPELINE
    PIPELINE --> COLLECTOR
    PIPELINE --> GENERATOR
    PIPELINE --> CHECKER
    PIPELINE --> PUBLISHER
    COLLECTOR --> RSS
    COLLECTOR --> CRYPTO
    GENERATOR --> AI
    PUBLISHER --> WP
    FAPI --> PG
    QUEUE --> REDIS
    UI --> PRISMA
    PRISMA --> PG
```

## Major Tech Choices

- Next.js 15 + TypeScript: Modern React framework with App Router for optimal performance and SEO
- FastAPI + Python 3.12: High-performance async API framework with automatic OpenAPI documentation
- PostgreSQL + Prisma: Robust relational database with type-safe ORM for data integrity
- Celery + Redis: Distributed task queue for scalable async processing
- Docker + Docker Compose: Containerized deployment for consistent environments
- Tailwind CSS + Radix UI: Utility-first styling with accessible component library
- OpenAI GPT-4 / Gemini: Multiple AI providers for flexible article generation
- Socket.io + BullMQ: Real-time updates and reliable job processing

## System Boundaries

### What IS Covered

- Automated topic collection from cryptocurrency news sources
- AI-powered article generation with multiple templates
- Multi-tenant organization support with role-based access
- Fact-checking and content scoring
- Automated WordPress publishing
- Real-time monitoring and analytics
- Comprehensive security with MFA and audit logging

### What is NOT Covered

- Direct trading or financial advice functionality
- Personal wallet management
- Blockchain interaction or smart contract deployment
- User-generated content moderation
- Multi-language support (currently Japanese/English only)
- Mobile native applications
- Third-party plugin development framework