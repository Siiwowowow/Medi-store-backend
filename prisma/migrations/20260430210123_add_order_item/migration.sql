-- AlterTable
ALTER TABLE "medicines" ADD COLUMN     "orderCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "medicines_orderCount_idx" ON "medicines"("orderCount");
