"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Item {
  src: string;
  label: string;
  file: string;
  pageNum?: number;
}

const copy = {
  aria: "সূচিপত্রের পৃষ্ঠাগুলো",
  enlarge: " বড় করে দেখুন",
  swipe: "সোয়াইপ করে আরও দেখুন →",
  close: "বন্ধ করুন",
  previous: "আগের পৃষ্ঠা",
  next: "পরের পৃষ্ঠা",
};

export function TocLightbox({ items }: { items: Item[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [startX, setStartX] = useState<number | null>(null);

  const move = (direction: number) => {
    setActive((current) => {
      if (current === null) return current;
      const newIndex = current + direction;
      if (newIndex < 0) return items.length - 1;
      if (newIndex >= items.length) return 0;
      return newIndex;
    });
  };

  useEffect(() => {
    if (active === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(null);
      } else if (event.key === "ArrowLeft") {
        setActive((current) => {
          if (current === null) return current;
          if (current === 0) return items.length - 1;
          return current - 1;
        });
      } else if (event.key === "ArrowRight") {
        setActive((current) => {
          if (current === null) return current;
          if (current === items.length - 1) return 0;
          return current + 1;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [active, items.length]);

  return (
    <>
      <div className="toc-gallery" aria-label={copy.aria}>
        {items.map((item, index) => (
          <button
            className="toc-gallery-item"
            type="button"
            key={item.file}
            onClick={() => setActive(index)}
            aria-label={item.label + copy.enlarge}
            style={{ position: "relative", overflow: "hidden", background: "#fffdf8" }}
          >
            <Image
              src={item.src}
              alt={item.label}
              width={400}
              height={534}
              sizes="(max-width: 700px) 82vw, (max-width: 1100px) 42vw, 30vw"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                background: "rgba(23, 63, 55, 0.85)",
                color: "#fffdf8",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "800",
              }}
            >
              {item.label}
            </div>
          </button>
        ))}
      </div>

      <p className="toc-swipe-hint">{copy.swipe}</p>

      {active !== null && (
        <div
          className="toc-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={items[active].label}
          onClick={() => setActive(null)}
          onPointerDown={(event) => setStartX(event.clientX)}
          onPointerUp={(event) => {
            if (startX === null) return;
            const distance = event.clientX - startX;
            if (Math.abs(distance) > 45) {
              move(distance > 0 ? -1 : 1);
            }
            setStartX(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(23, 63, 55, 0.95)",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
          }}
        >
          <button
            type="button"
            className="toc-lightbox-close"
            aria-label={copy.close}
            onClick={() => setActive(null)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#fffdf8",
              font: "inherit",
              fontSize: "28px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1001,
            }}
          >
            ✕
          </button>

          <button
            type="button"
            className="toc-lightbox-prev"
            aria-label={copy.previous}
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
            style={{
              position: "absolute",
              left: "16px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#fffdf8",
              font: "inherit",
              fontSize: "32px",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1001,
            }}
          >
            ‹
          </button>

          <div
            className="toc-lightbox-image"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(90vw, 500px)",
              aspectRatio: "400/534",
              background: "#fffdf8",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <Image
              src={items[active].src}
              alt={items[active].label}
              fill
              sizes="90vw"
              priority
              style={{
                objectFit: "contain",
              }}
            />
          </div>

          <button
            type="button"
            className="toc-lightbox-next"
            aria-label={copy.next}
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
            style={{
              position: "absolute",
              right: "16px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#fffdf8",
              font: "inherit",
              fontSize: "32px",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1001,
            }}
          >
            ›
          </button>

          <p
            className="toc-lightbox-count"
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(23, 63, 55, 0.85)",
              color: "#fffdf8",
              padding: "8px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              fontWeight: "700",
              whiteSpace: "nowrap",
            }}
          >
            {items[active].label}
          </p>
        </div>
      )}
    </>
  );
}
