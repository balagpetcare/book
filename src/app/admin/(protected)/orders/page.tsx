"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatOperationalDate, formatOperationalTime } from "@/lib/date-format";

const STATUSES = ["ALL", "AWAITING_PAYMENT", "PAYMENT_SUBMITTED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"] as const;
const DELIVERY_TYPES = ["ALL", "BANGLADESH_POST", "COURIER"] as const;
const PRINT_STATUSES = ["ALL", "NOT_PRINTED", "PRINTED"] as const;
const DISPATCH_STATUSES = ["ALL", "NOT_DISPATCHED", "DISPATCHED"] as const;
const PAGE_SIZES = [25, 50, 100];

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  mobile: string;
  district: string;
  upazilaOrThana: string;
  areaOrVillage: string;
  deliveryType: string;
  grandTotal: number;
  payNowAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  printedAt: string | null;
  dispatchStatus: string;
  trackingNumber: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  dispatchedAt: string | null;
  payments: Array<{
    id: string;
    status: string;
    method: string;
    senderMobile: string;
    createdAt: string;
    verifiedAt: string | null;
  }>;
}

interface ApiResponse {
  ok: boolean;
  items: Order[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("ALL");
  const [deliveryMethod, setDeliveryMethod] = useState("ALL");
  const [printStatus, setPrintStatus] = useState("ALL");
  const [dispatchStatus, setDispatchStatus] = useState("ALL");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(status !== "ALL" && { status }),
        ...(deliveryMethod !== "ALL" && { deliveryMethod }),
        ...(printStatus !== "ALL" && { printStatus }),
        ...(dispatchStatus !== "ALL" && { dispatchStatus }),
      });

      const res = await fetch(`/api/admin/orders?${params}`, { signal: abortController.signal });
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data: ApiResponse = await res.json();
      setOrders(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      setSelected(new Set());
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to fetch orders");
    } finally {
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search, status, deliveryMethod, printStatus, dispatchStatus]);

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

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("ALL");
    setDeliveryMethod("ALL");
    setPrintStatus("ALL");
    setDispatchStatus("ALL");
    setPage(1);
  };

  const toggleSelect = (orderId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const formatCurrency = (amount: number) => `৳${amount}`;
  const formatStatus = (s: string) => s === "AWAITING_PAYMENT" ? "Payment Pending" : s.replaceAll("_", " ");

  return (
    <>
      <div className="admin-header" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Orders</h1>
        </div>
        <Link href="/admin/orders/new" className="button button-primary">
          + Create Order
        </Link>
      </div>

      {/* Search Bar */}
      <div className="orders-search-bar" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by order no, mobile, tracking or customer..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="search-input"
            style={{ width: "100%", paddingRight: "70px" }}
          />
          <div style={{ position: "absolute", right: "8px", display: "flex", gap: "4px", alignItems: "center" }}>
            {loading && <span style={{ fontSize: "14px" }}>⏳</span>}
            {searchInput && (
              <button 
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", color: "#666" }}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <button onClick={handleSearch} className="search-button">
          Search
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="filter-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`filter ${status === s ? "active" : ""}`}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {formatStatus(s)}
          </button>
        ))}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="filter-toggle-row">
        <button className="filter-toggle-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
        </button>
        {(search || status !== "ALL" || deliveryMethod !== "ALL" || printStatus !== "ALL" || dispatchStatus !== "ALL") && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>Delivery Method</label>
            <select value={deliveryMethod} onChange={(e) => { setDeliveryMethod(e.target.value); setPage(1); }} className="filter-select">
              {DELIVERY_TYPES.map((d) => <option key={d} value={d}>{d === "ALL" ? "All" : d.replaceAll("_", " ")}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Print Status</label>
            <select value={printStatus} onChange={(e) => { setPrintStatus(e.target.value as "ALL" | "NOT_PRINTED" | "PRINTED"); setPage(1); }} className="filter-select">
              {PRINT_STATUSES.map((p) => <option key={p} value={p}>{p === "ALL" ? "All" : p}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Dispatch Status</label>
            <select value={dispatchStatus} onChange={(e) => { setDispatchStatus(e.target.value); setPage(1); }} className="filter-select">
              {DISPATCH_STATUSES.map((d) => <option key={d} value={d}>{d === "ALL" ? "All" : d.replaceAll("_", " ")}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Pagination & Selection Info */}
      <div className="orders-controls">
        <div className="results-info">
          {totalItems > 0 ? (
            <span>
              {totalItems} total orders · {selected.size} selected · Page {page} of {totalPages}
            </span>
          ) : (
            <span>No orders found</span>
          )}
        </div>

        <div className="pagination-controls">
          <label>
            Per page:
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="pagesize-select">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className="pagination-buttons">
            <button onClick={() => setPage(1)} disabled={page === 1} className="page-btn">
              First
            </button>
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="page-btn">
              Previous
            </button>
            <span className="page-indicator">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="page-btn">
              Next
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="page-btn">
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Selection Controls */}
      {orders.length > 0 && (
        <div className="bulk-controls">
          <div className="selection-checkboxes">
            <input
              type="checkbox"
              id="select-all"
              checked={selected.size === orders.length && orders.length > 0}
              onChange={selectAll}
              className="select-all-checkbox"
            />
            <label htmlFor="select-all">
              Select {selected.size === orders.length ? "None" : "All"} ({orders.length} on page)
            </label>
            {selected.size > 0 && (
              <button onClick={clearSelection} className="clear-selection-btn">
                Clear Selection
              </button>
            )}
          </div>
          <div className="bulk-actions">
            <button disabled={selected.size === 0} className="bulk-action-btn">
              Print ({selected.size})
            </button>
            <button disabled={selected.size === 0} className="bulk-action-btn">
              Dispatch ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Orders Table/List */}
      <div className="admin-table orders-list" style={{ opacity: loading && orders.length > 0 ? 0.6 : 1, transition: "opacity 0.2s" }}>
        {error ? (
          <div className="empty-admin" style={{ color: "#a52d24", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <p>Error: {error}</p>
            <button onClick={() => fetchOrders()} className="button" style={{ padding: "8px 16px" }}>Retry</button>
          </div>
        ) : orders.length === 0 && !loading ? (
          <p className="empty-admin">No matching orders found</p>
        ) : orders.length === 0 && loading ? (
          <p className="empty-admin">Loading orders...</p>
        ) : (
          orders.map((o: Order) => {
            const paymentSubmittedAt = o.payments?.[0]?.createdAt;
            const paymentVerifiedAt = o.payments?.[0]?.verifiedAt;

            return (
              <div key={o.id} className="admin-row order-row order-row-timeline">
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                  className="order-checkbox"
                />
                <Link href={`/admin/orders/${o.id}`} className="order-content">
                  <div className="order-timeline-header">
                    <div className="order-id-section">
                      <b>{o.orderNumber}</b>
                      <div className="order-badges">
                        {o.source !== "WEB" && <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>{o.source}</span>}
                        {o.printedAt && <span className="badge badge-printed">PRINTED</span>}
                        {o.dispatchStatus === "DISPATCHED" && <span className="badge badge-dispatched">DISPATCHED</span>}
                      </div>
                    </div>
                    <span className={`status-badge status-${o.status.toLowerCase()}`}>{formatStatus(o.status)}</span>
                  </div>

                  <div className="order-customer-info">
                    <span className="info-label">{o.customerName}</span>
                    <span className="info-label">{o.mobile}</span>
                    <span className="info-label">{o.district}, {o.upazilaOrThana}</span>
                    <span className="info-label">{o.deliveryType === "BANGLADESH_POST" ? "Bangladesh Post" : "Courier"}</span>
                  </div>

                  <div className="order-financials-timeline">
                    <div className="financial-item">
                      <span className="financial-label">Total</span>
                      <b>{formatCurrency(o.grandTotal)}</b>
                    </div>
                    <div className="financial-item">
                      <span className="financial-label">Paid</span>
                      <span>{formatCurrency(o.paidAmount)}</span>
                    </div>
                    <div className="financial-item">
                      <span className="financial-label">Due</span>
                      <span>{formatCurrency(o.dueAmount)}</span>
                    </div>
                  </div>

                  <div className="order-timeline">
                    <div className="timeline-event">
                      <div className="timeline-dot">●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Ordered</div>
                        <div className="timeline-date">{formatOperationalDate(o.createdAt)}</div>
                        <div className="timeline-time">{formatOperationalTime(o.createdAt)}</div>
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${paymentSubmittedAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Payment Submitted</div>
                        {paymentSubmittedAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(paymentSubmittedAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(paymentSubmittedAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">Not yet</div>
                        )}
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${paymentVerifiedAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Payment Verified</div>
                        {paymentVerifiedAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(paymentVerifiedAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(paymentVerifiedAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">—</div>
                        )}
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${o.confirmedAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Confirmed</div>
                        {o.confirmedAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(o.confirmedAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(o.confirmedAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">—</div>
                        )}
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${o.printedAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Printed</div>
                        {o.printedAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(o.printedAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(o.printedAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">Not yet</div>
                        )}
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${o.dispatchedAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Dispatched</div>
                        {o.dispatchedAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(o.dispatchedAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(o.dispatchedAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">Not yet</div>
                        )}
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${o.shippedAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Shipped</div>
                        {o.shippedAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(o.shippedAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(o.shippedAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">Not yet</div>
                        )}
                      </div>
                    </div>

                    <div className="timeline-event">
                      <div className={`timeline-dot ${o.deliveredAt ? "active" : ""}`}>●</div>
                      <div className="timeline-content">
                        <div className="timeline-label">Delivered</div>
                        {o.deliveredAt ? (
                          <>
                            <div className="timeline-date">{formatOperationalDate(o.deliveredAt)}</div>
                            <div className="timeline-time">{formatOperationalTime(o.deliveredAt)}</div>
                          </>
                        ) : (
                          <div className="timeline-empty">Not yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bottom">
          <button onClick={() => setPage(1)} disabled={page === 1} className="page-btn">
            First
          </button>
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="page-btn">
            Previous
          </button>
          <span className="page-indicator">
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="page-btn">
            Next
          </button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="page-btn">
            Last
          </button>
        </div>
      )}
    </>
  );
}
