import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
    }

    const { page, pageSize, search, status, method } = parsed.data;

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (method && method !== "ALL") {
      where.method = method;
    }

    if (search) {
      const searchLower = search.toLowerCase().trim();
      let mobileQuery = searchLower.replace(/[\s\-+]/g, '');
      if (mobileQuery.startsWith('88')) {
        mobileQuery = mobileQuery.substring(2);
      }
      if (mobileQuery.startsWith('0')) {
        mobileQuery = mobileQuery.substring(1);
      }

      const orConditions: Record<string, unknown>[] = [
        { transactionId: { contains: searchLower } },
        { order: { orderNumber: { contains: searchLower } } },
        { order: { customerName: { contains: searchLower } } },
      ];
      
      if (mobileQuery.length > 0) {
        orConditions.push({ senderMobile: { contains: mobileQuery } });
        orConditions.push({ order: { mobile: { contains: mobileQuery } } });
      }

      where.OR = orConditions;
    }

    const skip = (page - 1) * pageSize;

    const [items, totalItems] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          order: {
            select: { id: true, orderNumber: true, customerName: true, mobile: true, grandTotal: true, payNowAmount: true, status: true, dueAmount: true }
          },
          verifiedByAdmin: { select: { name: true } }
        },
      }),
      prisma.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;

    return NextResponse.json({
      ok: true,
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
    });
  } catch (error) {
    console.error("Payments list failed", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

const manualPaymentSchema = z.object({
  orderId: z.string(),
  method: z.enum(["BKASH", "NAGAD", "MANUAL", "CASH"]),
  senderMobile: z.string(),
  transactionId: z.string(),
  amount: z.coerce.number().int().positive(),
  adminNote: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = manualPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment payload", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const existingTx = await prisma.payment.findFirst({ where: { transactionId: data.transactionId } });
    if (existingTx && data.transactionId.toLowerCase() !== "cash" && data.transactionId.toLowerCase() !== "manual") {
       return NextResponse.json({ error: "Transaction ID already used in another payment" }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orderId: order.id,
          status: "SUBMITTED",
          method: data.method as import("@prisma/client").PaymentMethod,
          senderMobile: data.senderMobile,
          transactionId: data.transactionId,
          amount: data.amount,
        }
      });
      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "CREATE_MANUAL_PAYMENT",
          entityType: "Payment",
          entityId: p.id,
          metadata: JSON.stringify({ adminNote: data.adminNote })
        }
      });
      return p;
    });

    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    console.error("Failed to create manual payment", error);
    return NextResponse.json({ error: "Failed to create manual payment" }, { status: 500 });
  }
}
