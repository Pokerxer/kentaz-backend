export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://kentazemporium.com').replace(/\/$/, '');

export const SITE_NAME = 'Kentaz Emporium';

export const SITE_DESCRIPTION =
  'Premium fashion, lifestyle & wellness from Abuja, Nigeria. Shop curated clothing, accessories, beauty products, and book therapy or podcast sessions.';

export const TWITTER_HANDLE = '@kentazemporium';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// ── Business info (used for LocalBusiness / Organization schema) ─────────────
export const BUSINESS = {
  legalName: 'Kentaz Emporium',
  streetAddress: 'Suite 35, 911 Mall, Usuma Street',
  addressLocality: 'Abuja',
  addressRegion: 'FCT',
  addressCountry: 'NG',
  postalCode: '900211',
  phone: '+2347081856411',
  phoneDisplay: '07081856411',
  email: 'info@kentazemporium.com',
  whatsapp: '2347081856411',
  instagram: 'https://instagram.com/kentazemporium',
  instagramHandle: '@KENTAZ EMPORIUM',
  // Approximate geo coordinates for Usuma Street, Maitama, Abuja
  geo: { latitude: 9.0765, longitude: 7.4805 },
  openingHours: [
    { days: 'Mo-Sa', opens: '09:00', closes: '19:00' },
    { days: 'Su', opens: '12:00', closes: '18:00' },
  ],
  priceRange: '₦₦₦',
} as const;

/** Trim a string to `max` chars, appending an ellipsis if truncated. */
export function truncate(text: string | undefined | null, max = 160): string {
  if (!text) return '';
  const clean = text.replace(/<[^>]+>/g, '').trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1) + '\u2026';
}

/** Build a fully-qualified page URL. */
export function pageUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
