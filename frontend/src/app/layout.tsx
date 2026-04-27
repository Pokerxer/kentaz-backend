import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from '@/components/Providers';
import { CartProvider } from '@/contexts/CartContext';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, TWITTER_HANDLE, DEFAULT_OG_IMAGE } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE_NAME} — Premium Fashion & Lifestyle`,
    template: `%s | ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  keywords: [
    'fashion Nigeria', 'clothing Abuja', 'lifestyle products Nigeria',
    'online shopping Nigeria', 'accessories Abuja', 'beauty products Nigeria',
    'therapy sessions Abuja', 'podcast studio Abuja', 'Kentaz Emporium',
    'premium fashion Nigeria',
  ],

  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Premium Fashion & Lifestyle`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Premium Fashion & Lifestyle`,
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: `${SITE_NAME} — Premium Fashion & Lifestyle`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },

  alternates: {
    canonical: SITE_URL,
  },

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  manifest: '/manifest.json',

  verification: {
    // Add Google Search Console / Bing verification tokens here when available
    // google: 'your-verification-token',
  },
};

// ── Structured data ──────────────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
    width: 200,
    height: 60,
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Abuja',
    addressRegion: 'FCT',
    addressCountry: 'NG',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'info@kentazemporium.com',
    availableLanguage: 'English',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// ────────────────────────────────────────────────────────────────────────────

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <CartProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartSidebar />
          </CartProvider>
        </Providers>

        {/* Global structured data */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </body>
    </html>
  );
}
