import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://book.balagpetclinic.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/order',
          '/review',
          '/track',
          '/privacy',
          '/terms',
          '/delivery-policy',
          '/refund-cancellation',
        ],
        disallow: [
          '/admin',
          '/api',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
