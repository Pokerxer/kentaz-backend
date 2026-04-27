import type { Metadata } from 'next';
import { pageUrl, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with ${SITE_NAME}. Reach our team in Abuja, Nigeria for product enquiries, order support, or service bookings. We reply within 24 hours.`,
  alternates: { canonical: pageUrl('/contact') },
  openGraph: {
    title: `Contact Us | ${SITE_NAME}`,
    description: `Reach the ${SITE_NAME} team for enquiries, support, or bookings.`,
    url: pageUrl('/contact'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `Contact ${SITE_NAME}` }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
