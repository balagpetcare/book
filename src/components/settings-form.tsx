"use client";
import { useState } from "react";
const taka = (n: number) => `${String.fromCodePoint(0x09f3)}${n.toLocaleString("bn-BD")}`;
export function SettingsForm({ settings }: { settings: Record<string, string | number | Date | null> }) { const [message, setMessage] = useState(""); const [values, setValues] = useState({ book: Number(settings.prepaidPrice ?? 350), post: Number(settings.bangladeshPostDeliveryCharge ?? 0), courier: Number(settings.courierDeliveryCharge ?? Number(settings.courierTotalPrice ?? 450) - Number(settings.prepaidPrice ?? 350)), advance: Number(settings.courierAdvance ?? 100) }); async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const body = Object.fromEntries(f.entries()); const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); setMessage(r.ok ? "Saved." : j.error); } const field = (name: string, label: string, type = "text") => <label>{label}<input name={name} type={type} defaultValue={String(settings[name] ?? "")} onChange={(e) => { const value = Number(e.target.value); if (name === "prepaidPrice") setValues((v) => ({ ...v, book: value })); if (name === "bangladeshPostDeliveryCharge") setValues((v) => ({ ...v, post: value })); if (name === "courierDeliveryCharge") setValues((v) => ({ ...v, courier: value })); if (name === "courierAdvance") setValues((v) => ({ ...v, advance: value })); }} /></label>; return (
    <form className="settings-form" onSubmit={submit}>
      {field("title", "Book title")}
      {field("description", "Description")}
      <h2 className="settings-section-heading">Book price and delivery settings</h2>
      {field("prepaidPrice", "Book price", "number")}
      {field("bangladeshPostDeliveryCharge", "Bangladesh Post delivery charge", "number")}
      {field("courierDeliveryCharge", "Courier delivery charge", "number")}
      {field("courierAdvance", "Courier advance payment", "number")}
      <div className="pricing-preview">
        <div className="pricing-preview-item">
          <span>Bangladesh Post:</span>
          <div>
            <p>Total: {taka(values.book + values.post)}</p>
            <p>Pay now: {taka(values.book + values.post)}</p>
          </div>
        </div>
        <div className="pricing-preview-item">
          <span>Courier:</span>
          <div>
            <p>Total: {taka(values.book + values.courier)}</p>
            <p>Pay now: {taka(values.advance)}</p>
            <p>Due: {taka(Math.max(0, values.book + values.courier - values.advance))}</p>
          </div>
        </div>
      </div>
      {field("bkashNumber", "bKash number")}
      {field("nagadNumber", "Nagad number")}
      {field("stockAdjustment", "Stock adjustment (signed quantity)", "number")}
      <button className="button button-primary">Save settings</button>
      {message && <p className="settings-message">{message}</p>}
    </form>
  );
}
