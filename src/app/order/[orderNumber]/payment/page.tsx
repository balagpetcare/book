import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentForm } from "@/components/payment-form";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
const taka = (n: number) => String.fromCodePoint(0x09f3) + n.toLocaleString("bn-BD");
export default async function PaymentPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params; const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } }); if (!order) notFound(); const settings = await prisma.bookSettings.findFirstOrThrow(); const payNow = order.payNowAmount > 0 ? order.payNowAmount : order.deliveryType === "BANGLADESH_POST" ? order.grandTotal : settings.courierAdvance; const due = Math.max(0, order.grandTotal - payNow); const delivery = order.deliveryType === "COURIER" ? "Courier Home Delivery" : "Bangladesh Post";
  return <main className="checkout-page payment-page"><div className="page-shell checkout-shell"><Link href="/order" className="back-link">Back to order</Link><header className="payment-header"><span className="eyebrow">Payment step 2</span><h1>পেমেন্ট সম্পন্ন করুন</h1><p className="checkout-intro">নিচের নির্দেশনা অনুসরণ করে পেমেন্ট করুন এবং পেমেন্টের তথ্য জমা দিন।</p></header><section className="payment-order-summary"><h2>অর্ডারের সারাংশ</h2><div><span>বই</span><strong>{order.items[0]?.title ?? "বিড়াল পালন ও চিকিৎসা"}</strong></div><div><span>ডেলিভারি</span><strong>{delivery}</strong></div><div><span>মোট মূল্য</span><strong>{taka(order.grandTotal)}</strong></div><div className="pay-now-summary"><span>এখন পরিশোধ করতে হবে</span><strong>{taka(payNow)}</strong></div>{due > 0 && <div><span>হাতে পেয়ে পরিশোধ</span><strong>{taka(due)}</strong></div>}</section><PaymentForm orderNumber={order.orderNumber} bkashNumber={settings.bkashNumber} nagadNumber={settings.nagadNumber} amount={payNow} /></div></main>;
}
