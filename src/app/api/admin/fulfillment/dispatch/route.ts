import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const runtime = "nodejs";

const dispatchSchema = z.object({
  orderIds: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = dispatchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { orderIds } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({ where: { id: { in: orderIds } } });
      
      for (const order of orders) {
        if (!order.printedAt) throw new Error(`Order ${order.orderNumber} is not printed yet.`);
        if (order.dispatchStatus === "DISPATCHED") throw new Error(`Order ${order.orderNumber} is already dispatched.`);
      }

      const now = new Date();
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          dispatchStatus: "DISPATCHED",
          dispatchedAt: now,
          dispatchedByAdminId: admin.id,
        }
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "BULK_DISPATCH",
          metadata: JSON.stringify({ count: orderIds.length })
        }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to dispatch" }, { status: 500 });
  }
}
