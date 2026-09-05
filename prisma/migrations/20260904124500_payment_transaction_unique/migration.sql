-- Enforce idempotent manual payment submissions.
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");
