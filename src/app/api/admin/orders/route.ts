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
  paymentStatus: z.string().optional(),
  deliveryMethod: z.string().optional(),
  printStatus: z.enum(["NOT_PRINTED", "PRINTED"]).optional(),
  dispatchStatus: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
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

    const { page, pageSize, search, status, paymentStatus, deliveryMethod, printStatus, dispatchStatus, dateFrom, dateTo } = parsed.data;

    type WhereClause = Record<string, unknown>;
    const where: WhereClause = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (deliveryMethod && deliveryMethod !== "ALL") {
      where.deliveryType = deliveryMethod;
    }

    if (dispatchStatus && dispatchStatus !== "ALL") {
      where.dispatchStatus = dispatchStatus;
    }

    if (printStatus === "PRINTED") {
      where.printedAt = { not: null };
    } else if (printStatus === "NOT_PRINTED") {
      where.printedAt = null;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.createdAt = dateFilter;
    }

    if (search) {
      const searchLower = search.toLowerCase().trim();
      let mobileQuery = searchLower.replace(/[\s\-+]/g, '');
      if (mobileQuery.startsWith('88')) {
        mobileQuery = mobileQuery.substring(2); // keep the leading 0 if 880, or remove 88
      }
      if (mobileQuery.startsWith('0')) {
        mobileQuery = mobileQuery.substring(1); // remove leading 0 for partial matching
      }

      const orConditions: Record<string, unknown>[] = [
        { orderNumber: { contains: searchLower } },
        { customerName: { contains: searchLower } },
        { trackingNumber: { contains: searchLower } },
      ];
      
      if (mobileQuery.length > 0) {
        orConditions.push({ mobile: { contains: mobileQuery } });
      }

      where.OR = orConditions;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      where.payments = {
        some: {
          status: paymentStatus,
        },
      };
    }

    const skip = (page - 1) * pageSize;

    const [items, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          mobile: true,
          district: true,
          upazilaOrThana: true,
          areaOrVillage: true,
          deliveryType: true,
          grandTotal: true,
          payNowAmount: true,
          paidAmount: true,
          dueAmount: true,
          status: true,
          printedAt: true,
          dispatchStatus: true,
          trackingNumber: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          shippedAt: true,
          deliveredAt: true,
          dispatchedAt: true,
          payments: {
            select: {
              id: true,
              status: true,
              method: true,
              senderMobile: true,
              createdAt: true,
              verifiedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          items: true,
        },
      }),
      prisma.order.count({ where }),
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
    console.error("Orders list failed", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { customerName, mobile, district, upazilaOrThana, fullAddress, postalCode, deliveryMethod, paymentPlan } = body;

    if (!customerName || !mobile || !district || !upazilaOrThana || !fullAddress || !deliveryMethod || !paymentPlan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const settings = await prisma.bookSettings.findFirst();
    if (!settings) {
      return NextResponse.json({ error: "Book settings not configured" }, { status: 500 });
    }

    const recentOrder = await prisma.order.findFirst({
      where: {
        mobile,
        status: { not: "CANCELLED" },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const date = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const orderCount = (await prisma.order.count()) + 1;
    const orderNumber = `BG-${date}-${String(orderCount).padStart(5, "0")}`;

    const post = deliveryMethod === "BANGLADESH_POST";
    const deliveryCharge = post ? settings.bangladeshPostDeliveryCharge : settings.courierDeliveryCharge;
    const grandTotal = settings.prepaidPrice + deliveryCharge;
    const dueAmount = paymentPlan === "COURIER_ADVANCE_100" ? grandTotal - 100 : 0;

    const order = await prisma.$transaction((tx) =>
      tx.order.create({
        data: {
          orderNumber,
          customerName,
          mobile,
          district,
          upazilaOrThana,
          areaOrVillage: fullAddress,
          postalCode: postalCode || null,
          deliveryType: deliveryMethod,
          paymentPlan,
          status: "AWAITING_PAYMENT",
          subtotal: settings.prepaidPrice,
          deliveryCharge,
          grandTotal,
          payNowAmount: paymentPlan === "COURIER_ADVANCE_100" ? 100 : settings.prepaidPrice,
          paidAmount: 0,
          dueAmount,
          items: {
            create: {
              title: settings.title,
              quantity: 1,
              unitPrice: settings.prepaidPrice,
              totalPrice: settings.prepaidPrice,
            },
          },
        },
      })
    );

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "MANUAL_CREATE",
        entityType: "Order",
        entityId: order.id,
        metadata: JSON.stringify({ orderNumber: order.orderNumber }),
      },
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      recentOrderWarning: recentOrder ? { orderNumber: recentOrder.orderNumber, daysOld: 0 } : null,
    });
  } catch (error) {
    console.error("Manual order creation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create order" }, { status: 500 });
  }
}
