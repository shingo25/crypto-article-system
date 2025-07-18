-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'CLAUDE', 'GEMINI');

-- CreateTable
CREATE TABLE "ai_provider_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4000,
    "topP" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "frequencyPenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "presencePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "advancedSettings" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "lastModified" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_settings_userId_provider_key" ON "ai_provider_settings"("userId", "provider");

-- AddForeignKey
ALTER TABLE "ai_provider_settings" ADD CONSTRAINT "ai_provider_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
