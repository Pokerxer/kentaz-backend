# SEO & Geo Implementation Notes

State of the Kentaz Emporium frontend SEO as of 2026-08-23. Central config lives
in `frontend/src/lib/seo.ts` — change business data there, not in pages.

## Implemented

### Technical
- **Canonicals**: every indexable page self-canonicals via `pageAlternates(path)` helper.
- **hreflang**: `en-NG` + `x-default` emitted sitewide through the same helper.
- **robots.txt** (`src/app/robots.ts`): allows `/`, disallows `/account/`, `/admin/`,
  `/api/`, `/login`, `/register`, `/forgot-password`, `/checkout`, `/cart`.
- **Sitemap** (`src/app/sitemap.ts`): static pages + product slugs fetched from the
  backend API, revalidated hourly.
- **Security headers** (`next.config.js`): HSTS, X-Content-Type-Options,
  X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy.

### Structured data (JSON-LD)
- Root layout (`src/app/layout.tsx`): Organization, Store (geo coords, opening hours,
  hasMap, areaServed Abuja/FCT/Nigeria, currenciesAccepted NGN), WebSite + SearchAction.
- Product detail (`products/[slug]/page.tsx`): Product schema with NGN price,
  availability, aggregateRating; BreadcrumbList incl. category level.
- Page-level breadcrumbs: about, contact, services, products, flash-sale layouts.
- Services page: Service schema (therapy + podcast) with NGN offers, FAQPage.

### Geo / local signals
- Meta tags in root layout via `GEO_META`: `geo.region` NG-FC, `geo.placename`
  Abuja, `geo.position`, `ICBM`.
- Store/Organization schemas carry coordinates, maps link, areaServed.

### Noindex policy (defense in depth with robots.txt)
- Layout-level noindex: `(auth)/layout.tsx`, `account/layout.tsx`,
  `admin/layout.tsx`, `services/booking/layout.tsx`,
  `(shop)/cart/layout.tsx`, `(shop)/checkout/layout.tsx`.
- Product 404s: `generateMetadata` returns noindex when fetch fails.

### Assets (generated, in `frontend/public/`)
- `og-image.png` 1200×630 (charcoal/gold brand card), `favicon.ico`,
  `favicon-16x16.png`, `favicon-32.png`, `apple-touch-icon.png`.
- Regenerate with PIL script pattern; source K-mark geometry mirrors `logo.svg`.
- `llms.txt` exists at `public/llms.txt` for AI answer engines.

## Manual follow-ups (cannot be done in code)
1. Verify the domain in Google Search Console and submit `sitemap.xml`.
2. Create/claim a Google Business Profile for the Usuma Street address.
3. Replace the generated OG image with a designed one if desired (same path/name).
4. Add real product ratings in the backend so `aggregateRating` populates.
5. Monitor Rich Results Test after deploy: https://search.google.com/test/rich-results
