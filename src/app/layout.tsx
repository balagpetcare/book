import type { Metadata } from 'next';
import './globals.css';
import { MetaPixelProvider } from '@/components/meta-pixel-provider';
import { Footer } from '@/components/footer';
import { SITE_ORIGIN } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: 'বিড়াল পালন ও চিকিৎসা | Dr. Bala G',
  description:
    'বিড়ালের রোগ, কারণ, লক্ষণ, প্রতিরোধ, ব্যবস্থাপনা ও চিকিৎসা নিয়ে ৩२६ পৃষ্ঠার ব্যবহারিক বাংলা গাইড।',
  keywords:
    'বিড়াল পালন, বিড়ালের যত্ন, বিড়ালের রোগ, পশু স্বাস্থ্য, বাংলা গাইড',
  authors: [{ name: 'Dr. Bala G' }],
  creator: 'Dr. Bala G',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: SITE_ORIGIN,
    siteName: 'বিড়াল পালন ও চিকিৎসা',
    title: 'বিড়াল পালন ও চিকিৎসা | Dr. Bala G',
    description:
      'বিড়ালের রোগ, কারণ, লক্ষণ, প্রতিরোধ, ব্যবস্থাপনা ও চিকিৎসা নিয়ে ৩२६ পৃষ্ঠার ব্যবহারিক বাংলা গাইড।',
    images: [
      {
        url: `${SITE_ORIGIN}/book-cover-placeholder.svg`,
        width: 330,
        height: 500,
        alt: 'বিড়াল পালন ও চিকিৎসা বইয়ের প্রচ্ছদ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'বিড়াল পালন ও চিকিৎসা | Dr. Bala G',
    description:
      'বিড়ালের রোগ, কারণ, লক্ষণ, প্রতিরোধ, ব্যবস্থাপনা ও চিকিৎসা নিয়ে ৩२६ পৃষ্ঠার ব্যবহারিক বাংলা গাইড।',
    images: [`${SITE_ORIGIN}/book-cover-placeholder.svg`],
  },
  alternates: {
    canonical: SITE_ORIGIN,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body>
        <MetaPixelProvider />
        {children}
        <Footer />
      </body>
    </html>
  );
}
