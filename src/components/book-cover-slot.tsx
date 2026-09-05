import fs from "node:fs/promises";
import path from "node:path";
import Image from "next/image";

const copy = {
  cover: "বইয়ের কভার",
  alt: "বইয়ের প্রচ্ছদ",
};

export async function BookCoverSlot({ title }: { title: string }) {
  let exists = false;
  try {
    await fs.access(path.join(process.cwd(), "public", "images", "book", "book_cover.png"));
    exists = true;
  } catch {
    // Try fallback
    try {
      await fs.access(path.join(process.cwd(), "public", "images", "book", "book-cover.jpg"));
      exists = true;
    } catch {
      // File doesn't exist
    }
  }

  return (
    <div className="cover-frame">
      {exists ? (
        <Image
          src="/images/book/book_cover.png"
          alt={`${title} ${copy.alt}`}
          width={400}
          height={534}
          priority
          sizes="(max-width: 699px) 72vw, 360px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      ) : (
        <div className="cover-placeholder" role="img" aria-label={copy.cover}>
          <strong>{copy.cover}</strong>
          <span>book_cover.png</span>
        </div>
      )}
    </div>
  );
}
