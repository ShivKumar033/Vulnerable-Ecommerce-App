-- Add Loyalty Points Expiry Fields
ALTER TABLE "loyalty_points" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;
ALTER TABLE "loyalty_points" ADD COLUMN IF NOT EXISTS "lastEarnedAt" TIMESTAMP;

