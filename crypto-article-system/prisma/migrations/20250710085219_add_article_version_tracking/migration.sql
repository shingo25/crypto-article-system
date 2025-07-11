-- AlterTable
ALTER TABLE "article_versions" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "changeType" TEXT;

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
