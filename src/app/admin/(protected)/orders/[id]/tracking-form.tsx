"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrackingUpdateForm({ orderId, initialCarrier, initialTracking }: { orderId: string, initialCarrier: string, initialTracking: string }) {
  const [carrier, setCarrier] = useState(initialCarrier);
  const [tracking, setTracking] = useState(initialTracking);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_TRACKING", carrierName: carrier, trackingNumber: tracking }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update tracking");
      }
      setMessage("Saved");
      setTimeout(() => setMessage(""), 2000);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ color: "#666", display: "block", fontSize: "12px", fontWeight: "bold" }}>Tracking Information</span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input 
          type="text" 
          placeholder="Carrier (e.g. Steadfast)" 
          value={carrier} 
          onChange={(e) => setCarrier(e.target.value)} 
          className="search-input"
          style={{ flex: 1, minWidth: "120px", padding: "6px 8px" }}
        />
        <input 
          type="text" 
          placeholder="Tracking Number" 
          value={tracking} 
          onChange={(e) => setTracking(e.target.value)} 
          className="search-input"
          style={{ flex: 1, minWidth: "140px", padding: "6px 8px" }}
        />
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="button"
          style={{ padding: "6px 12px", whiteSpace: "nowrap" }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      {message && <span style={{ fontSize: "12px", color: message === "Saved" ? "#166534" : "#a52d24" }}>{message}</span>}
    </div>
  );
}
