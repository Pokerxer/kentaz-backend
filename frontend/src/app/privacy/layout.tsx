import type { Metadata } from 'next';
import { pageUrl, pageAlternates, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Read the ${SITE_NAME} Privacy Policy — how we collect, use, and protect your personal information when you shop, book therapy sessions, or rent our podcast studio in Abuja, Nigeria. In line with the Nigeria Data Protection Act 2023 (NDPA) and NDPR 2019.`,
  alternates: pageAlternates('/privacy'),
  robots: { index: true, follow: true },
  keywords: [
    `${SITE_NAME} privacy policy`,
    'privacy policy Nigeria',
    'NDPA 2023',
    'Nigeria Data Protection Act',
    'data privacy Abuja',
    'Kentaz Emporium data protection',
  ],
  openGraph: {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: `How ${SITE_NAME} collects, uses, and protects your personal information — your rights, data we collect, and third-party processors.`,
    url: pageUrl('/privacy'),
    type: 'website',
    siteName: SITE_NAME,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}