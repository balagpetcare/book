import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.bookSettings.findFirst();
  if (existing) { await prisma.bookSettings.update({ where: { id: existing.id }, data: { title: "বিড়াল পালন ও চিকিৎসা" } }); return; }
  const settings = await prisma.bookSettings.create({ data: { title: "বিড়াল পালন ও চিকিৎসা", author: 'Dr. Bala G', initialStock: 700, prepaidPrice: 350, bangladeshPostDeliveryCharge: 0, courierDeliveryCharge: 100, courierTotalPrice: 450, courierAdvance: 100, courierDue: 350, bkashNumber: '01777889994', nagadNumber: '01777889994', paymentExpiryHours: 24 } });
  await prisma.inventoryTransaction.create({ data: { type: 'INITIAL_STOCK', quantityDelta: settings.initialStock, note: 'Initial inventory seed' } });
}
main().finally(() => prisma.$disconnect());
