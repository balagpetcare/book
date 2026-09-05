import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintBatchToolbar } from "./toolbar";
import "./print.css";

export const dynamic = "force-dynamic";

export default async function PrintPreviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  
  const batch = await prisma.printBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        include: { order: true }
      }
    }
  });

  if (!batch) notFound();

  const isBangladeshPost = batch.deliveryMethod === "BANGLADESH_POST";
  const isCompact = batch.layout === "15/A4";
  const itemsPerPage = isBangladeshPost ? (isCompact ? 15 : 9) : (isCompact ? 15 : 12);
  const layoutClass = isBangladeshPost ? (isCompact ? "layout-15" : "layout-9") : (isCompact ? "layout-15" : "layout-12");

  // Split into pages
  const pages = [];
  for (let i = 0; i < batch.items.length; i += itemsPerPage) {
    pages.push(batch.items.slice(i, i + itemsPerPage));
  }

  return (
    <div className="print-preview-container">
      <PrintBatchToolbar batch={batch} />
      
      <div className="print-pages-wrapper">
        {pages.map((pageItems, pageIdx) => (
          <div key={pageIdx} className={`a4-page ${layoutClass}`}>
            <div className="labels-grid">
              {pageItems.map((item) => {
                const o = item.order;
                return (
                  <div key={item.id} className={`label-cell ${batch.deliveryMethod === 'BANGLADESH_POST' ? 'post-label-cell' : ''}`}>
                    {batch.deliveryMethod === "BANGLADESH_POST" ? (
                      <div className="label-content post-label">
                        <div className="label-header">
                          <div className="carrier-name">বাংলাদেশ পোস্ট অফিস</div>
                          <div className="order-no">{o.orderNumber}</div>
                        </div>
                        <div className="label-body">
                          <p><b>প্রাপক:</b> {o.customerName}</p>
                          <p><b>মোবাইল:</b> {o.mobile} {o.alternateMobile ? `/ ${o.alternateMobile}` : ""}</p>
                          <p className="address-block">
                            <b>ঠিকানা:</b><br/>
                            {[
                              [o.houseOrHolding, o.roadOrStreet, o.landmark].filter(Boolean).join(", "),
                              [o.areaOrVillage, o.unionOrWard].filter(Boolean).join(", "),
                              [o.upazilaOrThana, o.district, o.division].filter(Boolean).join(", "),
                              [o.postOffice, o.postalCode ? `পোস্ট কোড: ${o.postalCode}` : ""].filter(Boolean).join(" ")
                            ].filter(Boolean).map((line, i, arr) => (
                              <span key={i}>{line}{i < arr.length - 1 ? <br/> : null}</span>
                            ))}
                          </p>
                        </div>
                        <div className="label-footer">
                          {o.dueAmount > 0 ? (
                            <span className="cod-amount">COD ৳{o.dueAmount}</span>
                          ) : (
                            <span className="paid-amount">PAID</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="label-content courier-label">
                        <div className="label-header">
                          <span className="carrier-name">COURIER</span>
                          <span className="order-no">{o.orderNumber}</span>
                        </div>
                        <div className="label-body">
                          <p className="customer-name">{o.customerName}</p>
                          <p className="mobile-no">{o.mobile}{o.alternateMobile ? ` / ${o.alternateMobile}` : ""}</p>
                          <p className="address-text">
                            {[o.areaOrVillage, o.upazilaOrThana, o.district].filter(Boolean).join(", ")}
                          </p>
                          {o.trackingNumber && <p className="tracking-text">Tracking: <b>{o.trackingNumber}</b></p>}
                        </div>
                        <div className="label-footer courier-footer">
                          <div className="financials">
                            <span>Total: ৳{o.grandTotal}</span>
                            <span>Paid: ৳{o.paidAmount}</span>
                          </div>
                          {o.dueAmount > 0 ? (
                            <div className="cod-amount large">COD: ৳{o.dueAmount}</div>
                          ) : (
                            <div className="paid-amount large">FULLY PAID</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
