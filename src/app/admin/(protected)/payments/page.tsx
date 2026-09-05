"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const STATUSES = ["ALL", "AWAITING_PAYMENT", "SUBMITTED", "VERIFIED", "REJECTED"] as const;
const METHODS = ["ALL", "BKASH", "NAGAD", "MANUAL", "CASH"] as const;
const PAGE_SIZES = [25, 50, 100];

interface OrderSubset {
  id: string;
  orderNumber: string;
  customerName: string;
  mobile: string;
  grandTotal: number;
  payNowAmount: number;
  status: string;
  dueAmount: number;
}

interface Payment {
  id: string;
  orderId: string;
  status: string;
  senderMobile: string;
  transactionId: string;
  amount: number;
  method: string;
  proofImagePath: string | null;
  createdAt: string;
  verifiedAt: string | null;
  verifiedByAdmin: { name: string } | null;
  rejectionReason: string | null;
  order: OrderSubset;
}

interface ApiResponse {
  ok: boolean;
  items: Payment[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [verifyModal, setVerifyModal] = useState<Payment | null>(null);
  const [rejectModal, setRejectModal] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ orderId: "", method: "BKASH", senderMobile: "", transactionId: "", amount: "", adminNote: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPayments = useCallback(async () => {
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
        ...(status !== "ALL" && { status }),
        ...(method !== "ALL" && { method }),
      });

      const res = await fetch(`/api/admin/payments?${params}`, { signal: abortController.signal });
      if (!res.ok) throw new Error("Failed to fetch payments");

      const data: ApiResponse = await res.json();
      setPayments(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search, status, method]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPayments();
  }, [fetchPayments]);

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
    setMethod("ALL");
    setPage(1);
  };

  const executeAction = async (paymentId: string, actionName: "VERIFY" | "REJECT", extraData = {}) => {
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, ...extraData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      
      setActionSuccess(`Payment successfully ${actionName.toLowerCase()}ed.`);
      setVerifyModal(null);
      setRejectModal(null);
      fetchPayments();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitManualPayment = async () => {
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...manualForm, amount: Number(manualForm.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create manual payment");
      setManualModal(false);
      setManualForm({ orderId: "", method: "BKASH", senderMobile: "", transactionId: "", amount: "", adminNote: "" });
      fetchPayments();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (n: number) => `৳${n}`;

  return (
    <>
      <div className="admin-header" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Payment Verification</h1>
        </div>
        <button onClick={() => setManualModal(true)} className="button button-primary">
          + Record Manual Payment
        </button>
      </div>

      {actionSuccess && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "6px", marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
          {actionSuccess}
          <button onClick={() => setActionSuccess("")} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="orders-search-bar" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by sender mobile, transaction ID, order no..."
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
        <button onClick={handleSearch} className="search-button">Search</button>
      </div>

      {/* Filters */}
      <div className="filter-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`filter ${status === s ? "active" : ""}`}
            onClick={() => { setStatus(s); setPage(1); }}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="filter-toggle-row">
        <button className="filter-toggle-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
        </button>
        {(search || status !== "ALL" || method !== "ALL") && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear All
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>Payment Method</label>
            <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="filter-select">
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Pagination info */}
      <div className="orders-controls">
        <div className="results-info">
          {totalItems > 0 ? (
            <span>{totalItems} total payments · Page {page} of {totalPages}</span>
          ) : <span>No payments found</span>}
        </div>
        <div className="pagination-controls">
          <label>
            Per page:
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="pagesize-select">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div className="pagination-buttons">
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="page-btn">Prev</button>
            <span className="page-indicator">{page} / {totalPages || 1}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="page-btn">Next</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container" style={{ overflowX: "auto", opacity: loading && payments.length > 0 ? 0.6 : 1, transition: "opacity 0.2s" }}>
        {error ? (
          <div className="empty-admin" style={{ color: "#a52d24" }}>
            <p>Error: {error}</p>
            <button onClick={() => fetchPayments()} className="button button-secondary">Retry</button>
          </div>
        ) : payments.length === 0 && !loading ? (
          <p className="empty-admin">No matching payments found</p>
        ) : payments.length === 0 && loading ? (
          <p className="empty-admin">Loading payments...</p>
        ) : (
          <table className="admin-data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px" }}>Order No</th>
                <th style={{ padding: "12px" }}>Customer</th>
                <th style={{ padding: "12px" }}>Payment Details</th>
                <th style={{ padding: "12px" }}>Expected</th>
                <th style={{ padding: "12px" }}>Submitted</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee", background: p.status === "VERIFIED" ? "#f8fafc" : "#fff" }}>
                  <td style={{ padding: "12px" }}>
                    <Link href={`/admin/orders/${p.order.id}`} style={{ fontWeight: "bold", color: "#0f172a" }}>
                      {p.order.orderNumber}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div>{p.order.customerName}</div>
                    <div style={{ color: "#666", fontSize: "12px" }}>{p.order.mobile}</div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: "bold" }}>{p.method}</div>
                    <div style={{ color: "#444", fontSize: "13px" }}>{p.senderMobile}</div>
                    <div style={{ color: "#666", fontSize: "12px", fontFamily: "monospace" }}>{p.transactionId}</div>
                    <div style={{ color: "#999", fontSize: "11px" }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: "12px", color: p.order.payNowAmount !== p.amount ? "#b91c1c" : "inherit" }}>
                    {formatCurrency(p.order.payNowAmount)}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "bold", fontSize: "15px" }}>
                    {formatCurrency(p.amount)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span className={`status-pill status-${p.status.toLowerCase()}`}>{p.status}</span>
                    {p.status === "REJECTED" && p.rejectionReason && (
                      <div style={{ fontSize: "11px", color: "#a52d24", marginTop: "4px", maxWidth: "150px" }}>{p.rejectionReason}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      {p.status === "SUBMITTED" && (
                        <>
                          <button onClick={() => setVerifyModal(p)} className="button button-primary" style={{ padding: "6px 12px", fontSize: "12px" }}>Verify</button>
                          <button onClick={() => setRejectModal(p)} className="button button-secondary" style={{ padding: "6px 12px", fontSize: "12px", color: "#b91c1c" }}>Reject</button>
                        </>
                      )}
                      {p.status === "VERIFIED" && (
                        <span style={{ fontSize: "13px", color: "#166534", fontWeight: "bold", display: "flex", alignItems: "center" }}>✓ Verified</span>
                      )}
                      <Link href={`/admin/orders/${p.order.id}`} className="button button-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                        Open Order
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Verify Modal */}
      {verifyModal && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content" style={{ background: "#fff", padding: "24px", borderRadius: "8px", maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>Verify Payment</h2>
            
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "13px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>Order Info</h3>
              <div><strong>Order:</strong> {verifyModal.order.orderNumber}</div>
              <div><strong>Customer:</strong> {verifyModal.order.customerName} ({verifyModal.order.mobile})</div>
              <div><strong>Order Total:</strong> {formatCurrency(verifyModal.order.grandTotal)}</div>
              <div><strong>Expected Now:</strong> <span style={{ color: verifyModal.order.payNowAmount !== verifyModal.amount ? "#b91c1c" : "inherit" }}>{formatCurrency(verifyModal.order.payNowAmount)}</span></div>
            </div>

            <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "13px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>Payment Received</h3>
              <div><strong>Method:</strong> {verifyModal.method}</div>
              <div><strong>Sender:</strong> {verifyModal.senderMobile}</div>
              <div><strong>TxID:</strong> <code style={{ background: "#fff", padding: "2px 4px", border: "1px solid #ccc" }}>{verifyModal.transactionId}</code></div>
              <div style={{ marginTop: "8px", fontSize: "18px" }}><strong>Amount:</strong> <span style={{ color: "#166534" }}>{formatCurrency(verifyModal.amount)}</span></div>
            </div>

            {verifyModal.amount !== verifyModal.order.payNowAmount && (
              <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px", borderRadius: "6px", marginBottom: "24px", fontSize: "14px" }}>
                <strong>⚠️ Amount Mismatch:</strong> Expected {formatCurrency(verifyModal.order.payNowAmount)} but received {formatCurrency(verifyModal.amount)}. 
                Verifying will update the order&apos;s paid amount to {formatCurrency(verifyModal.amount)}.
              </div>
            )}

            {actionError && <div style={{ color: "#b91c1c", marginBottom: "16px", fontSize: "14px" }}>{actionError}</div>}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setVerifyModal(null)} className="button button-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={() => executeAction(verifyModal.id, "VERIFY")} className="button button-primary" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content" style={{ background: "#fff", padding: "24px", borderRadius: "8px", maxWidth: "400px", width: "100%" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>Reject Payment</h2>
            
            <p style={{ marginBottom: "16px", fontSize: "14px" }}>Rejecting payment <b>{rejectModal.transactionId}</b> for order <b>{rejectModal.order.orderNumber}</b>.</p>
            
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold" }}>Rejection Reason</label>
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="search-input" style={{ width: "100%", padding: "8px" }}>
                <option value="">Select reason...</option>
                <option value="Amount mismatch">Amount mismatch</option>
                <option value="Invalid transaction ID">Invalid transaction ID</option>
                <option value="Payment not found">Payment not found</option>
                <option value="Duplicate transaction">Duplicate transaction</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {actionError && <div style={{ color: "#b91c1c", marginBottom: "16px", fontSize: "14px" }}>{actionError}</div>}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setRejectModal(null)} className="button button-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={() => executeAction(rejectModal.id, "REJECT", { reason: rejectReason })} className="button button-primary" style={{ background: "#b91c1c" }} disabled={isSubmitting || !rejectReason}>
                {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {manualModal && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content" style={{ background: "#fff", padding: "24px", borderRadius: "8px", maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>Record Manual Payment</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Order ID (Internal ID, not BG-...)</label>
                <input type="text" value={manualForm.orderId} onChange={(e) => setManualForm({...manualForm, orderId: e.target.value})} className="search-input" style={{ width: "100%", padding: "8px" }} placeholder="e.g. cm0t2u..." />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Method</label>
                  <select value={manualForm.method} onChange={(e) => setManualForm({...manualForm, method: e.target.value})} className="search-input" style={{ width: "100%", padding: "8px" }}>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="CASH">Cash</option>
                    <option value="MANUAL">Manual/Bank</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Amount Received</label>
                  <input type="number" value={manualForm.amount} onChange={(e) => setManualForm({...manualForm, amount: e.target.value})} className="search-input" style={{ width: "100%", padding: "8px" }} placeholder="e.g. 450" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Sender Mobile</label>
                  <input type="text" value={manualForm.senderMobile} onChange={(e) => setManualForm({...manualForm, senderMobile: e.target.value})} className="search-input" style={{ width: "100%", padding: "8px" }} placeholder="017..." />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Transaction ID / Ref</label>
                  <input type="text" value={manualForm.transactionId} onChange={(e) => setManualForm({...manualForm, transactionId: e.target.value})} className="search-input" style={{ width: "100%", padding: "8px" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Admin Note (Audit Log)</label>
                <input type="text" value={manualForm.adminNote} onChange={(e) => setManualForm({...manualForm, adminNote: e.target.value})} className="search-input" style={{ width: "100%", padding: "8px" }} placeholder="Reason for manual entry..." />
              </div>
            </div>

            {actionError && <div style={{ color: "#b91c1c", marginBottom: "16px", fontSize: "14px" }}>{actionError}</div>}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setManualModal(false)} className="button button-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={submitManualPayment} className="button button-primary" disabled={isSubmitting || !manualForm.orderId || !manualForm.amount || !manualForm.transactionId}>
                {isSubmitting ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
