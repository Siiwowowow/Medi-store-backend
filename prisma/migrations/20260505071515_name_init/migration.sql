/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'COD');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentId" TEXT;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
    "paymentGatewayData" JSONB,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_transactionId_idx" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_stripePaymentIntentId_idx" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_paymentId_key" ON "orders"("paymentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
