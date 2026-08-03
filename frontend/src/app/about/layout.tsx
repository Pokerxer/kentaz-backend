import type { Metadata } from 'next';
import Script from 'next/script';
import { pageUrl, SITE_NAME, DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${SITE_NAME} — a premium fashion and lifestyle brand based in Abuja, Nigeria. Discover our story, mission, and the values that drive us to curate quality products and services.`,
  alternates: { canonical: pageUrl('/about') },
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description: `The story behind ${SITE_NAME} — premium fashion, lifestyle, and wellness from Abuja, Nigeria.`,
    url: pageUrl('/about'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `About ${SITE_NAME}` }],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'About', item: pageUrl('/about') },
  ],
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-breadcrumb-about"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
