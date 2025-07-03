/*
  Warnings:

  - Added the required column `guid` to the `news_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "rss_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCollected" DATETIME,
    "totalCollected" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_news_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "guid" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "author" TEXT,
    "sentiment" REAL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "aiSummary" TEXT,
    "topics" JSONB,
    "coins" JSONB,
    "hasGeneratedArticle" BOOLEAN NOT NULL DEFAULT false,
    "generatedArticleId" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_news_items" ("aiSummary", "author", "coins", "content", "createdAt", "generatedArticleId", "hasGeneratedArticle", "id", "imageUrl", "importance", "publishedAt", "sentiment", "source", "summary", "title", "topics", "updatedAt", "url") SELECT "aiSummary", "author", "coins", "content", "createdAt", "generatedArticleId", "hasGeneratedArticle", "id", "imageUrl", "importance", "publishedAt", "sentiment", "source", "summary", "title", "topics", "updatedAt", "url" FROM "news_items";
DROP TABLE "news_items";
ALTER TABLE "new_news_items" RENAME TO "news_items";
CREATE UNIQUE INDEX "news_items_url_key" ON "news_items"("url");
CREATE UNIQUE INDEX "news_items_guid_key" ON "news_items"("guid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "rss_sources_url_key" ON "rss_sources"("url");
