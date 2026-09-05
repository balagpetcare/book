import fs from "node:fs/promises";
import path from "node:path";
import { TocLightbox } from "@/components/toc-lightbox";
import { SectionHeading } from "@/components/section-heading";
import { TocPdfSection } from "@/components/toc-pdf-section";
import type { Pricing } from "@/lib/pricing";

const ui = {
  eyebrow: "বইয়ের ভেতরে এক নজর",
  title: "বইটির পূর্ণ সূচিপত্র",
  description: "বইটিতে কোন কোন বিষয়, রোগ, পরিচর্যা ও চিকিৎসা নিয়ে আলোচনা করা হয়েছে—সূচিপত্র থেকে এক নজরে দেখে নিন।",
  after: "সূচিপত্রে থাকা বিষয়গুলো বিস্তারিতভাবে জানতে সম্পূর্ণ বই সংগ্রহ করুন।",
  price: "মাত্র",
  free: "বাংলাদেশ পোস্ট অফিসের মাধ্যমে ডেলিভারি ফ্রি ।",
  order: "এখনই অর্ডার করুন →",
};

interface TocItem {
  src: string;
  label: string;
  file: string;
  pageNum: number;
}

export async function BookTocGallery({ pricing }: { pricing: Pricing }) {
  const directory = path.join(process.cwd(), "public", "images", "content");
  let files: string[] = [];

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    files = entries
      .filter((e) => e.isFile() && e.name.match(/^book_content-\d+\.jpg$/i))
      .map((e) => e.name)
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return numA - numB;
      });
  } catch {
    // Directory doesn't exist or can't be read
  }

  // Generate items for all found images (up to 12)
  const items: TocItem[] = files.slice(0, 12).map((file, index) => {
    const pageNum = index + 1;
    return {
      src: `/images/content/${encodeURIComponent(file)}`,
      label: `সূচিপত্র • ${pageNum}/12`,
      file,
      pageNum,
    };
  });

  return (
    <section id="book-toc" className="page-shell preview-section">
      <SectionHeading eyebrow={ui.eyebrow} title={ui.title} />
      <p className="toc-description">{ui.description}</p>

      {items.length > 0 ? (
        <>
          <TocLightbox items={items} />

          <TocPdfSection />

          <div className="toc-after-copy">
            <p>{ui.after}</p>
            <strong>
              {ui.price} ৳{pricing.bookPrice.toLocaleString("bn-BD")}
            </strong>
            <span>{ui.free}</span>
            <a className="button button-primary order-button" href="/order">
              {ui.order}
            </a>
          </div>
        </>
      ) : (
        <div className="toc-empty" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#6a716c" }}>সূচিপত্র উপলব্ধ নয়</p>
        </div>
      )}
    </section>
  );
}
