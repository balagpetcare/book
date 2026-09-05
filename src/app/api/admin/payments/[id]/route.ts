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

      const confirmedAt = new Date();

      await tx.payment.update({
        where: { id },
        data: { status: "VERIFIED", verifiedAt: confirmedAt, verifiedByAdminId: admin.id },
      });

      const eventId = `purchase_${payment.orderId}`;

      // Build Meta Purchase event payload (to be sent asynchronously)
      const purchasePayload = {
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        value: payment.order.grandTotal,
        currency: "BDT",
        quantity: payment.order.items.reduce((sum, item) => sum + item.quantity, 0),
        productId: "book",
        productName: payment.order.items[0]?.title,
        timestamp: confirmedAt,
        phone: payment.order.mobile,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fbp: (payment.order as any).fbp || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fbc: (payment.order as any).fbc || undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status: "CONFIRMED",
        confirmedAt,
        paidAmount: payment.amount,
        dueAmount: Math.max(0, payment.order.grandTotal - payment.amount),
        metaPurchaseEventId: eventId,
      };

      await tx.order.update({
        where: { id: payment.orderId },
        data: updateData,
      });

      await tx.inventoryTransaction.create({
        data: {
          orderId: payment.orderId,
          type: "PAYMENT_VERIFIED",
          quantityDelta: -quantity,
          note: `Payment ${payment.id} verified`,
        },
      });

      // Create a ConversionEvent for async Meta CAPI processing
      // This ensures the order conversion succeeds even if Meta is unavailable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).conversionEvent.create({
        data: {
          orderId: payment.orderId,
          eventName: "Purchase",
          eventId,
          payload: JSON.stringify(purchasePayload),
          status: "PENDING",
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
