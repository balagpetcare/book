import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { legacyCourierDeliveryCharge } from "@/lib/pricing";

export const runtime = "nodejs";

const manualOrderSchema = z.object({
  customerName: z.string().min(1),
  mobile: z.string().min(1),
  alternateMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  areaOrVillage: z.string().min(1),
  upazilaOrThana: z.string().min(1),
  district: z.string().min(1),
  division: z.string().optional(),
  postalCode: z.string().optional(),
  source: z.enum(["PHONE", "SMS", "MESSENGER", "WHATSAPP", "WALK_IN", "OTHER"]),
  deliveryType: z.enum(["COURIER", "BANGLADESH_POST"]),
  quantity: z.coerce.number().int().positive(),
  paidAmount: z.coerce.number().int().min(0),
  paymentMethod: z.enum(["BKASH", "NAGAD", "MANUAL", "CASH"]).optional(),
  transactionId: z.string().optional(),
  internalNote: z.string().optional(),
});

function generateOrderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BG-${result}`;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = manualOrderSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const data = parsed.data;

    // Load canonical settings
    const settings = await prisma.bookSettings.findFirstOrThrow();
    const courierDeliveryCharge = settings.courierDeliveryCharge ?? legacyCourierDeliveryCharge(settings);
    
    // Server-side calculations
    const subtotal = settings.prepaidPrice * data.quantity;
    const deliveryCharge = data.deliveryType === "BANGLADESH_POST" ? settings.bangladeshPostDeliveryCharge : courierDeliveryCharge;
    const grandTotal = subtotal + deliveryCharge;

    if (data.paidAmount > grandTotal) {
      return NextResponse.json({ error: "Paid amount cannot exceed grand total" }, { status: 400 });
    }

    const dueAmount = grandTotal - data.paidAmount;

    // Determine canonical payment plan and order status
    let status: "AWAITING_PAYMENT" | "CONFIRMED" = "AWAITING_PAYMENT";
    const paymentPlan: "PREPAID_350" | "COURIER_ADVANCE_100" = data.deliveryType === "BANGLADESH_POST" ? "PREPAID_350" : "COURIER_ADVANCE_100";

    if (data.paidAmount === grandTotal) {
      status = "CONFIRMED";
    } else if (data.paidAmount > 0) {
      const advanceRequired = settings.courierAdvance || 0;
      if (data.paidAmount >= advanceRequired && data.deliveryType === "COURIER") {
         status = "CONFIRMED";
      } else if (data.deliveryType === "BANGLADESH_POST") {
         status = "CONFIRMED"; 
      } else {
         status = "AWAITING_PAYMENT"; 
      }
    } else {
      if (data.deliveryType === "BANGLADESH_POST") {
        status = "CONFIRMED"; 
      } else {
        status = "AWAITING_PAYMENT";
      }
    }

    let orderNumber = generateOrderNumber();
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      orderNumber = generateOrderNumber();
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: data.customerName,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile || null,
          email: data.email || null,
          areaOrVillage: data.areaOrVillage,
          upazilaOrThana: data.upazilaOrThana,
          district: data.district,
          division: data.division || null,
          postalCode: data.postalCode || null,
          deliveryType: data.deliveryType,
          paymentPlan,
          status,
          confirmedAt: status === "CONFIRMED" ? new Date() : null,
          subtotal,
          deliveryCharge,
          grandTotal,
          payNowAmount: data.paidAmount > 0 ? data.paidAmount : (data.deliveryType === "COURIER" ? settings.courierAdvance : 0),
          paidAmount: data.paidAmount,
          dueAmount,
          source: data.source as "PHONE" | "SMS" | "MESSENGER" | "WHATSAPP" | "WALK_IN" | "OTHER",
          createdByAdminId: admin.id,
          items: {
            create: [{
              title: settings.title,
              quantity: data.quantity,
              unitPrice: settings.prepaidPrice,
              totalPrice: subtotal
            }]
          }
        }
      });

      if (data.paidAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            status: "VERIFIED",
            senderMobile: data.mobile,
            transactionId: data.transactionId || `MANUAL-${Date.now()}`,
            amount: data.paidAmount,
            method: (data.paymentMethod as "BKASH" | "NAGAD" | "MANUAL" | "CASH") || "MANUAL",
            verifiedAt: new Date(),
            verifiedByAdminId: admin.id
          }
        });
      }

      if (status === "CONFIRMED") {
        await tx.inventoryTransaction.create({
          data: {
            orderId: order.id,
            type: "PAYMENT_VERIFIED",
            quantityDelta: -data.quantity,
            note: `Manual order deduction (${data.source})`
          }
        });
      }

      // 4. Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "CREATE_MANUAL_ORDER",
          entityType: "Order",
          entityId: order.id,
          metadata: JSON.stringify({ 
            source: data.source, 
            paid: data.paidAmount,
            internalNote: data.internalNote || null
          })
        }
      });

      return order;
    });

    return NextResponse.json({ ok: true, order: result });
  } catch (error) {
    console.error("Manual order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
