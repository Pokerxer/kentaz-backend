import type { Metadata } from 'next';
import Script from 'next/script';
import { pageUrl, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop — Fashion, Lifestyle & Beauty',
  description: `Browse ${SITE_NAME}'s full collection of premium fashion, lifestyle, beauty, and accessories. Fast delivery across Nigeria. Secure checkout.`,
  alternates: { canonical: pageUrl('/products') },
  openGraph: {
    title: `Shop | ${SITE_NAME}`,
    description: `Premium fashion, lifestyle & beauty products — shop the full ${SITE_NAME} collection.`,
    url: pageUrl('/products'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} Shop` }],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: pageUrl('/products') },
  ],
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-breadcrumb-shop"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
