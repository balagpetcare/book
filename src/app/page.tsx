import { BOOK_CONTENT, BOOK_OFFER, HERO_CONTENT } from "@/data/book";
import { AuthorFaqFinal } from "@/components/author-faq-final";
import { BookTocGallery } from "@/components/book-toc-gallery";
import { HomepageVisualSections } from "@/components/homepage-visual-sections";
import { DiseaseJourneySection } from "@/components/disease-journey-section";
import { BookCoverSlot } from "@/components/book-cover-slot";
import { calculatePricing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const copy = { price: "বিশেষ মূল্য", free: "সম্পূর্ণ পেমেন্টে বাংলাদেশ পোস্টে ডেলিভারি ফ্রি", cover: "বইয়ের প্রচ্ছদ", sticky: "এখনই অর্ডার করুন →", separator: " • " };
const taka = (n: number) => "৳" + n.toLocaleString("bn-BD");

export default async function Home() {
  const settings = await prisma.bookSettings.findFirst();
  const source = settings ?? BOOK_OFFER;
  const pricing = calculatePricing(source);
  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <span className="eyebrow">{HERO_CONTENT.eyebrow}</span>
          <h1>{HERO_CONTENT.heading}</h1>
          <p className="author">{HERO_CONTENT.author}</p>
          <p className="hero-description">{HERO_CONTENT.description}</p>
          <ul className="hero-facts">
            {HERO_CONTENT.facts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
          <div className="hero-price">
            <span>{copy.price}</span>
            <strong>{taka(pricing.bookPrice)}</strong>
            <small>{copy.free}</small>
          </div>
          <div className="hero-actions">
            <a className="button button-primary hero-button" href="/order">
              {HERO_CONTENT.primaryCta} →
            </a>
            <a className="button button-outline hero-button" href="#book-toc">
              {HERO_CONTENT.secondaryCta}
            </a>
          </div>
        </div>
        <BookCoverSlot title={BOOK_CONTENT.title} />
      </section>
      <div className="trust-bar page-shell">
        {HERO_CONTENT.trustBar.map((item, index) => (
          <span key={item}>
            {index > 0 && <i aria-hidden="true">{copy.separator}</i>}
            {item}
          </span>
        ))}
      </div>
      <HomepageVisualSections pricing={pricing} />
      <BookTocGallery pricing={pricing} />
      <DiseaseJourneySection pricing={pricing} />
      <AuthorFaqFinal
        bookPrice={pricing.bookPrice}
        postDelivery={pricing.postDeliveryCharge}
        courierDelivery={pricing.courierDeliveryCharge}
        courierAdvance={pricing.courierPayNow}
      />
      <a className="sticky-cta" href="/order">
        <strong>{taka(pricing.bookPrice)}</strong>
        <span>{copy.sticky}</span>
      </a>
    </main>
  );
}
