import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { batchId } = await params;
    
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.printBatch.findUnique({
        where: { id: batchId },
        include: { items: true }
      });
      if (!batch) throw new Error("Batch not found");

      const now = new Date();
      const orderIds = batch.items.map(i => i.orderId);
      
      const orders = await tx.order.findMany({ where: { id: { in: orderIds } } });
      
      // Update batch
      await tx.printBatch.update({
        where: { id: batchId },
        data: {
          printedAt: batch.printedAt || now,
          printedByAdminId: batch.printedByAdminId || admin.id,
          status: "PRINTED"
        }
      });

      // Update orders
      for (const o of orders) {
        await tx.order.update({
          where: { id: o.id },
          data: {
            printedAt: o.printedAt || now,
            printedByAdminId: o.printedByAdminId || admin.id,
            printCount: o.printCount + 1
          }
        });
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: batch.printedAt ? "REPRINT_BATCH" : "MARK_BATCH_PRINTED",
          entityType: "PrintBatch",
          entityId: batch.id,
          metadata: JSON.stringify({ count: orderIds.length })
        }
      });

      return batch;
    });

    return NextResponse.json({ ok: true, batch: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark printed" }, { status: 500 });
  }
}
