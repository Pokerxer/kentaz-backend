import type { Metadata } from 'next';
import { pageUrl, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms governing your use of ${SITE_NAME}'s website and services — orders, payments, product descriptions, and limitation of liability.`,
  alternates: { canonical: pageUrl('/terms') },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Terms of Service | ${SITE_NAME}`,
    description: `Terms governing use of the ${SITE_NAME} website and services.`,
    url: pageUrl('/terms'),
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}