"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Settings {
  bookPrice: number;
  postDelivery: number;
  courierDelivery: number;
  courierAdvance: number;
}

export function ManualOrderForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState("COURIER");
  
  // Calculate Totals based on settings
  const subtotal = settings.bookPrice * quantity;
  const deliveryCharge = deliveryType === "BANGLADESH_POST" ? settings.postDelivery : settings.courierDelivery;
  const grandTotal = subtotal + deliveryCharge;
  
  const [paidAmount, setPaidAmount] = useState(0);
  const dueAmount = grandTotal - paidAmount;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    
    // Add client calculated stuff (server will verify)
    data.quantity = quantity.toString();
    data.paidAmount = paidAmount.toString();
    data.deliveryType = deliveryType;

    try {
      const res = await fetch("/api/admin/orders/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create order");
      
      alert(`Order ${result.order.orderNumber} created successfully`);
      router.push("/admin/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ maxWidth: "800px", display: "grid", gap: "24px" }}>
      
      {/* Customer Info */}
      <div className="admin-panel">
        <h2>Customer Details</h2>
        <div className="detail-grid">
          <label>Customer Name *<input name="customerName" required /></label>
          <label>Mobile Number *<input name="mobile" required placeholder="017..." /></label>
          <label>Alternate Mobile<input name="alternateMobile" /></label>
          <label>Email<input name="email" type="email" /></label>
        </div>
      </div>

      {/* Address */}
      <div className="admin-panel">
        <h2>Delivery Address</h2>
        <div className="detail-grid">
          <label>Full Address (House, Road, etc) *<input name="areaOrVillage" required /></label>
          <label>Thana / Upazila *<input name="upazilaOrThana" required /></label>
          <label>District *<input name="district" required /></label>
          <label>Division<input name="division" /></label>
          <label>Postal Code<input name="postalCode" /></label>
        </div>
      </div>

      {/* Order Info */}
      <div className="admin-panel">
        <h2>Order & Product</h2>
        <div className="detail-grid">
          <label>
            Order Source *
            <select name="source" defaultValue="PHONE">
              <option value="PHONE">Phone</option>
              <option value="SMS">SMS</option>
              <option value="MESSENGER">Messenger</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label>
            Delivery Method *
            <select name="deliveryType" value={deliveryType} onChange={e => setDeliveryType(e.target.value)}>
              <option value="COURIER">Courier</option>
              <option value="BANGLADESH_POST">Bangladesh Post</option>
            </select>
          </label>
          <label>
            Quantity
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          </label>
        </div>
        
        <div style={{ background: "#f1eee7", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Subtotal ({quantity}x book):</span>
            <strong>৳{subtotal}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Delivery Charge:</span>
            <strong>৳{deliveryCharge}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
            <span>Grand Total:</span>
            <strong style={{ fontSize: "1.2rem" }}>৳{grandTotal}</strong>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="admin-panel">
        <h2>Payment Details</h2>
        <div className="detail-grid">
          <label>
            Amount Received (৳)
            <input 
              type="number" 
              min="0" 
              max={grandTotal}
              value={paidAmount} 
              onChange={e => setPaidAmount(Number(e.target.value))} 
            />
          </label>
          <label>
            Payment Method
            <select name="paymentMethod" disabled={paidAmount === 0}>
              <option value="MANUAL">Manual / Bank</option>
              <option value="CASH">Cash</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
            </select>
          </label>
          <label>
            Transaction ID / Reference
            <input name="transactionId" disabled={paidAmount === 0} placeholder="e.g. TXN123" />
          </label>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>Remaining Due:</span>
            <strong style={{ fontSize: "1.5rem", color: dueAmount === 0 ? "green" : "inherit" }}>
              ৳{dueAmount}
            </strong>
          </div>
        </div>
      </div>

      {/* Internal Note */}
      <div className="admin-panel">
        <h2>Internal Note (Admin only)</h2>
        <label>
          <textarea name="internalNote" rows={3} placeholder="Customer called by phone..." style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc" }} />
        </label>
      </div>

      {error && <div className="form-error" style={{ color: "red" }}>{error}</div>}

      <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
        <button type="submit" className="button button-primary" disabled={loading} style={{ flex: 1, padding: "16px", fontSize: "1.1rem" }}>
          {loading ? "Creating..." : "Create Order"}
        </button>
        <Link href="/admin/orders" className="button button-secondary" style={{ padding: "16px" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
