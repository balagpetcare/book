import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().optional(),
  tab: z.enum(["BANGLADESH_POST", "COURIER", "READY_FOR_DISPATCH", "PRINTED_HISTORY"]).default("BANGLADESH_POST"),
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

    const { page, pageSize, search, tab } = parsed.data;
    const skip = (page - 1) * pageSize;

    if (tab === "PRINTED_HISTORY") {
      const where: Record<string, unknown> = {};
      if (search) {
        where.batchNumber = { contains: search.toLowerCase().trim() };
      }
      const [items, totalItems] = await Promise.all([
        prisma.printBatch.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: { _count: { select: { items: true } } }
        }),
        prisma.printBatch.count({ where }),
      ]);
      return NextResponse.json({ ok: true, items, page, pageSize, totalItems });
    }

    const where: Record<string, unknown> = {
      status: { notIn: ["CANCELLED", "RETURNED", "AWAITING_PAYMENT"] }, // Basic eligibility (prepaid not fully verified usually stays AWAITING_PAYMENT until verified)
    };

    if (tab === "BANGLADESH_POST") {
      where.deliveryType = "BANGLADESH_POST";
      where.printedAt = null; // Unprinted only by default
    } else if (tab === "COURIER") {
      where.deliveryType = "COURIER";
      where.printedAt = null;
    } else if (tab === "READY_FOR_DISPATCH") {
      where.printedAt = { not: null };
      where.dispatchStatus = "NOT_DISPATCHED";
    }

    if (search) {
      const searchLower = search.toLowerCase().trim();
      let mobileQuery = searchLower.replace(/[\s\-+]/g, '');
      if (mobileQuery.startsWith('88')) mobileQuery = mobileQuery.substring(2);
      if (mobileQuery.startsWith('0')) mobileQuery = mobileQuery.substring(1);

      const orConditions: Record<string, unknown>[] = [
        { orderNumber: { contains: searchLower } },
        { customerName: { contains: searchLower } },
        { district: { contains: searchLower } },
        { upazilaOrThana: { contains: searchLower } },
      ];
      if (mobileQuery.length > 0) orConditions.push({ mobile: { contains: mobileQuery } });
      where.OR = orConditions;
    }

    const [items, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ ok: true, items, page, pageSize, totalItems });
  } catch (error) {
    console.error("Fulfillment list failed", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
