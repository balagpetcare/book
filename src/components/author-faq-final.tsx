import fs from "node:fs/promises";
import path from "node:path";
import Image from "next/image";
import { BOOK_CONTENT } from "@/data/book";
import { Plus, ShoppingCart } from "lucide-react";

const taka = (n: number) => "৳" + n.toLocaleString("bn-BD");

const ui = {
  author: "লেখক পরিচিতি",
  help: "সাহায্য ও তথ্য",
  faq: "সাধারণ প্রশ্ন",
  toc: "সূচিপত্র দেখুন →",
  final: "বিডালের যত্ন সম্পর্কে আরও আত্মবিশ্বাসী হোন",
  text: "৩২৬ পৃষ্ঠার ব্যবহারিক বাংলা গাইডটি আজই সংগ্রহ করুন।",
  trust: "বাংলাদেশ পোস্টে ডেলিভারি ফ্রি",
  order: "এখনই অর্ডার করুন →",
  amount: "মাত্র",
};

type Props = {
  bookPrice: number;
  postDelivery: number;
  courierDelivery: number;
  courierAdvance: number;
};

async function authorImage() {
  try {
    await fs.access(path.join(process.cwd(), "public", "images", "book", "bala_g.jpg"));
    return "/images/book/bala_g.jpg";
  } catch {
    return null;
  }
}

export async function AuthorFaqFinal({
  bookPrice,
  postDelivery,
  courierDelivery,
  courierAdvance,
}: Props) {
  const image = await authorImage();
  const postTotal = bookPrice + postDelivery;
  const courierTotal = bookPrice + courierDelivery;

  const faqs = [
    ...BOOK_CONTENT.faq,
    {
      q: "বাংলাদেশ পোস্টে ডেলিভারি চার্জ কত?",
      a: `সম্পূর্ণ ${taka(postTotal)} পেমেন্ট করলে বাংলাদেশ পোস্টে ডেলিভারি ফ্রি।`,
    },
    {
      q: "কুরিয়ারের হোম ডেলিভারি কীভাবে হবে?",
      a: `মোট ${taka(courierTotal)}। অর্ডারের সময় ${taka(courierAdvance)} এবং হাতে পেয়ে বাকি ${taka(courierTotal - courierAdvance)}।`,
    },
  ];

  return (
    <>
      <section className="author-section-enterprise page-shell">
        <div className="section-heading-centered">
          <span className="eyebrow">{ui.author}</span>
          <h2>{BOOK_CONTENT.author}</h2>
          <p className="section-lead-centered">বইটির লেখক ও প্রাণিচিকিৎসক</p>
        </div>
        <div className="author-block">
          <div className="author-avatar-wrapper">
            {image ? (
              <Image
                className="author-photo"
                src={image}
                alt={`${BOOK_CONTENT.author} এর ছবি`}
                width={140}
                height={140}
              />
            ) : (
              <div className="author-mark-enterprise" aria-hidden="true">
                BG
              </div>
            )}
          </div>
          <p className="author-bio">{BOOK_CONTENT.authorDescription}</p>
        </div>
      </section>

      <section className="faq-section-enterprise page-shell">
        <div className="section-heading-centered">
          <span className="eyebrow">{ui.help}</span>
          <h2>{ui.faq}</h2>
          <p className="section-lead-centered">অর্ডার, পেমেন্ট, ডেলিভারি ও বই সম্পর্কে গুরুত্বপূর্ণ প্রশ্নগুলোর উত্তর।</p>
        </div>
        <div className="faq-container-enterprise">
          <div className="faq-list-enterprise">
            {faqs.map((item) => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <Plus className="faq-toggle-icon" size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
                {"toc" in item && item.toc && (
                  <a className="faq-toc-link" href="#book-toc">
                    {ui.toc}
                  </a>
                )}
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta-enterprise page-shell">
        <span className="eyebrow">{BOOK_CONTENT.subtitle}</span>
        <h2>{ui.final}</h2>
        <p className="subtitle">{ui.text}</p>
        <div className="final-cta-price-block">
          <strong>
            {ui.amount} {taka(bookPrice)}
          </strong>
          <span>{ui.trust}</span>
        </div>
        <a className="cta-btn" href="/order">
          <ShoppingCart size={22} aria-hidden="true" /> এখনই অর্ডার করুন
        </a>
      </section>
    </>
  );
}
