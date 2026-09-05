import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { paymentActionSchema } from "@/lib/admin-validation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = paymentActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment action." }, { status: 400 });

  const body = parsed.data;
  const action = body.action;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { order: { include: { items: true } } },
      });

      if (!payment) throw new Error("Payment not found.");

      if (action === "REJECT") {
        if (payment.status === "VERIFIED") throw new Error("Verified payments cannot be rejected.");

        await tx.payment.update({
          where: { id },
          data: { status: "REJECTED", rejectionReason: String(body.reason || "Rejected by admin") },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "AWAITING_PAYMENT" },
        });

        await tx.adminAuditLog.create({
          data: { adminUserId: admin.id, action: "REJECT_PAYMENT", entityType: "Payment", entityId: id },
        });

        return "rejected";
      }

      if (action !== "VERIFY") throw new Error("Unknown action.");
      if (payment.status === "VERIFIED") return "already_verified";

      const quantity = payment.order.items.reduce((sum, item) => sum + item.quantity, 0);
      const stock = (await tx.inventoryTransaction.aggregate({ _sum: { quantityDelta: true } }))._sum.quantityDelta ?? 0;

      if (stock < quantity) throw new Error(`Not enough stock. Available: ${stock}.`);

      await tx.payment.update({
        where: { id },
        data: { status: "VERIFIED", verifiedAt: new Date(), verifiedByAdminId: admin.id },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          paidAmount: payment.amount,
          dueAmount: Math.max(0, payment.order.grandTotal - payment.amount),
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          orderId: payment.orderId,
          type: "PAYMENT_VERIFIED",
          quantityDelta: -quantity,
          note: `Payment ${payment.id} verified`,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "VERIFY_PAYMENT_AND_DEDUCT_STOCK",
          entityType: "Payment",
          entityId: id,
          metadata: JSON.stringify({ quantity }),
        },
      });

      return "verified";
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed." }, { status: 400 });
  }
}
