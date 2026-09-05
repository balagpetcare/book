import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("homepage JSX does not emit literal Bengali escape text", () => {
  const files = ["src/app/page.tsx", "src/components/homepage-visual-sections.tsx", "src/components/book-toc-gallery.tsx", "src/components/author-faq-final.tsx", "src/components/book-cover-slot.tsx", "src/components/toc-lightbox.tsx"];
  for (const file of files) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    assert.equal(source.includes(">\\u09"), false, file + " contains escaped JSX text");
    assert.equal(source.includes('="\\u09'), false, file + " contains escaped JSX attribute text");
  }
  const bengali = String.fromCodePoint(0x09ac, 0x09bf, 0x09dc, 0x09be, 0x09b2);
  assert.equal(bengali, String.fromCodePoint(0x09ac, 0x09bf, 0x09dc, 0x09be, 0x09b2));
});
