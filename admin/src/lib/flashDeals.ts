import type { Discount, Product } from './api';

// ── Flash-sale promotion helpers ────────────────────────────────
// A product is a "flash deal" when either:
//   1. An active Discount (created on the admin /discounts page) covers it —
//      the discount is applied to the product's variant price, or
//   2. At least one variant carries a genuine compareAtPrice markdown.
// Mirrors the storefront /flash-sale logic so admin sees what customers see.

export interface FlashMarkdown {
  price: number;
  compareAtPrice: number;
  discountPercent: number;
  stock: number;
}

export function getFlashMarkdown(p: Product): FlashMarkdown | null {
  let best: FlashMarkdown | null = null;
  for (const v of p.variants || []) {
    const price = Number(v.price);
    const compareAt = Number(v.compareAtPrice);
    if (!price || !compareAt || compareAt <= price) continue;
    const pct = Math.round(((compareAt - price) / compareAt) * 100);
    if (pct < 5) continue;
    if (!best || pct > best.discountPercent) {
      best = { price, compareAtPrice: compareAt, discountPercent: pct, stock: Number(v.stock) || 0 };
    }
  }
  return best;
}

/** Discount usable right now (active, in window, usage left). */
export function isDiscountUsable(d: Discount): boolean {
  if (!d.isActive) return false;
  const now = Date.now();
  if (d.startDate && now < new Date(d.startDate).getTime()) return false;
  if (d.endDate && now > new Date(d.endDate).getTime()) return false;
  if (d.usageLimit !== null && d.usageCount >= d.usageLimit) return false;
  return true;
}

/** Whether a usable discount covers the product. */
export function discountAppliesTo(d: Discount, p: Product): boolean {
  if (d.applicableTo === 'all') return true;
  if (d.applicableTo === 'categories') {
    const cats = (d.categories || []).map((c) => String(c).toLowerCase());
    return cats.includes(String(p.category || '').toLowerCase());
  }
  if (d.applicableTo === 'products') {
    const ids = new Set(((d.products as any[]) || []).map((x: any) => String(x._id || x)));
    return ids.has(String(p._id));
  }
  return false;
}

/** Sale price for a single item under a discount. */
export function discountPriceFor(d: Discount, price: number): number {
  if (d.type === 'percentage') {
    let off = (price * d.value) / 100;
    if (d.maxDiscount != null && d.maxDiscount > 0) off = Math.min(off, d.maxDiscount);
    return Math.max(0, Math.round(price - off));
  }
  return Math.max(0, price - d.value);
}

/** Best flash markdown across discount coverage and compareAtPrice. */
export function getFlashMarkdownWithDiscounts(p: Product, discounts: Discount[]): FlashMarkdown | null {
  const usable = discounts.filter((d) => discountAppliesTo(d, p));
  let best: FlashMarkdown | null = null;
  const consider = (m: FlashMarkdown) => {
    if (!best || m.discountPercent > best.discountPercent || (m.discountPercent === best.discountPercent && m.stock > best.stock)) {
      best = m;
    }
  };
  for (const v of p.variants || []) {
    const price = Number(v.price);
    if (!price) continue;
    for (const d of usable) {
      const salePrice = discountPriceFor(d, price);
      if (salePrice >= price) continue;
      const pct = Math.round(((price - salePrice) / price) * 100);
      if (pct < 5) continue;
      consider({ price: salePrice, compareAtPrice: price, discountPercent: pct, stock: Number(v.stock) || 0 });
    }
  }
  const markdown = getFlashMarkdown(p);
  if (markdown) consider(markdown);
  return best;
}
