import type { Metadata } from 'next';
import { pageUrl, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '@/lib/seo';

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

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
