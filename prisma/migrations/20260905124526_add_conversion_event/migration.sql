-- Create ConversionEvent model for Meta Conversions API outbox pattern
-- This ensures Meta events can be retried independently of order transactions

CREATE TABLE "ConversionEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventId" TEXT NOT NULL UNIQUE,
  "payload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lastError" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ConversionEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE
);

CREATE INDEX "ConversionEvent_status_createdAt_idx" ON "ConversionEvent"("status", "createdAt");
CREATE INDEX "ConversionEvent_orderId_idx" ON "ConversionEvent"("orderId");
