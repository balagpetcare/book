ALTER TABLE "BookSettings" ADD COLUMN "bangladeshPostDeliveryCharge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BookSettings" ADD COLUMN "courierDeliveryCharge" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Order" ADD COLUMN "payNowAmount" INTEGER NOT NULL DEFAULT 0;
UPDATE "BookSettings" SET "courierDeliveryCharge" = "courierTotalPrice" - "prepaidPrice";
