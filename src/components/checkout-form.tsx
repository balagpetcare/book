"use client";
import { useState, useEffect, useRef } from "react";
import type { Pricing } from "@/lib/pricing";
import { navigateAfterMetaPixelCall, trackInitiateCheckout, trackViewContent } from "@/lib/meta-pixel";

const taka = (n: number) => "৳" + n.toLocaleString("bn-BD");

const text = {
  deliveryEyebrow: "ডেলিভারি পদ্ধতি",
  choose: "আপনার জন্য সুবিধাজনকটি বেছে নিন",
  customerEyebrow: "গ্রাহকের তথ্য",
  post: "বাংলাদেশ পোস্ট",
  courier: "কুরিয়ার হোম ডেলিভারি",
  order: "অর্ডার সারাংশ",
  details: "ডেলিভারির তথ্য",
  detailsSub: "যে ঠিকানায় বইটি গ্রহণ করতে চান সেই তথ্য দিন।",
  name: "পূর্ণ নাম",
  mobile: "মোবাইল নম্বর",
  district: "জেলা",
  upazila: "উপজেলা / থানা",
  address: "সম্পূর্ণ ঠিকানা",
  postal: "পোস্টাল কোড (ঐচ্ছিক)",
  now: "এখন পরিশোধ",
  due: "পরে পরিশোধ",
  charge: "ডেলিভারি চার্জ",
  book: "বই",
  total: "মোট",
  continue: "পেমেন্টে এগিয়ে যান",
  postHelp: "সম্পূর্ণ পেমেন্ট করুন",
  postFree: "বাংলাদেশ পোস্টে ডেলিভারি ফ্রি",
  courierPart: "অগ্রিম টাকা মোট মূল্যের অংশ—অতিরিক্ত কোনো চার্জ নয়",
  note: "ডেলিভারি পদ্ধতি পরিবর্তন করলে মোট মূল্য স্বয়ংক্রিয়ভাবে আপডেট হবে।",
  delivery: "সাধারণত ৩–৪ দিনের মধ্যে অর্ডার হাতে পৌঁছে যাবে।",
  support: "অর্ডার বা ডেলিভারি সহায়তা",
  trust1: "সারা বাংলাদেশে ডেলিভারি",
  trust2: "নিরাপদ অর্ডার প্রক্রিয়া",
  saving: "জমা দেওয়া হচ্ছে...",
  error: "তথ্যগুলো ঠিক করে আবার চেষ্টা করুন।",
  check: "✓",
};

