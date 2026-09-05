import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminAction } from "@/components/admin-action";
import { PrintLinks } from "@/components/print-links";
import Link from "next/link";
import { TrackingUpdateForm } from "./tracking-form";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      payments: { include: { verifiedByAdmin: true } },
      items: true,
      inventoryTransactions: { orderBy: { createdAt: "asc" } },
      printedByAdmin: true,
      dispatchedByAdmin: true,
      createdByAdmin: true,
    },
  });

  if (!o) notFound();

  const payment = o.payments.at(-1);

  // Formatting helpers
  const formatDateTime = (date: Date | null | undefined) => date ? date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
  
  // Timeline extraction
  const timeline = [];
  timeline.push({ label: "Order Created", time: o.createdAt, admin: o.createdByAdmin });
  if (payment?.createdAt) timeline.push({ label: "Payment Submitted", time: payment.createdAt });
  if (payment?.verifiedAt) timeline.push({ label: "Payment Verified", time: payment.verifiedAt, admin: payment.verifiedByAdmin });
  if (o.confirmedAt) timeline.push({ label: "Order Confirmed", time: o.confirmedAt });
  if (o.printedAt) timeline.push({ label: "Printed", time: o.printedAt, admin: o.printedByAdmin });
  if (o.dispatchedAt) timeline.push({ label: "Dispatched", time: o.dispatchedAt, admin: o.dispatchedByAdmin });
  if (o.shippedAt) timeline.push({ label: "Shipped", time: o.shippedAt });
  if (o.deliveredAt) timeline.push({ label: "Delivered", time: o.deliveredAt });
  if (o.status === "RETURNED") timeline.push({ label: "Returned", time: o.updatedAt });
  if (o.status === "CANCELLED") timeline.push({ label: "Cancelled", time: o.updatedAt });

  return (
    <>
      <div className="admin-header" style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <Link href="/admin/orders" className="back-link" style={{ color: "#666", textDecoration: "none", fontSize: "14px", display: "inline-block", marginBottom: "8px" }}>
            ← Back to Orders
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{o.orderNumber}</h1>
            <span className={`status-pill status-${o.status.toLowerCase()}`}>{o.status.replace("_", " ")}</span>
            {o.dispatchStatus === "DISPATCHED" && <span className="status-pill" style={{ background: "#e0f2fe", color: "#0369a1" }}>DISPATCHED</span>}
            {o.printedAt && <span className="status-pill" style={{ background: "#f3e8ff", color: "#6b21a8" }}>PRINTED</span>}
            {o.source !== "WEB" && <span className="status-pill" style={{ background: "#e0f2fe", color: "#0369a1" }}>Source: {o.source}</span>}
          </div>
          <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
            Created {formatDateTime(o.createdAt)} {o.createdByAdmin && `by ${o.createdByAdmin.name || o.createdByAdmin.email}`}
          </p>
        </div>
      </div>

      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* CUSTOMER CARD */}
        <section className="admin-panel" style={{ padding: "24px", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Customer</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Name</span> <b>{o.customerName}</b></div>
            <div>
              <span style={{ color: "#666", display: "block", fontSize: "12px" }}>Mobile</span> 
              <span style={{ fontFamily: "monospace", fontSize: "15px" }}>{o.mobile}</span>
              {o.alternateMobile && <span> / {o.alternateMobile}</span>}
            </div>
            <div>
              <span style={{ color: "#666", display: "block", fontSize: "12px" }}>Address</span>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                {o.areaOrVillage}, {o.upazilaOrThana}<br/>
                {o.district}{o.division ? `, ${o.division}` : ""}<br/>
                {o.unionOrWard} {o.roadOrStreet} {o.houseOrHolding}<br/>
                {o.postOffice} {o.postalCode && `- ${o.postalCode}`}<br/>
                {o.landmark && `Landmark: ${o.landmark}`}
              </p>
            </div>
          </div>
        </section>

        {/* PAYMENT CARD */}
        <section className="admin-panel" style={{ padding: "24px", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Payment</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Plan</span> {o.paymentPlan.replace(/_/g, " ")}</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f9fafb", padding: "12px", borderRadius: "6px", marginTop: "4px" }}>
              <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Subtotal</span> ৳{o.subtotal}</div>
              <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Delivery</span> ৳{o.deliveryCharge}</div>
              <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Grand Total</span> <b style={{ fontSize: "16px" }}>৳{o.grandTotal}</b></div>
              <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Paid</span> ৳{o.paidAmount}</div>
              <div style={{ gridColumn: "1 / -1", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                <span style={{ color: "#666", display: "block", fontSize: "12px" }}>Due (COD)</span> 
                <b style={{ fontSize: "18px", color: o.dueAmount > 0 ? "#b91c1c" : "#15803d" }}>৳{o.dueAmount}</b>
              </div>
            </div>

            {payment && (
              <div style={{ marginTop: "8px", borderTop: "1px solid #eee", paddingTop: "8px" }}>
                <span style={{ color: "#666", display: "block", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px" }}>Last Transaction</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{payment.method}</div>
                    <div>{payment.senderMobile}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#666" }}>{payment.transactionId}</div>
                  </div>
                  <span className={`status-pill status-${payment.status.toLowerCase()}`}>{payment.status}</span>
                </div>
                {payment.status === "VERIFIED" && payment.verifiedAt && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#15803d", background: "#f0fdf4", padding: "6px", borderRadius: "4px" }}>
                    <b>✓ Verified</b> on {formatDateTime(payment.verifiedAt)}
                    {o.payments.find(p => p.id === payment.id)?.verifiedByAdmin?.name && 
                      ` by ${o.payments.find(p => p.id === payment.id)?.verifiedByAdmin?.name}`}
                  </div>
                )}
                {payment.proofImagePath && (
                  <div style={{ marginTop: "8px" }}>
                    <a href={payment.proofImagePath} target="_blank" rel="noreferrer" style={{ color: "#166534", textDecoration: "underline" }}>View payment proof ↗</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SHIPPING CARD */}
        <section className="admin-panel" style={{ padding: "24px", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Shipping & Fulfillment</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
            <div><span style={{ color: "#666", display: "block", fontSize: "12px" }}>Delivery Method</span> {o.deliveryType.replace("_", " ")}</div>
            
            <div>
              <span style={{ color: "#666", display: "block", fontSize: "12px" }}>Print Status</span>
              {o.printedAt ? (
                <span>Printed {formatDateTime(o.printedAt)} (Count: {o.printCount})</span>
              ) : (
                <span style={{ color: "#666" }}>Not Printed</span>
              )}
            </div>

            <div>
              <span style={{ color: "#666", display: "block", fontSize: "12px" }}>Dispatch Status</span>
              {o.dispatchStatus === "DISPATCHED" ? (
                <span>Dispatched {formatDateTime(o.dispatchedAt)}</span>
              ) : (
                <span style={{ color: "#666" }}>Not Dispatched</span>
              )}
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "4px" }}>
              <TrackingUpdateForm 
                orderId={o.id} 
                initialCarrier={o.carrierName || ""} 
                initialTracking={o.trackingNumber || ""} 
              />
            </div>
          </div>
        </section>
      </div>

      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* OPERATIONS ACTION BAR */}
        <section className="admin-panel" style={{ padding: "24px", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Operations</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h3 style={{ fontSize: "12px", color: "#666", textTransform: "uppercase", marginBottom: "12px" }}>Print</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <PrintLinks orderId={o.id} />
                <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="PRINT" label={o.printedAt ? "Mark Reprinted" : "Mark Printed"} />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "12px", color: "#666", textTransform: "uppercase", marginBottom: "12px" }}>Fulfillment Workflow</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {payment?.status === "SUBMITTED" && (
                  <>
                    <AdminAction endpoint={`/api/admin/payments/${payment.id}`} action="VERIFY" label="Verify Payment" />
                    <AdminAction endpoint={`/api/admin/payments/${payment.id}`} action="REJECT" label="Reject Payment" />
                  </>
                )}
                
                {o.status === "CONFIRMED" && <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="PACK" label="Mark Packed" />}
                
                {o.dispatchStatus === "NOT_DISPATCHED" && ["PACKED", "CONFIRMED"].includes(o.status) && (
                  <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="DISPATCH" label="Mark Dispatched" />
                )}

                {o.status === "PACKED" && <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="SHIP" label="Mark Shipped" promptFields />}
                
                {o.status === "SHIPPED" && <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="DELIVER" label="Mark Delivered" />}
                
                {["SHIPPED", "DELIVERED"].includes(o.status) && <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="RETURN" label="Mark Returned" />}
                
                {o.status === "RETURNED" && <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="RESTOCK_RETURN" label="Restock Returned Item" />}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #fee2e2", paddingTop: "16px" }}>
              <h3 style={{ fontSize: "12px", color: "#b91c1c", textTransform: "uppercase", marginBottom: "12px" }}>Danger Zone</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {!["SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"].includes(o.status) ? (
                  <AdminAction endpoint={`/api/admin/orders/${o.id}`} action="CANCEL" label="Cancel Order" />
                ) : (
                  <span style={{ fontSize: "13px", color: "#666" }}>Order cannot be cancelled in its current state.</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="admin-panel timeline" style={{ padding: "24px", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Activity Timeline</h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
            {timeline.sort((a, b) => b.time.getTime() - a.time.getTime()).map((evt, idx) => (
              <li key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px", borderLeft: "2px solid #e5e7eb", paddingLeft: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>{evt.label}</b>
                  <span style={{ color: "#666", fontSize: "12px" }}>{formatDateTime(evt.time)}</span>
                </div>
                {evt.admin && (
                  <span style={{ color: "#999", fontSize: "12px" }}>by {evt.admin.name || evt.admin.email}</span>
                )}
              </li>
            ))}
          </ol>

          {o.inventoryTransactions.length > 0 && (
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
              <h3 style={{ fontSize: "12px", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Inventory Logs</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#444" }}>
                {o.inventoryTransactions.map((t) => (
                  <li key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>{t.type} ({t.quantityDelta > 0 ? "+" : ""}{t.quantityDelta})</span>
                    <span>{formatDateTime(t.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
