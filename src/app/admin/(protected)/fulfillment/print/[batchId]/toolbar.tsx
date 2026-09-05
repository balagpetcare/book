"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function PrintBatchToolbar({ batch }: { batch: { id: string, batchNumber: string, deliveryMethod: string, items: unknown[], layout: string, printedAt: string | null | Date } }) {
  const router = useRouter();
  const [isMarking, setIsMarking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const markPrinted = async () => {
    if (!confirm("Mark this batch as printed? All included orders will move to the Dispatch queue.")) return;
    setIsMarking(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/fulfillment/batches/${batch.id}/mark-printed`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark printed");
      setSuccess(true);
      setTimeout(() => router.push("/admin/fulfillment"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setIsMarking(false);
    }
  };

  const printedTime = batch.printedAt
    ? new Date(batch.printedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="print-toolbar no-print">
      <div className="toolbar-left">
        <Link href="/admin/fulfillment" className="button button-secondary" style={{ padding: "8px 12px", fontSize: "13px" }}>
          ← Back
        </Link>
        <div className="batch-info">
          <h2>Batch {batch.batchNumber}</h2>
          <span className="badge">{batch.deliveryMethod.replace("_", " ")}</span>
          <span className="badge">{batch.items.length} orders</span>
          <span className="badge">{batch.layout}</span>
          {printedTime && <span className="badge success">✓ Printed {printedTime}</span>}
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: "13px", fontWeight: 600, minWidth: "200px", textAlign: "right" }}>⚠ {error}</div>}
      {success && <div style={{ color: "#16a34a", fontSize: "13px", fontWeight: 600 }}>✓ Marked as printed</div>}

      <div className="toolbar-right">
        <button onClick={handlePrint} className="button button-secondary" style={{ fontSize: "13px" }}>
          Print (Ctrl+P)
        </button>
        <button
          onClick={markPrinted}
          disabled={isMarking || success}
          className="button button-primary"
          style={{ fontSize: "13px", opacity: isMarking ? 0.6 : 1 }}
        >
          {isMarking ? "Marking..." : batch.printedAt ? "Mark Reprinted" : "Mark Batch as Printed"}
        </button>
      </div>
    </div>
  );
}
