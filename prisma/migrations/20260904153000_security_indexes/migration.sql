

CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
