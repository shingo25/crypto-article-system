/*
  Warnings:

  - Added the required column `organizationId` to the `ai_provider_settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `alert_settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `article_analytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'MEMBER');

-- CreateTable (organizations を先に作成)
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "settings" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- デフォルト組織を作成
INSERT INTO "organizations" ("id", "name", "slug", "updatedAt") 
VALUES ('default-org', 'Default Organization', 'default', CURRENT_TIMESTAMP);

-- 既存ユーザーをデフォルト組織に所属させる
INSERT INTO "organization_memberships" ("id", "userId", "organizationId", "role")
SELECT 
  'membership-' || "id",
  "id",
  'default-org',
  CASE 
    WHEN "role" = 'ADMIN' THEN 'ADMIN'::"MemberRole"
    WHEN "role" = 'EDITOR' THEN 'EDITOR'::"MemberRole"
    ELSE 'MEMBER'::"MemberRole"
  END
FROM "users";

-- AlterTable (デフォルト値を指定してカラム追加)
ALTER TABLE "ai_provider_settings" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "alert_settings" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "article_analytics" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "articles" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "templates" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';

-- デフォルト値を削除（今後は明示的に指定することを強制）
ALTER TABLE "ai_provider_settings" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "alert_settings" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "article_analytics" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "articles" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "templates" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaBackupCodes" JSONB,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT;

-- organizations と organization_memberships は上で作成済み

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_userId_organizationId_key" ON "organization_memberships"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "alert_settings_organizationId_idx" ON "alert_settings"("organizationId");

-- CreateIndex
CREATE INDEX "article_analytics_organizationId_date_idx" ON "article_analytics"("organizationId", "date");

-- CreateIndex
CREATE INDEX "articles_organizationId_idx" ON "articles"("organizationId");

-- CreateIndex
CREATE INDEX "templates_organizationId_idx" ON "templates"("organizationId");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_analytics" ADD CONSTRAINT "article_analytics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_provider_settings" ADD CONSTRAINT "ai_provider_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
