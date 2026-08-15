import type { MetadataRoute } from 'next';

const siteUrl = 'https://scijournal.alperyz.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/profile'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}