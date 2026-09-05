import { BOOK_CONTENT } from "@/data/book";
import type { Pricing } from "@/lib/pricing";
import { ShoppingCart, Activity, Stethoscope, Shield, Settings, Pill } from "lucide-react";

const taka = (n: number) => "৳" + n.toLocaleString("bn-BD");

const ui = {
  eyebrow: "ধাপে ধাপে ব্যবহারিক ধারণা",
  title: "একটি রোগ বুঝুন শুরু থেকে শেষ পর্যন্ত",
  description: "শুধু রোগের নাম নয়—কারণ, সংক্রমণ, লক্ষণ, প্রতিরোধ এবং চিকিৎসার ধারাবাহিক ধারণা।",
  deliveryFree: "সারা বাংলাদেশে",
  deliveryTitle: "ডেলিভারি ফ্রি",
  specialPrice: "বিশেষ মূল্য",
  onlyPrice: "মাত্র",
  orderBtn: "এখনই অর্ডার করুন",
  safeOrder: "নিরাপদ অর্ডার",
  easyPayment: "সহজ পেমেন্ট",
};

const detail = [
  "কেন রোগটি হয় এবং কোন বিষয়গুলো ঝুঁকি বাড়ায়।",
  "সংক্রমণের উৎস ও বিস্তারের পথ বুঝুন।",
  "প্রাথমিক ও গুরুত্বপূর্ণ লক্ষণ চিনতে শিখুন।",
  "আগে থেকেই ঝুঁকি কমানোর ব্যবহারিক উপায়।",
  "খাবার, পরিচর্যা ও অসুস্থ অবস্থার দৈনন্দিন ব্যবস্থাপনা।",
  "প্রয়োজনীয় চিকিৎসা ও কখন ভেটেরিনারিয়ানের সহায়তা প্রয়োজন।",
];

const JourneyIcons = [Activity, Stethoscope, Shield, Settings, Pill, Stethoscope];

export function DiseaseJourneySection({ pricing }: { pricing: Pricing }) {
  return (
    <section className="journey-section-enterprise page-shell">
      <div className="section-heading-centered">
        <span className="eyebrow">{ui.eyebrow}</span>
        <h2>{ui.title}</h2>
      </div>
      <p className="section-lead-centered">{ui.description}</p>
      <div className="journey-grid-enterprise">
        {BOOK_CONTENT.journey.map((s, i) => {
          const JIcon = JourneyIcons[i];
          return (
            <div className="journey-step-enterprise" key={s}>
              <div className="journey-icon-wrapper">
                <div className="journey-icon-ring" aria-hidden="true">
                  <JIcon size={38} strokeWidth={1.5} />
                </div>
                <span className="journey-badge">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3>{s}</h3>
              <p>{detail[i]}</p>
              {i < BOOK_CONTENT.journey.length - 1 && <div className="journey-connector" aria-hidden="true"></div>}
            </div>
          );
        })}
      </div>
      <div className="journey-cta-enterprise">
        <div className="cta-delivery">
          <span>{ui.deliveryFree}</span>
          <strong>{ui.deliveryTitle}</strong>
        </div>
        <div className="cta-price">
          <span>{ui.specialPrice}</span>
          <strong>{ui.onlyPrice} {taka(pricing.bookPrice)}</strong>
        </div>
        <a className="button button-primary cta-btn" href="/order">
          <ShoppingCart size={20} className="cta-btn-icon" aria-hidden="true" /> {ui.orderBtn}
        </a>
        <div className="cta-trust">
          <span>{ui.safeOrder}</span>
          <span className="trust-dot" aria-hidden="true">•</span>
          <span>{ui.easyPayment}</span>
        </div>
      </div>
    </section>
  );
}
