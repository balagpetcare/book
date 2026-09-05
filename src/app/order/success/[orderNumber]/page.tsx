import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const taka = (amount: number) => `৳${amount.toLocaleString("bn-BD")}`;

export default async function SuccessPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) notFound();
  const payment = order.payments[0];
  const delivery = order.deliveryType === "COURIER" ? "কুরিয়ার হোম ডেলিভারি" : "বাংলাদেশ পোস্ট অফিস";
  const plan = order.paymentPlan === "PREPAID_350" ? "সম্পূর্ণ পেমেন্ট · বাংলাদেশ পোস্ট" : "কুরিয়ার অগ্রিম পেমেন্ট";
  return <main className="checkout-page success-page"><div className="page-shell success-card"><div className="success-icon" aria-hidden="true">✓</div><p className="eyebrow success-badge">পেমেন্ট যাচাই চলছে</p><h1>অর্ডার সফলভাবে জমা হয়েছে</h1><p className="success-subheading">আপনার পেমেন্ট ম্যানুয়ালি যাচাই করা হবে।</p><div className="delivery-notice"><strong>৩–৪ দিনের মধ্যে আপনি বইটি হাতে পেয়ে যাবেন।</strong><span>আপনার অর্ডারটি {delivery}-এর মাধ্যমে পাঠানো হবে।</span><a href="tel:01575008300">যেকোনো অভিযোগ বা যোগাযোগের জন্য: 01575008300</a></div><section className="success-summary" aria-labelledby="summary-heading"><h2 id="summary-heading">অর্ডারের সারসংক্ষেপ</h2><dl className="order-summary"><div><dt>অর্ডার নম্বর</dt><dd>{order.orderNumber}</dd></div><div><dt>পরিকল্পনা</dt><dd>{plan}</dd></div><div><dt>পরিশোধ / জমা দেওয়া</dt><dd>{taka(payment?.amount ?? order.paidAmount)}</dd></div><div><dt>বাকি</dt><dd>{taka(order.dueAmount)}</dd></div><div><dt>শিপিং / ডেলিভারি মাধ্যম</dt><dd>{delivery}</dd></div><div><dt>স্ট্যাটাস</dt><dd><span className="status-pill">পেমেন্ট যাচাই চলছে</span></dd></div></dl></section><div className="address-summary"><b>ডেলিভারি ঠিকানা</b><p>{order.areaOrVillage}, {order.upazilaOrThana}, {order.district}{order.division ? `, ${order.division}` : ""}{order.postalCode ? ` · ${order.postalCode}` : ""}</p></div><div className="success-actions"><a className="button button-primary" href={`/track?orderNumber=${order.orderNumber}`}>অর্ডার ট্র্যাক করুন</a><Link className="button button-secondary" href="/">হোমে ফিরে যান</Link></div></div></main>;
}
