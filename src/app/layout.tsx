import type { Metadata } from "next";
import "./globals.css";
import { MetaPixelProvider } from "@/components/meta-pixel-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:2200"),
  title: "বিড়াল পালন ও চিকিৎসা | Dr. Bala G",
  description: "বিড়ালের রোগ, কারণ, লক্ষণ, প্রতিরোধ, ব্যবস্থাপনা ও চিকিৎসা নিয়ে ৩২৬ পৃষ্ঠার ব্যবহারিক বাংলা গাইড।",
  openGraph: { title: "বিড়াল পালন ও চিকিৎসা | Dr. Bala G", description: "বিড়ালের রোগ, কারণ, লক্ষণ, প্রতিরোধ, ব্যবস্থাপনা ও চিকিৎসা নিয়ে ৩২৬ পৃষ্ঠার ব্যবহারিক বাংলা গাইড।", images: ["/book-cover-placeholder.svg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="bn"><body><MetaPixelProvider />{children}</body></html>; }
