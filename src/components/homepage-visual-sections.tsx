import { BOOK_CONTENT } from "@/data/book";
import { SectionHeading } from "@/components/section-heading";
import type { Pricing } from "@/lib/pricing";

const taka = (n: number) => "৳" + n.toLocaleString("bn-BD");

const ui = {
  a: "বইটিতে যা যা পাবেন",
  b: "বইটিতে যা যা জানতে পারবেন",
  c: "রোগ শনাক্ত করা থেকে চিকিৎসা ও দৈনন্দিন পরিচর্যা—প্রয়োজনীয় বিষয়গুলো ধাপে ধাপে সাজানো হয়েছে।",
  g: "মূল্য ও ডেলিভারি",
  h: "আপনার সুবিধামতো ডেলিভারি বেছে নিন",
  k: "সেরা অফার",
  l: "বাংলাদেশ পোস্ট",
  m: "সম্পূর্ণ পেমেন্ট",
  n: "ডেলিভারি সম্পূর্ণ ফ্রি",
  o: "কুরিয়ার হোম ডেলিভারি",
  p: "মোট",
  q: "এখন",
  r: "দিন",
  s: "হাতে পেয়ে বাকি",
  t: "এর অংশ, অতিরিক্ত কোনো চার্জ নয়।",
  v: "কুরিয়ারে অর্ডার করুন",
  w: "-এ অর্ডার করুন",
};

const detail = [
  "কেন রোগটি হয় এবং কোন বিষয়গুলো ঝুঁকি বাড়ায়।",
  "সংক্রমণের উৎস ও বিস্তারের পথ বুঝুন।",
  "প্রাথমিক ও গুরুত্বপূর্ণ লক্ষণ চিনতে শিখুন।",
  "আগে থেকেই ঝুঁকি কমানোর ব্যবহারিক উপায়।",
  "খাবার, পরিচর্যা ও অসুস্থ অবস্থার দৈনন্দিন ব্যবস্থাপনা।",
  "প্রয়োজনীয় চিকিৎসা ও কখন ভেটেরিনারিয়ানের সহায়তা প্রয়োজন।",
];

import { Search, Wind, AlertCircle, ShieldCheck, ClipboardList, Cross } from "lucide-react";

const Icons = [Search, Wind, AlertCircle, ShieldCheck, ClipboardList, Cross];

export function HomepageVisualSections({ pricing }: { pricing: Pricing }) {
  return (
    <>
      <section className="learning-section-modern">
        <div className="page-shell">
          <div className="section-heading-centered">
            <span className="eyebrow">{ui.a}</span>
            <h2>{ui.b}</h2>
          </div>
          <p className="section-lead-centered">{ui.c}</p>
          <div className="topic-grid-modern">
            {BOOK_CONTENT.subjects.map((s, i) => {
              const Icon = Icons[i];
              return (
                <article className="topic-modern" key={s}>
                  <div className="topic-icon-modern" aria-hidden="true">
                    <Icon size={26} strokeWidth={2} />
                  </div>
                  <span className="topic-number-modern">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{s}</h3>
                  <p>{detail[i]}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="page-shell pricing-section">
        <SectionHeading eyebrow={ui.g} title={ui.h} />
        <div className="pricing-grid">
          <article className="pricing-card pricing-card-featured">
            <span className="pricing-badge">{ui.k}</span>
            <h3>{ui.l}</h3>
            <strong className="pricing-total">{taka(pricing.postTotal)}</strong>
            <span>{ui.m}</span>
            <b>{ui.n}</b>
            <a className="button button-primary" href="/order">
              {taka(pricing.postTotal)}{ui.w}
            </a>
          </article>
          <article className="pricing-card">
            <h3>{ui.o}</h3>
            <strong className="pricing-total">
              {ui.p} {taka(pricing.courierTotal)}
            </strong>
            <span>
              {ui.q} {taka(pricing.courierPayNow)} {ui.r}
            </span>
            <b>
              {ui.s} {taka(pricing.courierDue)} {ui.r}
            </b>
            <p>
              {taka(pricing.courierPayNow)} {ui.p} {taka(pricing.courierTotal)}-{ui.t}
            </p>
            <a className="button button-outline" href="/order">
              {ui.v}
            </a>
          </article>
        </div>
      </section>
    </>
  );
}
