import type { Metadata } from 'next';
import { pageUrl, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Services — Therapy & Podcast Sessions',
  description: `Book professional therapy sessions and podcast studio time with ${SITE_NAME} in Abuja, Nigeria. Expert therapists, state-of-the-art podcast facilities, flexible scheduling.`,
  alternates: { canonical: pageUrl('/services') },
  openGraph: {
    title: `Services | ${SITE_NAME}`,
    description: 'Professional therapy and podcast studio sessions in Abuja, Nigeria.',
    url: pageUrl('/services'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} Services` }],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
