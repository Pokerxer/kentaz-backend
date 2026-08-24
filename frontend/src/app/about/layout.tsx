import type { Metadata } from 'next';
import Script from 'next/script';
import { pageUrl, pageAlternates, SITE_NAME, DEFAULT_OG_IMAGE, SITE_URL, BUSINESS } from '@/lib/seo';

const ABOUT_DESCRIPTION =
  'Discover premium fashion, luxury hair, skincare, and wellness services curated for the modern individual in Abuja, Nigeria. Elegant. Luxury. Classy. Refined.';

export const metadata: Metadata = {
  title: 'About Us',
  description: ABOUT_DESCRIPTION,
  alternates: pageAlternates('/about'),
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
    url: pageUrl('/about'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `About ${SITE_NAME}` }],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'About', item: pageUrl('/about') },
  ],
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  description: ABOUT_DESCRIPTION,
  slogan: 'Luxury. Lifestyle. Wellness.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Suite 35, 911 Mall, 70 Usuma Street, Off Gana Street',
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
  },
  telephone: '+2347081856411',
  email: BUSINESS.email,
  sameAs: ['https://instagram.com/kentaz.emporium'],
  openingHours: ['Mo-Sa 09:00-20:00', 'Su 12:00-18:00'],
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-breadcrumb-about"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="schema-organization-about"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {children}
    </>
  );
}
