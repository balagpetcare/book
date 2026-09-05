"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { trackAddPaymentInfo } from "@/lib/meta-pixel";

type Props = {
  orderNumber: string;
  bkashNumber: string;
  nagadNumber: string;
  amount: number;
};

const taka = (n: number) => "৳" + n.toLocaleString("bn-BD");

const text = {
  method: "পেমেন্ট মাধ্যম",
  send: "পেমেন্ট পাঠান",
  amount: "পেমেন্টের পরিমাণ",
  copy: "কপি",
  copied: "কপি হয়েছে",
  sender: "পেমেন্টের মোবাইল",
  tx: "Transaction ID",
  proof: "পেমেন্টের স্ক্রিনশট",
  submit: "পেমেন্টের তথ্য সম্পন্ন করুন",
  manual:
    "পেমেন্দেদের তথ্য জমা দেওয়ার পর আমরা তা যাচাই করব।",
};

export function PaymentForm({
  orderNumber,
  bkashNumber,
  nagadNumber,
  amount,
}: Props) {
  const [method, setMethod] = useState<"BKASH" | "NAGAD">("BKASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/orders/" + orderNumber + "/payment", {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error || "Please check your payment details.");
      setBusy(false);
      return;
    }
    trackAddPaymentInfo({ value: amount, currency: 'BDT' });
    window.location.href = "/order/success/" + j.orderNumber;
  }

  function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  function removeFile() {
    setPreview("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const account = method === "BKASH" ? bkashNumber : nagadNumber;

  return (
    <form className="checkout-form payment-form" onSubmit={submit}>
      {/* PAYMENT METHOD SELECTION & INSTRUCTIONS */}
      <section className="payment-instructions">
        <h2>{text.method}</h2>
        <div className="payment-method-cards">
          <label
            className={
              "payment-method-card " + (method === "BKASH" ? "selected" : "")
            }
          >
            <input
              type="radio"
              name="paymentMethod"
              value="BKASH"
              checked={method === "BKASH"}
              onChange={() => setMethod("BKASH")}
            />
            <b>bKash</b>
            <span>Personal</span>
          </label>
          <label
            className={
              "payment-method-card " + (method === "NAGAD" ? "selected" : "")
            }
          >
            <input
              type="radio"
              name="paymentMethod"
              value="NAGAD"
              checked={method === "NAGAD"}
              onChange={() => setMethod("NAGAD")}
            />
            <b>Nagad</b>
            <span>Personal</span>
          </label>
        </div>

        <div className="payable-card">
          <div>
            <span>{text.amount}</span>
            <strong>{taka(amount)}</strong>
          </div>
          <button
            type="button"
            onClick={() => copy(String(amount), "amount")}
          >
            {copied === "amount" ? text.copied : text.copy}
          </button>
        </div>

        <div className="send-account">
          <span>
            {text.send} {method === "BKASH" ? "bKash" : "Nagad"} Personal
          </span>
          <strong>{account}</strong>
          <button type="button" onClick={() => copy(account, "account")}>
            {copied === "account" ? text.copied : text.copy}
          </button>
        </div>

        <ol className="payment-steps">
          <li>bKash/Nagad অ্যাপ খুলুন</li>
          <li>উপরে দেখানো নম্বরে নির্ধারিত টাকা পাঠান</li>
          <li>পেমেন্ট সম্পন্ন হলে Transaction ID সংগ্রহ করুন</li>
          <li>নিচে Transaction ID এবং পেমেন্টের প্রমাণ দিন</li>
        </ol>
      </section>

      {/* PAYMENT VERIFICATION FORM */}
      <section className="payment-details">
        <label>
          {text.sender}
          <input
            name="senderMobile"
            required
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
          />
        </label>
        <label>
          {text.tx}
          <small>পেমেন্ট সম্পন্ন হওয়ার পর পাওয়া Transaction ID লিখুন।</small>
          <input name="transactionId" required autoComplete="off" />
        </label>
        <label className="proof-upload">
          {text.proof}
          <small>
            bKash/Nagad পেমেন্ট সম্পন্ন হওয়ার স্ক্রিনশট আপলোড করুন। JPG, PNG বা
            WEBP · সর্বোচ্চ 5MB
          </small>
          <input
            ref={fileRef}
            name="proof"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={chooseFile}
          />
          {preview && (
            <span className="proof-preview">
              <Image src={preview} alt="Selected payment proof" width={72} height={72} />
              <span>{fileName}</span>
              <button type="button" onClick={removeFile}>
                Remove
              </button>
            </span>
          )}
        </label>
        <p className="manual-note">{text.manual}</p>

        {/* PRIMARY BUTTON ON MOBILE - RENDERS RIGHT AFTER FORM */}
        <button
          className="button button-primary submit-button mobile-only"
          disabled={busy}
          type="submit"
        >
          {busy ? "জমা দেওয়া হচ্ছে..." : text.submit + " →"}
        </button>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {/* PRIMARY BUTTON ON DESKTOP */}
      <button
        className="button button-primary submit-button desktop-only"
        disabled={busy}
        type="submit"
      >
        {busy ? "জমা দেওয়া হচ্ছে..." : text.submit + " →"}
      </button>

      {/* SUPPORT LINK */}
      <p className="order-support">
        <a href="tel:01575008300">
          পেমেন্ট বা অর্ডার সংক্রান্ত সহায়তা: 01575008300
        </a>
      </p>
    </form>
  );
}
