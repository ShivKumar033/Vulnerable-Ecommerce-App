-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT;

-- CreateTable
CREATE TABLE "loyalty_points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarnings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_point_transactions" (
    "id" TEXT NOT NULL,
    "loyaltyPointId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DECIMAL(12,2) NOT NULL,
    "currentBalance" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchasedById" TEXT,
    "redeemedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_transactions" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "approvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_points_userId_key" ON "loyalty_points"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- AddForeignKey
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_loyaltyPointId_fkey" FOREIGN KEY ("loyaltyPointId") REFERENCES "loyalty_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
