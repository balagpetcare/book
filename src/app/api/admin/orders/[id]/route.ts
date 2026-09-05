import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const runtime = "nodejs";

const orderActionSchema = z.object({
  action: z.enum(["PACK", "SHIP", "DELIVER", "CANCEL", "RETURN", "RESTOCK_RETURN", "PRINT", "DISPATCH", "UPDATE_TRACKING"]),
  carrierName: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = orderActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order action." }, { status: 400 });

  const body = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true, inventoryTransactions: true },
      });

      if (!order) throw new Error("Order not found.");

      const action = String(body.action);
      const data: Record<string, unknown> = {};

      if (action === "PACK") {
        data.status = "PACKED";
      } else if (action === "SHIP") {
        if (!body.carrierName || !body.trackingNumber) throw new Error("Carrier and tracking number are required.");
        data.status = "SHIPPED";
        data.carrierName = String(body.carrierName);
        data.trackingNumber = String(body.trackingNumber);
        data.shippedAt = new Date();
      } else if (action === "DELIVER") {
        data.status = "DELIVERED";
        data.deliveredAt = new Date();
      } else if (action === "CANCEL") {
        if (["SHIPPED", "DELIVERED", "RETURNED"].includes(order.status)) throw new Error("This order cannot be cancelled now.");
        data.status = "CANCELLED";
        const paid = order.inventoryTransactions.some((t) => t.type === "PAYMENT_VERIFIED");
        if (paid && !order.inventoryTransactions.some((t) => t.type === "CANCEL_RESTORATION")) {
          await tx.inventoryTransaction.create({
            data: {
              orderId: id,
              type: "CANCEL_RESTORATION",
              quantityDelta: order.items.reduce((n, i) => n + i.quantity, 0),
              note: "Cancelled before shipping",
            },
          });
        }
      } else if (action === "RETURN") {
        if (order.status !== "DELIVERED" && order.status !== "SHIPPED") throw new Error("Only shipped or delivered orders can be returned.");
        data.status = "RETURNED";
      } else if (action === "RESTOCK_RETURN") {
        if (order.status !== "RETURNED") throw new Error("Order must be returned first.");
        if (order.inventoryTransactions.some((t) => t.type === "RETURN_RESTORATION")) throw new Error("Returned stock was already restored.");
        await tx.inventoryTransaction.create({
          data: {
            orderId: id,
            type: "RETURN_RESTORATION",
            quantityDelta: order.items.reduce((n, i) => n + i.quantity, 0),
            note: "Explicit admin return restock",
          },
        });
        return "restocked";
      } else if (action === "PRINT") {
        if (!order.printedAt) {
          data.printedAt = new Date();
          data.printedByAdminId = admin.id;
        }
        data.printCount = order.printCount + 1;
      } else if (action === "DISPATCH") {
        if (order.dispatchStatus === "DISPATCHED") throw new Error("This order has already been dispatched. Cannot dispatch again.");
        data.dispatchStatus = "DISPATCHED";
        data.dispatchedAt = new Date();
        data.dispatchedByAdminId = admin.id;
      } else if (action === "UPDATE_TRACKING") {
        data.trackingNumber = body.trackingNumber || null;
        if (body.carrierName) data.carrierName = String(body.carrierName);
      } else {
        throw new Error("Unknown order action.");
      }

      await tx.order.update({ where: { id }, data });
      await tx.adminAuditLog.create({
        data: { adminUserId: admin.id, action, entityType: "Order", entityId: id },
      });

      return action;
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed." }, { status: 400 });
  }
}
