"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "BANGLADESH_POST" | "COURIER" | "READY_FOR_DISPATCH" | "PRINTED_HISTORY";

interface OrderSubset {
  id: string;
  orderNumber: string;
  customerName: string;
  mobile: string;
  district: string;
  upazilaOrThana: string;
  grandTotal: number;
  payNowAmount: number;
  status: string;
  printedAt: string | null;
  dispatchStatus: string;
  deliveryType: string;
  trackingNumber: string | null;
}

interface PrintBatchItem {
  id: string;
  batchNumber: string;
  deliveryMethod: string;
  printedAt: string | null;
  status: string;
  _count: { items: number };
}

export default function FulfillmentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("BANGLADESH_POST");
  const [orders, setOrders] = useState<OrderSubset[]>([]);
  const [batches, setBatches] = useState<PrintBatchItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [totalItems, setTotalItems] = useState(0);

  const [layout, setLayout] = useState("9/A4");
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        tab: activeTab
      });

      const res = await fetch(`/api/admin/fulfillment?${params}`, { signal: abortController.signal });
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      if (activeTab === "PRINTED_HISTORY") {
        setBatches(data.items);
      } else {
        setOrders(data.items);
      }
      setTotalItems(data.totalItems);
      setSelected(new Set());
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search, activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (searchInput !== search) {
      const handler = setTimeout(() => {
        setSearch(searchInput);
        setPage(1);
      }, 350);
      return () => clearTimeout(handler);
    }
  }, [searchInput, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === orders.length && orders.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  };

  const createPrintBatch = async () => {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/fulfillment/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderIds: Array.from(selected),
          deliveryMethod: activeTab === "BANGLADESH_POST" ? "BANGLADESH_POST" : "COURIER",
          layout 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create batch");
      router.push(`/admin/fulfillment/print/${data.batch.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
      setIsSubmitting(false);
    }
  };

  const dispatchOrders = async () => {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/fulfillment/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch");
      fetchOrders();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="admin-header" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Print & Delivery</h1>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px" }}>
        {[
          { id: "BANGLADESH_POST", label: "Bangladesh Post" },
          { id: "COURIER", label: "Courier" },
          { id: "READY_FOR_DISPATCH", label: "Ready for Dispatch" },
          { id: "PRINTED_HISTORY", label: "Printed History" }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => { setActiveTab(t.id as Tab); setPage(1); setSearchInput(""); setSearch(""); }}
            className={activeTab === t.id ? "button button-primary" : "button button-secondary"}
            style={{ fontWeight: activeTab === t.id ? "bold" : "normal" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="orders-search-bar" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by order no, customer, mobile, district..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
            style={{ width: "100%", paddingRight: "70px" }}
          />
          <div style={{ position: "absolute", right: "8px", display: "flex", gap: "4px", alignItems: "center" }}>
            {loading && <span style={{ fontSize: "14px" }}>⏳</span>}
            {searchInput && (
              <button 
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", color: "#666" }}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "6px" }}>
        <div style={{ fontSize: "14px" }}>
          {totalItems > 0 ? `${totalItems} total ${activeTab === "PRINTED_HISTORY" ? "batches" : "orders"}` : "No results"}
        </div>
        {activeTab !== "PRINTED_HISTORY" && activeTab !== "READY_FOR_DISPATCH" && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>{selected.size} selected</span>
            <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              Layout:
              <select value={layout} onChange={e => setLayout(e.target.value)} className="search-input" style={{ padding: "4px" }}>
                <option value="9/A4">Spacious — 9 / A4</option>
                <option value="12/A4">Standard — 12 / A4</option>
                <option value="15/A4">Compact — 15 / A4</option>
              </select>
            </label>
            <button onClick={createPrintBatch} disabled={selected.size === 0 || isSubmitting} className="button button-primary">
              Print Selected
            </button>
          </div>
        )}
        {activeTab === "READY_FOR_DISPATCH" && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>{selected.size} selected</span>
            <button onClick={dispatchOrders} disabled={selected.size === 0 || isSubmitting} className="button button-primary">
              Mark Dispatched
            </button>
          </div>
        )}
      </div>
      
      {actionError && <div style={{ color: "#b91c1c", marginBottom: "16px", padding: "12px", background: "#fef2f2", borderRadius: "6px" }}>{actionError}</div>}

      <div className="admin-table-container" style={{ overflowX: "auto", opacity: loading && (orders.length > 0 || batches.length > 0) ? 0.6 : 1, transition: "opacity 0.2s" }}>
        {error ? (
          <div className="empty-admin" style={{ color: "#a52d24" }}><p>Error: {error}</p></div>
        ) : activeTab === "PRINTED_HISTORY" ? (
          batches.length === 0 && !loading ? <p className="empty-admin">No batches found</p> :
          batches.length === 0 && loading ? <p className="empty-admin">Loading...</p> : (
            <table className="admin-data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px" }}>Batch No</th>
                  <th style={{ padding: "12px" }}>Method</th>
                  <th style={{ padding: "12px" }}>Orders</th>
                  <th style={{ padding: "12px" }}>Printed</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>{b.batchNumber}</td>
                    <td style={{ padding: "12px" }}>{b.deliveryMethod}</td>
                    <td style={{ padding: "12px" }}>{b._count.items}</td>
                    <td style={{ padding: "12px" }}>{b.printedAt ? new Date(b.printedAt).toLocaleString() : "Not Printed"}</td>
                    <td style={{ padding: "12px" }}><span className={`status-pill status-${b.status.toLowerCase()}`}>{b.status}</span></td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <Link href={`/admin/fulfillment/print/${b.id}`} className="button button-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                        View / Reprint
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          orders.length === 0 && !loading ? <p className="empty-admin">No orders found</p> :
          orders.length === 0 && loading ? <p className="empty-admin">Loading...</p> : (
            <table className="admin-data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", width: "40px" }}>
                    <input type="checkbox" checked={selected.size > 0 && selected.size === orders.length} onChange={toggleSelectAll} />
                  </th>
                  <th style={{ padding: "12px" }}>Order No</th>
                  <th style={{ padding: "12px" }}>Customer</th>
                  <th style={{ padding: "12px" }}>District/Thana</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  {activeTab === "READY_FOR_DISPATCH" && <th style={{ padding: "12px" }}>Tracking</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}>
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} />
                    </td>
                    <td style={{ padding: "12px" }}>
                      <Link href={`/admin/orders/${o.id}`} style={{ fontWeight: "bold", color: "#0f172a" }}>
                        {o.orderNumber}
                      </Link>
                      {o.deliveryType === "COURIER" && <div style={{ fontSize: "11px", color: "#6b21a8" }}>Courier</div>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{o.customerName}</div>
                      <div style={{ color: "#666", fontSize: "12px" }}>{o.mobile}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{o.district}</div>
                      <div style={{ color: "#666", fontSize: "12px" }}>{o.upazilaOrThana}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <span className={`status-pill status-${o.status.toLowerCase()}`}>{o.status}</span>
                        {o.printedAt && <span className="status-pill" style={{ background: "#f3e8ff", color: "#6b21a8" }}>PRINTED</span>}
                      </div>
                    </td>
                    {activeTab === "READY_FOR_DISPATCH" && (
                      <td style={{ padding: "12px" }}>
                        {o.trackingNumber || <span style={{ color: "#999", fontSize: "12px" }}>None</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </>
  );
}
