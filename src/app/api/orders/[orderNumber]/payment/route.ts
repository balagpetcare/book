import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshMobile, paymentInputSchema } from "@/lib/order-validation";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  try {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status !== "AWAITING_PAYMENT") return NextResponse.json({ error: "Payment has already been submitted for this order.", orderNumber }, { status: 409 });
    const form = await request.formData();
    const parsed = paymentInputSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) return NextResponse.json({ error: "Please correct the payment details.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const proof = form.get("proof") instanceof File && (form.get("proof") as File).size > 0 ? form.get("proof") as File : undefined;
    if (proof && (proof.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(proof.type))) return NextResponse.json({ error: "Proof must be an image up to 5MB." }, { status: 400 });
    const settings = order.payNowAmount > 0 ? null : await prisma.bookSettings.findFirstOrThrow();
    const amount = order.payNowAmount > 0 ? order.payNowAmount : order.deliveryType === "BANGLADESH_POST" ? order.grandTotal : settings?.courierAdvance ?? 0;
    if (amount <= 0 || amount > order.grandTotal) return NextResponse.json({ error: "This order has an invalid payment amount." }, { status: 400 });
    const duplicate = await prisma.payment.findUnique({ where: { transactionId: parsed.data.transactionId }, select: { order: { select: { orderNumber: true } } } });
    if (duplicate) return NextResponse.json({ orderNumber: duplicate.order.orderNumber, duplicate: true });
    let proofImagePath: string | undefined;
    if (proof) { const ext = proof.type.split("/")[1] || "jpg"; const name = `${randomUUID()}.${ext}`; await mkdir(path.join(process.cwd(), "public", "uploads"), { recursive: true }); await writeFile(path.join(process.cwd(), "public", "uploads", name), Buffer.from(await proof.arrayBuffer())); proofImagePath = `/uploads/${name}`; }
    await prisma.$transaction(async (tx) => { await tx.payment.create({ data: { orderId: order.id, senderMobile: normalizeBangladeshMobile(parsed.data.senderMobile), transactionId: parsed.data.transactionId, amount, method: parsed.data.paymentMethod, proofImagePath, status: "SUBMITTED" } }); await tx.order.update({ where: { id: order.id }, data: { status: "PAYMENT_SUBMITTED", paidAmount: amount, dueAmount: Math.max(0, order.grandTotal - amount) } }); });
    return NextResponse.json({ orderNumber });
  } catch (error) { console.error("payment submission failed", error); return NextResponse.json({ error: "Unable to submit payment. Please try again." }, { status: 500 }); }
}
