import type { Metadata } from 'next';
import { pageUrl, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo';

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

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
