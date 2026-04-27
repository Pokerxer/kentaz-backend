import type { Metadata } from 'next';
import Script from 'next/script';
import { SITE_URL, SITE_NAME, truncate, pageUrl } from '@/lib/seo';
import ProductDetailClient from './ProductDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/store/products/${slug}`, {
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Dynamic metadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    };
  }

  const title = product.name;
  const description = truncate(product.description, 155) ||
    `Shop ${product.name} at ${SITE_NAME}. Premium quality, fast delivery across Nigeria.`;
  const canonical = pageUrl(`/products/${slug}`);
  const image = product.images?.[0]?.url || product.thumbnail;
  const price = product.variants?.[0]?.price;
  const currency = 'NGN';

  return {
    title,
    description,

    alternates: { canonical },

    openGraph: {
      type: 'website',
      url: canonical,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: image
        ? [{ url: image, width: 800, height: 800, alt: title }]
        : undefined,
      siteName: SITE_NAME,
      locale: 'en_NG',
    },

    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },

    ...(price && {
      other: {
        'product:price:amount': String(price),
        'product:price:currency': currency,
      },
    }),
  };
}

// ── Structured data builders ──────────────────────────────────────────────────

function buildProductSchema(product: any, slug: string) {
  const image = product.images?.[0]?.url || product.thumbnail;
  const price = product.variants?.[0]?.price;
  const inStock = (product.variants || []).some((v: any) => (v.stock ?? 0) > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': pageUrl(`/products/${slug}`),
    name: product.name,
    description: product.description,
    image: image ? [image] : undefined,
    sku: product.variants?.[0]?.sku,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: pageUrl(`/products/${slug}`),
      priceCurrency: 'NGN',
      price: price ?? undefined,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    ...(product.ratings?.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.ratings.avg,
        reviewCount: product.ratings.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

function buildBreadcrumbSchema(product: any, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: pageUrl('/products'),
      },
      ...(product.category
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: product.category,
              item: pageUrl(`/products?category=${encodeURIComponent(product.category)}`),
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: product.name,
              item: pageUrl(`/products/${slug}`),
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 3,
              name: product.name,
              item: pageUrl(`/products/${slug}`),
            },
          ]),
    ],
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  // Fetch product server-side so we can inject JSON-LD synchronously.
  // The client component will also fetch it (for interactivity); Next.js
  // deduplicates identical fetches within the same request.
  const { slug } = await params;
  const product = await fetchProduct(slug);

  return (
    <>
      {product && (
        <>
          <Script
            id="schema-product"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(buildProductSchema(product, slug)),
            }}
          />
          <Script
            id="schema-breadcrumb"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(buildBreadcrumbSchema(product, slug)),
            }}
          />
        </>
      )}
      <ProductDetailClient />
    </>
  );
}
