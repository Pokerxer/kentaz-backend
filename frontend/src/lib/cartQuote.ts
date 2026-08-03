'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The cart's prices come from the server, not from this browser.
 *
 * Product pages show a price to get the shopper interested; this hook asks the
 * backend what that cart actually costs — flash-sale markdowns, promo code,
 * shipping, tax and total. The cart page, the checkout summary and order
 * creation all run through the same pricing code, so the number on screen and
 * the number charged cannot drift apart.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export interface QuoteLine {
  product: string;
  name: string;
  slug: string;
  image: string | null;
  quantity: number;
  variant: { size?: string; color?: string; stock: number; sku?: string } | null;
  /** Price charged per unit, after any flash-sale markdown. */
  unitPrice: number;
  /** List price before the markdown; equal to unitPrice when not on sale. */
  originalUnitPrice: number;
  lineTotal: number;
  discountPercent: number;
  appliedDiscount: { _id: string | null; code: string | null; source: string } | null;
}

export interface CartQuote {
  items: QuoteLine[];
  subtotal: number;
  /** Saved through automatic markdowns on the lines. */
  itemDiscountTotal: number;
  discount: { _id: string; code: string; type: string; value: number; description: string; amount: number } | null;
  discountAmount: number;
  /** Why the entered code was refused, or null when it applied. */
  codeError: string | null;
  shipping: number;
  tax: number;
  total: number;
  deliveryMethod: string;
  /** Ids of cart items that no longer exist in the catalogue. */
  unavailable: string[];
}

export interface QuoteItemInput {
  product: string;
  variant?: { size?: string; color?: string };
  quantity: number;
}

export async function fetchCartQuote(
  items: QuoteItemInput[],
  code: string | null,
  deliveryMethod: 'standard' | 'express',
  signal?: AbortSignal
): Promise<CartQuote> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kentaz_token') : null;
  const res = await fetch(`${API}/api/store/discounts/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ items, code, deliveryMethod }),
    signal,
  });
  if (!res.ok) throw new Error('Could not price your cart');
  return res.json();
}

/** Map Redux cart items down to what the quote endpoint needs. */
export function toQuoteItems(items: any[]): QuoteItemInput[] {
  return items
    .map((i) => ({
      product: i.product?._id || i.product?.id || '',
      variant: i.variant ? { size: i.variant.size, color: i.variant.color } : undefined,
      quantity: i.quantity,
    }))
    .filter((i) => i.product);
}

/**
 * Live quote for the current cart. Re-fetches whenever the lines, the code or
 * the delivery method change, and keeps the previous quote on screen while the
 * next one loads so the summary never flashes empty.
 */
export function useCartQuote(
  items: any[],
  code: string | null,
  deliveryMethod: 'standard' | 'express' = 'standard'
) {
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const quoteItems = toQuoteItems(items);
  // Refetch on what actually changes the price, not on object identity.
  const key = JSON.stringify([quoteItems, code, deliveryMethod]);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const parsed: QuoteItemInput[] = JSON.parse(key)[0];
    if (parsed.length === 0) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchCartQuote(parsed, code, deliveryMethod, controller.signal);
      setQuote(next);
      setError(null);
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Could not price your cart');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    // `key` already encodes items, code and deliveryMethod.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  return { quote, loading, error, refresh };
}
