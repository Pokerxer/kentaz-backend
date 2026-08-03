import type { Metadata } from 'next';
import Script from 'next/script';
import { pageUrl, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Flash Sale — Limited-Time Deals',
  description: `Shop today's ${SITE_NAME} flash sale. Limited-time markdowns on premium fashion, beauty, hair and lifestyle pieces. When the clock hits zero, the deals are gone.`,
  alternates: { canonical: pageUrl('/flash-sale') },
  openGraph: {
    title: `Flash Sale | ${SITE_NAME}`,
    description: `Limited-time deals on luxury fashion, beauty & lifestyle — shop before the clock runs out.`,
    url: pageUrl('/flash-sale'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} Flash Sale` }],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Flash Sale', item: pageUrl('/flash-sale') },
  ],
};

export default function FlashSaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-breadcrumb-flash-sale"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