export function CheckoutForm({
  pricing,
  bookTitle,
}: {
  pricing: Pricing;
  bookTitle: string;
}) {
  const [plan, setPlan] = useState<"PREPAID_350" | "COURIER_ADVANCE_100">("PREPAID_350");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const viewContentSent = useRef(false);
  const initiateCheckoutSent = useRef(false);

  useEffect(() => {
    if (viewContentSent.current) return;
    viewContentSent.current = true;
    trackViewContent({
      content_type: 'product',
      content_name: bookTitle,
      value: pricing.bookPrice,
      currency: 'BDT',
    });
  }, [bookTitle, pricing.bookPrice]);

  const isPost = plan === "PREPAID_350";
  const total = isPost ? pricing.postTotal : pricing.courierTotal;
  const payNow = isPost ? pricing.postPayNow : pricing.courierPayNow;
  const due = isPost ? pricing.postDue : pricing.courierDue;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/orders", {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || text.error);
      setBusy(false);
      return;
    }
    if (!initiateCheckoutSent.current) {
      initiateCheckoutSent.current = true;
      trackInitiateCheckout({ value: total, currency: 'BDT', num_items: 1 });
    }
    navigateAfterMetaPixelCall("/order/" + result.orderNumber + "/payment");
  }

  const amount = (label: string, value: number) => (
    <div className="price-row">
      <span>{label}</span>
      <b>{taka(value)}</b>
    </div>
  );

  return (
    <form className="checkout-form" onSubmit={submit}>
      {/* DELIVERY SELECTION */}
      <section className="delivery-selector checkout-card">
        <div className="form-section-heading">
          <span className="eyebrow">{text.deliveryEyebrow}</span>
          <h2>{text.choose}</h2>
        </div>
        <label className={"plan-option " + (isPost ? "selected" : "")}>
          <input
            type="radio"
            name="plan"
            value="PREPAID_350"
            checked={isPost}
            onChange={() => setPlan("PREPAID_350")}
          />
          <span className="plan-content">
            <b>{text.post}</b>
            <strong className="plan-total">{taka(pricing.postTotal)}</strong>
            <small>
              {text.postHelp}
              <br />
              {text.postFree}
            </small>
          </span>
        </label>
        <label className={"plan-option " + (!isPost ? "selected" : "")}>
          <input
            type="radio"
            name="plan"
            value="COURIER_ADVANCE_100"
            checked={!isPost}
            onChange={() => setPlan("COURIER_ADVANCE_100")}
          />
          <span className="plan-content">
            <b>{text.courier}</b>
            <strong className="plan-total">{taka(pricing.courierTotal)}</strong>
            {amount(text.now, pricing.courierPayNow)}
            {amount(text.due, pricing.courierDue)}
            <small>{text.courierPart}</small>
          </span>
        </label>
      </section>

      {/* ORDER SUMMARY */}
      <section className="selected-order-summary checkout-card">
        <h2>{text.order}</h2>
        {amount(text.book, pricing.bookPrice)}
        <div>
          <span>{text.charge}</span>
          <b>{taka(isPost ? pricing.postDeliveryCharge : pricing.courierDeliveryCharge)}</b>
        </div>
        <div className="summary-total">
          <span>{text.total}</span>
          <strong>{taka(total)}</strong>
        </div>
        {amount(text.now, payNow)}
        {due > 0 && amount(text.due, due)}
        <p className="summary-note">{text.note}</p>
      </section>

      {/* CUSTOMER DETAILS FORM */}
      <section className="customer-details checkout-card">
        <div className="form-section-heading">
          <span className="eyebrow">{text.customerEyebrow}</span>
          <h2>{text.details}</h2>
          <p>{text.detailsSub}</p>
        </div>
        <div className="field">
          <label htmlFor="customer-name">{text.name}</label>
          <input
            id="customer-name"
            name="customerName"
            required
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label htmlFor="mobile">{text.mobile}</label>
          <input
            id="mobile"
            name="mobile"
            required
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="field">
          <label htmlFor="district">{text.district}</label>
          <input
            id="district"
            name="district"
            required
            autoComplete="address-level2"
          />
        </div>
        <div className="field">
          <label htmlFor="upazila">{text.upazila}</label>
          <input
            id="upazila"
            name="upazilaOrThana"
            required
            autoComplete="address-level3"
          />
        </div>
        <div className="field full-field">
          <label htmlFor="address">{text.address}</label>
          <textarea
            id="address"
            name="fullAddress"
            required
            rows={3}
            autoComplete="street-address"
          />
        </div>
        <div className="field">
          <label htmlFor="postal">{text.postal}</label>
          <input
            id="postal"
            name="postalCode"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            autoComplete="postal-code"
          />
        </div>

        {/* PRIMARY BUTTON ON MOBILE - RENDERS RIGHT AFTER FORM */}
        <button
          className="button button-primary submit-button mobile-only"
          disabled={busy}
          type="submit"
        >
          {busy ? text.saving : text.continue + " →"}
        </button>
      </section>

      {/* TRUST BLOCK */}
      <section className="order-trust-block">
        <p>
          {text.check} {text.delivery}
        </p>
        <p>
          {text.check} {text.trust1}
        </p>
        <p>
          {text.check} {text.trust2}
        </p>
        <div className="support-line">
          <span>{text.support}</span>
          <a href="tel:01575008300">01575008300</a>
        </div>
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
        {busy ? text.saving : text.continue + " →"}
      </button>
    </form>
  );
}
