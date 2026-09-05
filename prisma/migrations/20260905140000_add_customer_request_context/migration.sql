-- Preserve customer request context captured when the order is created.
ALTER TABLE "Order" ADD COLUMN "customerUserAgent" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerIpAddress" TEXT;
