"use client";
const copy = {
  heading: "পূর্ণ সূচিপত্র একসাথে দেখতে চান?",
  description: "১২ পৃষ্ঠার সম্পূর্ণ সূচিপত্র PDF আকারে দেখুন অথবা ডাউনলোড করে রাখুন।",
  view: "সূচিপত্র PDF দেখুন",
  download: "PDF ডাউনলোড করুন",
};

export function TocPdfSection() {
  const pdfUrl = "/images/content/book_content.pdf";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "book_content.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        background: "#e5efe6",
        borderRadius: "16px",
        padding: "28px 24px",
        margin: "32px 0",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          fontSize: "1.2rem",
          fontWeight: "800",
          color: "#173f37",
          margin: "0 0 10px",
        }}
      >
        {copy.heading}
      </h3>
      <p
        style={{
          color: "#6a716c",
          fontSize: "0.95rem",
          lineHeight: "1.6",
          margin: "0 0 20px",
          maxWidth: "500px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {copy.description}
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "48px",
            padding: "12px 20px",
          }}
        >
          👁 {copy.view}
        </a>
        <button
          onClick={handleDownload}
          className="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "48px",
            padding: "12px 20px",
            background: "#fffdf8",
            color: "#173f37",
            border: "2px solid #173f37",
            borderRadius: "999px",
            fontWeight: "800",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#173f37";
            e.currentTarget.style.color = "#fffdf8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fffdf8";
            e.currentTarget.style.color = "#173f37";
          }}
        >
          ⬇️ {copy.download}
        </button>
      </div>
    </div>
  );
}
