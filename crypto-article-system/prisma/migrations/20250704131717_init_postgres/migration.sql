-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'AUTHOR', 'USER');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'MARKET', 'ALERT', 'NEWS', 'TEMPLATE', 'AI_SUGGESTED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PRICE_ABOVE', 'PRICE_BELOW', 'PRICE_CHANGE', 'VOLUME_SURGE', 'TECHNICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "slug" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "tags" JSONB,
    "keywords" JSONB,
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceData" JSONB,
    "generatedBy" TEXT,
    "templateId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_analytics" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "avgReadTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trafficSources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "guid" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "author" TEXT,
    "sentiment" DOUBLE PRECISION,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "aiSummary" TEXT,
    "topics" JSONB,
    "coins" JSONB,
    "companies" JSONB,
    "products" JSONB,
    "technology" JSONB,
    "market" JSONB,
    "regulatory" JSONB,
    "regions" JSONB,
    "hasGeneratedArticle" BOOLEAN NOT NULL DEFAULT false,
    "generatedArticleId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rss_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCollected" TIMESTAMP(3),
    "totalCollected" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rss_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "condition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_triggers" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "triggerData" JSONB NOT NULL,
    "articleGenerated" BOOLEAN NOT NULL DEFAULT false,
    "articleId" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION,
    "rank" INTEGER,
    "change1h" DOUBLE PRECISION,
    "change24h" DOUBLE PRECISION,
    "change7d" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changePercent" DOUBLE PRECISION,
    "timeframe" TEXT,
    "volume" DOUBLE PRECISION,
    "details" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_indicators" (
    "id" SERIAL NOT NULL,
    "totalMarketCap" DOUBLE PRECISION NOT NULL,
    "btcDominance" DOUBLE PRECISION NOT NULL,
    "fearGreedIndex" INTEGER,
    "totalVolume24h" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_settings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "symbol" TEXT,
    "alertType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "threshold" DOUBLE PRECISION,
    "cooldownHours" INTEGER NOT NULL DEFAULT 4,
    "maxAlertsPerDay" INTEGER NOT NULL DEFAULT 5,
    "maxGlobalAlertsPerDay" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "articlesGenerated" INTEGER NOT NULL DEFAULT 0,
    "templatesUsed" INTEGER NOT NULL DEFAULT 0,
    "newsProcessed" INTEGER NOT NULL DEFAULT 0,
    "alertsTriggered" INTEGER NOT NULL DEFAULT 0,
    "apiRequests" INTEGER NOT NULL DEFAULT 0,
    "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "systemUptime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "article_versions_articleId_version_key" ON "article_versions"("articleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "article_analytics_articleId_date_key" ON "article_analytics"("articleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "news_items_url_key" ON "news_items"("url");

-- CreateIndex
CREATE UNIQUE INDEX "news_items_guid_key" ON "news_items"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "rss_sources_url_key" ON "rss_sources"("url");

-- CreateIndex
CREATE INDEX "price_history_symbol_timestamp_idx" ON "price_history"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "alert_history_symbol_timestamp_idx" ON "alert_history"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "alert_history_level_timestamp_idx" ON "alert_history"("level", "timestamp");

-- CreateIndex
CREATE INDEX "market_indicators_timestamp_idx" ON "market_indicators"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "system_metrics_date_key" ON "system_metrics"("date");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_analytics" ADD CONSTRAINT "article_analytics_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
