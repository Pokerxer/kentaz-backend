import type { Metadata } from 'next';
import { pageUrl, pageAlternates, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Read the ${SITE_NAME} Terms of Service — the agreement governing orders, payments, delivery, refunds, service bookings (therapy & podcast studio), and responsible use of our Abuja, Nigeria website.`,
  alternates: pageAlternates('/terms'),
  robots: { index: true, follow: true },
  keywords: [
    `${SITE_NAME} terms of service`,
    'terms and conditions Nigeria',
    'e-commerce terms Abuja',
    'FCCPC consumer protection',
    'Kentaz Emporium terms',
  ],
  openGraph: {
    title: `Terms of Service | ${SITE_NAME}`,
    description: `The agreement between you and ${SITE_NAME} for shopping and booking services — orders, payments, delivery, refunds, and responsible use.`,
    url: pageUrl('/terms'),
    type: 'website',
    siteName: SITE_NAME,
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}