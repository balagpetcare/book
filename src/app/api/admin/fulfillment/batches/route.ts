import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const runtime = "nodejs";

const batchSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  deliveryMethod: z.enum(["BANGLADESH_POST", "COURIER"]),
  layout: z.enum(["9/A4", "12/A4", "15/A4"]).default("9/A4"),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { orderIds, deliveryMethod, layout } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Verify eligibility: Must be valid orders, not already printed (unless forcing a reprint, but normal batch creation is for unprinted)
      // Actually, we could be reprinting. For now, just generate the batch.
      const orders = await tx.order.findMany({ where: { id: { in: orderIds } } });
      if (orders.length !== orderIds.length) throw new Error("Some orders not found.");

      const date = new Date();
      const batchNumber = `PB-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

      const batch = await tx.printBatch.create({
        data: {
          batchNumber,
          deliveryMethod,
          layout,
          createdByAdminId: admin.id,
          items: {
            create: orderIds.map(id => ({ orderId: id }))
          }
        }
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "CREATE_PRINT_BATCH",
          entityType: "PrintBatch",
          entityId: batch.id,
          metadata: JSON.stringify({ count: orderIds.length, deliveryMethod })
        }
      });

      return batch;
    });

    return NextResponse.json({ ok: true, batch: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create batch" }, { status: 500 });
  }
}
