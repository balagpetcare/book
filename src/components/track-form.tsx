"use client";
import { useState } from "react";
type TrackOrder = { orderNumber: string; status: string; paidAmount: number; dueAmount: number; areaOrVillage: string; upazilaOrThana: string; district: string; division: string; trackingNumber: string | null; carrierName: string | null };
export function TrackForm() {
  const [result, setResult] = useState<TrackOrder | null>(null); const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setError(""); setResult(null); const data = new FormData(e.currentTarget); const r = await fetch(`/api/track?orderNumber=${encodeURIComponent(String(data.get("orderNumber")))}&mobile=${encodeURIComponent(String(data.get("mobile")))}`); const json = await r.json(); if (!r.ok) setError(json.error); else setResult(json.order as TrackOrder); }
  return <div><form className="track-form" onSubmit={submit}><input name="orderNumber" placeholder="Order number e.g. BG-260904-00001" required /><input name="mobile" placeholder="Mobile used in order" required inputMode="tel" /><button className="button button-primary">Find order</button></form>{error && <p className="form-error" role="alert">{error}</p>}{result && <div className="track-result"><p className="eyebrow">{result.orderNumber}</p><h2>{result.status}</h2><p>Paid ৳{result.paidAmount} · Due ৳{result.dueAmount}</p><p>{result.areaOrVillage}, {result.upazilaOrThana}, {result.district}, {result.division}</p>{result.trackingNumber && <p>{result.carrierName}: {result.trackingNumber}</p>}</div>}</div>;
}
