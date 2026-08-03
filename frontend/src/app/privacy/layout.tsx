import type { Metadata } from 'next';
import { pageUrl, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Read the ${SITE_NAME} Privacy Policy — how we collect, use, and protect your personal information when you shop or book services with us.`,
  alternates: { canonical: pageUrl('/privacy') },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: `How ${SITE_NAME} collects, uses, and protects your personal information.`,
    url: pageUrl('/privacy'),
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}