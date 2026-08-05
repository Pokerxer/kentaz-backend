import { useEffect, useState } from 'react';

/**
 * Flash Sale session engine (frontend).
 *
 * A product qualifies as a flash deal when EITHER:
 *   1. An active admin Discount (created on the admin /discounts page) covers
 *      it — the discount is applied to the product's variant price, or
 *   2. At least one variant carries a genuine markdown — `compareAtPrice`
 *      (was) strictly greater than `price` (now).
 *
 * Discount math is derived from real fields only (discount value vs variant
 * price, or compareAtPrice vs price); we never fabricate a "was" price from
 * costPrice or tags, so the section can never show a fake discount.
 *
 * A "flash sale session" is the promotional window during which deals are
 * live. When active discounts carry end dates, the session ends at the
 * earliest one; otherwise it falls back to a deterministic daily window
 * (00:00 → 23:59:59.999 local).
 */

export type FlashSaleStatus = 'live' | 'ended';

export interface FlashSaleSession {
  /** e.g. "2026-08-03" — stable id per session */
  id: string;
  /** e.g. "Monday Flash Sale" */
  label: string;
  title: string;
  tagline: string;
  startTime: Date;
  endTime: Date;
  status: FlashSaleStatus;
}

export interface FlashDeal {
  product: any;
  variant: {
    size?: string;
    color?: string;
    price: number;
    compareAtPrice: number;
    stock: number;
  };
  price: number;
  compareAtPrice: number;
  discountPercent: number;
  savings: number;
  stock: number;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** A Discount record as returned by the public store endpoint. */
export interface FlashDiscount {
  _id: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number | null;
  applicableTo: 'all' | 'categories' | 'products';
  categories?: string[];
  products?: { _id: string; name?: string; slug?: string; images?: { url?: string }[]; category?: string }[];
  startDate?: string | null;
  endDate?: string | null;
}

export const FLASH_SALE = {
  title: 'Flash Sale',
  tagline: 'Limited-time markdowns on luxury pieces. When the clock hits zero, the deals are gone.',
  maxHomepageItems: 8,
  /** Variants with a markdown smaller than this are not considered flash deals. */
  minDiscountPercent: 5,
} as const;

const pad = (n: number): string => n.toString().padStart(2, '0');

/** Start of the session containing `date` (local midnight). */
export function startOfSession(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** End of the session containing `date` (23:59:59.999 local). */
export function endOfSession(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Session window for the flash sale. When active discounts carry end dates
 * the session ends at the earliest one; otherwise it falls back to a
 * deterministic daily window (local midnight → 23:59:59.999).
 */
export function getFlashSaleSession(now: Date = new Date(), discounts: FlashDiscount[] = []): FlashSaleSession {
  const startTime = startOfSession(now);
  const liveEnds = discounts
    .map((d) => (d.endDate ? new Date(d.endDate).getTime() : null))
    .filter((t): t is number => t !== null && t > now.getTime());
  const endTime = liveEnds.length > 0 ? new Date(Math.min(...liveEnds)) : endOfSession(now);
  const weekday = WEEKDAYS[now.getDay()];
  return {
    id: startTime.toISOString().slice(0, 10),
    label: `${weekday} Flash Sale`,
    title: `${weekday} Flash Sale`,
    tagline: FLASH_SALE.tagline,
    startTime,
    endTime,
    status: now.getTime() <= endTime.getTime() ? 'live' : 'ended',
  };
}

/** The session that starts right after the current one (for upcoming/empty states). */
export function getNextFlashSaleSession(now: Date = new Date()): FlashSaleSession {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const endTime = endOfSession(next);
  const weekday = WEEKDAYS[next.getDay()];
  return {
    id: startOfSession(next).toISOString().slice(0, 10),
    label: `${weekday} Flash Sale`,
    title: `${weekday} Flash Sale`,
    tagline: FLASH_SALE.tagline,
    startTime: next,
    endTime,
    status: 'ended',
  };
}

/** Whether an active admin discount covers the given product. */
export function discountAppliesTo(d: FlashDiscount, product: any): boolean {
  if (!product) return false;
  if (d.applicableTo === 'all') return true;
  if (d.applicableTo === 'categories') {
    const cats = (d.categories || []).map((c) => String(c).toLowerCase());
    return cats.includes(String(product.category || '').toLowerCase());
  }
  if (d.applicableTo === 'products') {
    const ids = new Set((d.products || []).map((p) => String(p._id)));
    return ids.has(String(product._id)) || ids.has(String(product.id));
  }
  return false;
}

/** Discounted sale price for a single item price under an admin discount. */
export function discountPriceFor(d: FlashDiscount, price: number): number {
  if (d.type === 'percentage') {
    let off = (price * d.value) / 100;
    if (d.maxDiscount != null && d.maxDiscount > 0) off = Math.min(off, d.maxDiscount);
    return Math.max(0, Math.round(price - off));
  }
  return Math.max(0, price - d.value);
}

/** Fetch active discounts from the public store endpoint (best-effort). */
export async function getActiveDiscounts(): Promise<FlashDiscount[]> {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
  try {
    const res = await fetch(`${API}/api/store/discounts`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : Array.isArray(data.discounts) ? data.discounts : [];
  } catch {
    return [];
  }
}

/**
 * Returns the best flash deal on a product, or null when no genuine promotion
 * applies. Two sources, best deal wins:
 *   1. An active admin discount covering the product (applied to variant price)
 *   2. A compareAtPrice markdown (compareAtPrice > price) on any variant
 */
export function getFlashDeal(product: any, discounts: FlashDiscount[] = []): FlashDeal | null {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return null;

  const applicable = discounts.filter((d) => discountAppliesTo(d, product));
  let best: FlashDeal | null = null;

  const consider = (candidate: FlashDeal) => {
    if (
      !best ||
      candidate.discountPercent > best.discountPercent ||
      (candidate.discountPercent === best.discountPercent && candidate.stock > best.stock)
    ) {
      best = candidate;
    }
  };

  for (const v of product.variants) {
    const price = Number(v?.price);
    if (!Number.isFinite(price) || price <= 0) continue;

    // Source 1: applicable admin discounts (sale price = discounted price)
    for (const d of applicable) {
      const salePrice = discountPriceFor(d, price);
      if (salePrice >= price) continue;
      const discountPercent = Math.round(((price - salePrice) / price) * 100);
      if (discountPercent < FLASH_SALE.minDiscountPercent) continue;
      const stock = Number.isFinite(Number(v?.stock)) ? Math.max(0, Number(v.stock)) : 0;
      consider({
        product,
        variant: { size: v.size, color: v.color, price: salePrice, compareAtPrice: price, stock },
        price: salePrice,
        compareAtPrice: price,
        discountPercent,
        savings: price - salePrice,
        stock,
      });
    }

    // Source 2: compareAtPrice markdown (was > now)
    const compareAt = Number(v?.compareAtPrice);
    if (Number.isFinite(compareAt) && compareAt > price) {
      const discountPercent = Math.round(((compareAt - price) / compareAt) * 100);
      if (discountPercent >= FLASH_SALE.minDiscountPercent) {
        const stock = Number.isFinite(Number(v?.stock)) ? Math.max(0, Number(v.stock)) : 0;
        consider({
          product,
          variant: { size: v.size, color: v.color, price, compareAtPrice: compareAt, stock },
          price,
          compareAtPrice: compareAt,
          discountPercent,
          savings: compareAt - price,
          stock,
        });
      }
    }
  }

  return best;
}

/**
 * Best deal for ONE specific variant (product detail / quick view pricing).
 * Mirrors the backend's resolveUnitPrice: applicable admin discounts compete
 * with the variant's own compareAtPrice markdown and the deepest genuine
 * markdown (>= FLASH_SALE.minDiscountPercent) wins. Returns null when the
 * variant is not genuinely discounted.
 */
export function getVariantDeal(product: any, variant: any, discounts: FlashDiscount[] = []): FlashDeal | null {
  const price = Number(variant?.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const stock = Number.isFinite(Number(variant?.stock)) ? Math.max(0, Number(variant.stock)) : 0;

  let best: FlashDeal | null = null;
  const consider = (candidate: FlashDeal) => {
    if (!best || candidate.discountPercent > best.discountPercent) best = candidate;
  };

  // Source 1: applicable admin discounts (sale price = discounted price)
  for (const d of discounts) {
    if (!discountAppliesTo(d, product)) continue;
    const salePrice = discountPriceFor(d, price);
    if (salePrice >= price) continue;
    const discountPercent = Math.round(((price - salePrice) / price) * 100);
    if (discountPercent < FLASH_SALE.minDiscountPercent) continue;
    consider({
      product,
      variant: { size: variant.size, color: variant.color, price: salePrice, compareAtPrice: price, stock },
      price: salePrice,
      compareAtPrice: price,
      discountPercent,
      savings: price - salePrice,
      stock,
    });
  }

  // Source 2: a compareAtPrice markdown already baked into the variant
  const compareAt = Number(variant?.compareAtPrice);
  if (Number.isFinite(compareAt) && compareAt > price) {
    const discountPercent = Math.round(((compareAt - price) / compareAt) * 100);
    if (discountPercent >= FLASH_SALE.minDiscountPercent) {
      consider({
        product,
        variant: { size: variant.size, color: variant.color, price, compareAtPrice: compareAt, stock },
        price,
        compareAtPrice: compareAt,
        discountPercent,
        savings: compareAt - price,
        stock,
      });
    }
  }

  return best;
}

/** All flash deals across a product list, best discount first. */
export function getFlashDeals(products: any[], discounts: FlashDiscount[] = []): FlashDeal[] {
  const deals: FlashDeal[] = [];
  for (const product of products) {
    const deal = getFlashDeal(product, discounts);
    if (deal) deals.push(deal);
  }
  return deals.sort((a, b) => b.discountPercent - a.discountPercent || b.savings - a.savings);
}

/**
 * Deals ranked for display: products with real imagery first (so the grid
 * never leads with placeholder thumbnails), then by discount depth.
 */
export function sortDealsForDisplay(deals: FlashDeal[]): FlashDeal[] {
  const hasImage = (d: FlashDeal) =>
    Boolean(d.product.thumbnail || (Array.isArray(d.product.images) && d.product.images.length > 0));
  return [...deals].sort(
    (a, b) => Number(hasImage(b)) - Number(hasImage(a)) || b.discountPercent - a.discountPercent || b.savings - a.savings
  );
}

export function getCountdownParts(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function formatCountdown(parts: CountdownParts | null): string {
  if (!parts) return '--:--:--';
  const h = parts.days > 0 ? parts.days * 24 + parts.hours : parts.hours;
  return `${pad(h)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

/** Ticking countdown hook — returns zeroed parts once the target passes.
 *
 *  Starts with `null` to avoid a hydration mismatch: `Date.now()` differs
 *  between server and client, so the first render only happens after the
 *  client-side effect fires.  Callers already show a `"--"` fallback when
 *  the return value is `null`. */
export function useFlashCountdown(target: Date | null): CountdownParts | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || now === null) return null;
  const remaining = target.getTime() - now;
  return getCountdownParts(remaining);
}
