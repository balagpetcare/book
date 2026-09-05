-- Add Meta advertising attribution and Conversions API fields to Order model

ALTER TABLE "Order" ADD COLUMN "fbclid" TEXT;
ALTER TABLE "Order" ADD COLUMN "fbp" TEXT;
ALTER TABLE "Order" ADD COLUMN "fbc" TEXT;
ALTER TABLE "Order" ADD COLUMN "utm_source" TEXT;
ALTER TABLE "Order" ADD COLUMN "utm_medium" TEXT;
ALTER TABLE "Order" ADD COLUMN "utm_campaign" TEXT;
ALTER TABLE "Order" ADD COLUMN "utm_content" TEXT;
ALTER TABLE "Order" ADD COLUMN "utm_term" TEXT;
ALTER TABLE "Order" ADD COLUMN "metaPurchaseEventId" TEXT;

CREATE UNIQUE INDEX "Order_metaPurchaseEventId_key"
ON "Order"("metaPurchaseEventId");

-- Create index for idempotency checking on metaPurchaseEventId
CREATE INDEX "Order_metaPurchaseEventId_idx" ON "Order"("metaPurchaseEventId");
