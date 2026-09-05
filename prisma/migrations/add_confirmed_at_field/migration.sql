-- Add confirmedAt field to Order model to track when an order reaches CONFIRMED status
ALTER TABLE "Order" ADD COLUMN "confirmedAt" DATETIME;
