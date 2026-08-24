import type { Metadata } from 'next';
import Script from 'next/script';
import { pageUrl, pageAlternates, SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, BUSINESS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Services — Therapy & Podcast Sessions',
  description: `Book professional therapy sessions and podcast studio time with ${SITE_NAME} in Abuja, Nigeria. Expert therapists, state-of-the-art podcast facilities, flexible scheduling.`,
  alternates: pageAlternates('/services'),
  openGraph: {
    title: `Services | ${SITE_NAME}`,
    description: 'Professional therapy and podcast studio sessions in Abuja, Nigeria.',
    url: pageUrl('/services'),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} Services` }],
  },
};

// ── Structured data ──────────────────────────────────────────────────────────
// Service + FAQ schema. The FAQ content mirrors the visible FAQ section on the
// services page so it is eligible for rich results and AI answer engines.

const therapyServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/services#therapy`,
  name: 'Mental Health Consultation',
  serviceType: 'Mental Health Therapy',
  description:
    'Professional, confidential therapy sessions with licensed therapists. Available in-person at our Abuja studio or via secure video call.',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: { '@type': 'Country', name: 'Nigeria' },
  offers: [
    {
      '@type': 'Offer',
      name: 'In-Person Therapy Session (60 min)',
      price: '25000',
      priceCurrency: 'NGN',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/services/booking?type=therapy`,
    },
    {
      '@type': 'Offer',
      name: 'Online Therapy Session (60 min)',
      price: '20000',
      priceCurrency: 'NGN',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/services/booking?type=therapy`,
    },
  ],
};

const podcastServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/services#studio`,
  name: 'Podcast Studio Rental',
  serviceType: 'Recording Studio',
  description:
    'State-of-the-art podcast recording studio in Abuja with professional microphones, acoustically treated soundproof room, multi-track recording, and post-production editing included.',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: { '@type': 'City', name: 'Abuja' },
  offers: {
    '@type': 'Offer',
    name: 'Podcast Studio (per hour, 2-hour minimum)',
    price: '15000',
    priceCurrency: 'NGN',
    availability: 'https://schema.org/InStock',
    url: `${SITE_URL}/services/booking?type=podcast`,
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is everything I share in therapy confidential?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, absolutely. All sessions are strictly confidential. The only exceptions are legally mandated situations where there is an imminent risk of harm to yourself or others — and your therapist will explain this clearly in your first session.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I know which therapist is right for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can browse therapist profiles and filter by specialisation, approach, and experience. You can also choose "Best Match" and we will pair you with the most suitable therapist based on your intake answers.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens in the first session?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The first session is mainly about getting to know each other. Your therapist will ask questions to understand your background and what brings you in. There is no pressure to share more than you are comfortable with.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I switch therapists if I am not comfortable?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Therapeutic fit is important. If after a session you feel the match is not right, you can easily switch to another therapist at no extra charge.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many sessions will I need?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'This varies greatly depending on your goals and what you are working through. Some people find 4–6 sessions helpful; others benefit from longer-term support. Your therapist will discuss this with you openly.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you offer couples or family therapy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We offer sessions for individuals, couples, and family groups. Please mention this when booking and select a session duration of 90 minutes for couples or family sessions.',
      },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Services', item: pageUrl('/services') },
  ],
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-service-therapy"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(therapyServiceSchema) }}
      />
      <Script
        id="schema-service-podcast"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastServiceSchema) }}
      />
      <Script
        id="schema-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="schema-breadcrumb-services"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
