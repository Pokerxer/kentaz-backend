import type { Metadata } from 'next';
import Script from 'next/script';
import { pageUrl, SITE_NAME, DEFAULT_OG_IMAGE, SITE_URL, BUSINESS } from '@/lib/seo';

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

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Contact', item: pageUrl('/contact') },
  ],
};

const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: `Contact ${SITE_NAME}`,
  url: pageUrl('/contact'),
  publisher: { '@id': `${SITE_URL}/#organization` },
  mainEntity: {
    '@type': 'Organization',
    name: SITE_NAME,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      addressCountry: BUSINESS.addressCountry,
      postalCode: BUSINESS.postalCode,
    },
    sameAs: [BUSINESS.instagram],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-breadcrumb-contact"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="schema-contact-page"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />
      {children}
    </>
  );
}
