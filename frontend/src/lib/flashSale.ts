import { useEffect, useState } from 'react';

/**
 * Flash Sale session engine (frontend).
 *
 * A "flash sale session" is a deterministic, time-boxed promotional window.
 * Sessions run daily from 00:00:00 to 23:59:59.999 (local time), so there is
 * always a live session while the store has qualifying deals on sale.
 *
 * A product qualifies as a flash deal when at least one of its variants has a
 * genuine markdown — `compareAtPrice` (was) strictly greater than `price`
 * (now). Discount math is derived from those two fields only; we never
 * fabricate a "was" price from costPrice or tags. Products tagged
 * sale/flash/promo without a compareAtPrice are deliberately excluded so the
 * section can never show a fake discount.
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

export function getFlashSaleSession(now: Date = new Date()): FlashSaleSession {
  const startTime = startOfSession(now);
  const endTime = endOfSession(now);
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

/**
 * Returns the best flash deal on a product, or null when the product has no
 * genuine markdown (compareAtPrice > price) on any variant.
 */
export function getFlashDeal(product: any): FlashDeal | null {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return null;

  let best: FlashDeal | null = null;
  for (const v of product.variants) {
    const price = Number(v?.price);
    const compareAt = Number(v?.compareAtPrice);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(compareAt) || compareAt <= price) continue;
    const discountPercent = Math.round(((compareAt - price) / compareAt) * 100);
    if (discountPercent < FLASH_SALE.minDiscountPercent) continue;
    const stock = Number.isFinite(Number(v?.stock)) ? Math.max(0, Number(v.stock)) : 0;
    const candidate: FlashDeal = {
      product,
      variant: {
        size: v.size,
        color: v.color,
        price,
        compareAtPrice: compareAt,
        stock,
      },
      price,
      compareAtPrice: compareAt,
      discountPercent,
      savings: compareAt - price,
      stock,
    };
    if (
      !best ||
      candidate.discountPercent > best.discountPercent ||
      (candidate.discountPercent === best.discountPercent && candidate.stock > best.stock)
    ) {
      best = candidate;
    }
  }

  // Tagged "sale" products without a compareAtPrice never reach here — the
  // loop above only admits variants with a genuine markdown, so a discount is
  // never fabricated from tags alone.
  return best;
}

/** All flash deals across a product list, best discount first. */
export function getFlashDeals(products: any[]): FlashDeal[] {
  const deals: FlashDeal[] = [];
  for (const product of products) {
    const deal = getFlashDeal(product);
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

/** Ticking countdown hook — returns zeroed parts once the target passes. */
export function useFlashCountdown(target: Date | null): CountdownParts | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const remaining = target.getTime() - now;
  return getCountdownParts(remaining);
}
