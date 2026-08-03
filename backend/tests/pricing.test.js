const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isDiscountUsable,
  discountAppliesToProduct,
  discountedUnitPrice,
  findVariant,
  resolveUnitPrice,
  getShippingCost,
  quoteCart,
} = require('../utils/pricing');

// ── Fixtures ────────────────────────────────────────────────────
// Synthetic products/discounts only — nothing here touches the database.
// The clock is frozen so the suite can't change colour with the calendar.

const NOW = new Date('2026-08-03T12:00:00.000Z');

function product(overrides = {}) {
  return {
    _id: 'p1',
    name: 'Silk Scarf',
    slug: 'silk-scarf',
    category: 'Accessories',
    images: [{ url: 'https://example.test/scarf.jpg' }],
    variants: [{ size: 'M', color: 'Red', price: 20000, stock: 5 }],
    ...overrides,
  };
}

function discount(overrides = {}) {
  return {
    _id: 'd1',
    code: 'SAVE20',
    type: 'percentage',
    value: 20,
    minOrderValue: 0,
    maxDiscount: null,
    applicableTo: 'all',
    categories: [],
    products: [],
    usageLimit: null,
    usageCount: 0,
    perCustomerLimit: null,
    isActive: true,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T23:59:59.999Z'),
    ...overrides,
  };
}

// ── isDiscountUsable ────────────────────────────────────────────

test('isDiscountUsable accepts a discount inside its window', () => {
  assert.equal(isDiscountUsable(discount(), NOW), true);
});

test('isDiscountUsable rejects inactive, unstarted, expired and exhausted discounts', () => {
  assert.equal(isDiscountUsable(discount({ isActive: false }), NOW), false);
  assert.equal(isDiscountUsable(discount({ startDate: new Date('2026-09-01') }), NOW), false);
  assert.equal(isDiscountUsable(discount({ endDate: new Date('2026-08-02') }), NOW), false);
  assert.equal(isDiscountUsable(discount({ usageLimit: 10, usageCount: 10 }), NOW), false);
});

test('isDiscountUsable treats a null usageLimit as unlimited', () => {
  assert.equal(isDiscountUsable(discount({ usageLimit: null, usageCount: 9999 }), NOW), true);
});

test('isDiscountUsable treats missing dates as an open window', () => {
  assert.equal(isDiscountUsable(discount({ startDate: null, endDate: null }), NOW), true);
});

// ── Scope matching ──────────────────────────────────────────────

test('discountAppliesToProduct matches category case-insensitively', () => {
  const d = discount({ applicableTo: 'categories', categories: ['accessories'] });
  assert.equal(discountAppliesToProduct(d, product()), true);
  assert.equal(discountAppliesToProduct(d, product({ category: 'Bags' })), false);
});

test('discountAppliesToProduct matches product scope by id, populated or not', () => {
  const byId = discount({ applicableTo: 'products', products: ['p1'] });
  const byDoc = discount({ applicableTo: 'products', products: [{ _id: 'p1', name: 'Silk Scarf' }] });
  assert.equal(discountAppliesToProduct(byId, product()), true);
  assert.equal(discountAppliesToProduct(byDoc, product()), true);
  assert.equal(discountAppliesToProduct(byId, product({ _id: 'p2' })), false);
});

test('an empty scope list matches nothing rather than everything', () => {
  assert.equal(discountAppliesToProduct(discount({ applicableTo: 'products', products: [] }), product()), false);
  assert.equal(discountAppliesToProduct(discount({ applicableTo: 'categories', categories: [] }), product()), false);
});

// ── Per-unit discount math ──────────────────────────────────────

test('percentage discount comes off the unit price', () => {
  assert.equal(discountedUnitPrice(discount({ value: 25 }), 20000), 15000);
});

test('maxDiscount caps a percentage discount per unit', () => {
  // 25% of 20,000 is 5,000, but the cap allows only 3,000.
  assert.equal(discountedUnitPrice(discount({ value: 25, maxDiscount: 3000 }), 20000), 17000);
});

test('fixed discount subtracts its value and never drives a price negative', () => {
  assert.equal(discountedUnitPrice(discount({ type: 'fixed', value: 5000 }), 20000), 15000);
  assert.equal(discountedUnitPrice(discount({ type: 'fixed', value: 999999 }), 20000), 0);
});

// ── Variant resolution ──────────────────────────────────────────

test('findVariant picks the matching size/colour, not just the first', () => {
  const p = product({
    variants: [
      { size: 'S', color: 'Red', price: 10000 },
      { size: 'L', color: 'Blue', price: 30000 },
    ],
  });
  assert.equal(findVariant(p, { size: 'L', color: 'Blue' }).price, 30000);
});

test('findVariant falls back to the first variant when nothing matches', () => {
  const p = product({ variants: [{ size: 'S', price: 10000 }, { size: 'L', price: 30000 }] });
  assert.equal(findVariant(p, { size: 'XXL' }).price, 10000);
});

// ── resolveUnitPrice: the flash-sale markdown ───────────────────

test('a product with no promotion resolves to its list price', () => {
  const r = resolveUnitPrice(product(), { size: 'M', color: 'Red' }, [], NOW);
  assert.equal(r.unitPrice, 20000);
  assert.equal(r.compareAtPrice, null);
  assert.equal(r.discount, null);
});

test('an applicable discount marks the unit price down', () => {
  const r = resolveUnitPrice(product(), { size: 'M', color: 'Red' }, [discount()], NOW);
  assert.equal(r.unitPrice, 16000);
  assert.equal(r.compareAtPrice, 20000);
  assert.equal(r.discountPercent, 20);
  assert.equal(r.discount.code, 'SAVE20');
});

test('the deepest of several applicable discounts wins', () => {
  const shallow = discount({ _id: 'd1', code: 'TEN', value: 10 });
  const deep = discount({ _id: 'd2', code: 'THIRTY', value: 30 });
  const r = resolveUnitPrice(product(), null, [shallow, deep], NOW);
  assert.equal(r.unitPrice, 14000);
  assert.equal(r.discount.code, 'THIRTY');
});

test('markdowns below the minimum percent are ignored', () => {
  // 2% is under MIN_MARKDOWN_PERCENT, so it is not a promotion.
  const r = resolveUnitPrice(product(), null, [discount({ value: 2 })], NOW);
  assert.equal(r.unitPrice, 20000);
  assert.equal(r.discount, null);
});

test('an expired discount does not mark anything down', () => {
  const r = resolveUnitPrice(product(), null, [discount({ endDate: new Date('2026-08-02') })], NOW);
  assert.equal(r.unitPrice, 20000);
  assert.equal(r.discount, null);
});

test('compareAtPrice on the variant is honoured as a markdown', () => {
  const p = product({ variants: [{ size: 'M', color: 'Red', price: 15000, compareAtPrice: 20000, stock: 3 }] });
  const r = resolveUnitPrice(p, null, [], NOW);
  assert.equal(r.unitPrice, 15000);
  assert.equal(r.compareAtPrice, 20000);
  assert.equal(r.discountPercent, 25);
  assert.equal(r.discount.source, 'compareAtPrice');
});

test('a compareAtPrice below the price is never treated as a discount', () => {
  const p = product({ variants: [{ size: 'M', price: 20000, compareAtPrice: 15000 }] });
  const r = resolveUnitPrice(p, null, [], NOW);
  assert.equal(r.unitPrice, 20000);
  assert.equal(r.discount, null);
});

// ── Shipping ────────────────────────────────────────────────────

test('shipping is free at the threshold and charged below it', () => {
  assert.equal(getShippingCost('standard', 49999), 2500);
  assert.equal(getShippingCost('standard', 50000), 0);
  assert.equal(getShippingCost('express', 999999), 5000);
});

// ── quoteCart: the whole order ──────────────────────────────────

test('quoteCart prices a plain cart with tax and shipping', () => {
  const q = quoteCart({
    lines: [{ product: product(), variant: { size: 'M', color: 'Red' }, quantity: 2 }],
    discounts: [],
    now: NOW,
  });
  assert.equal(q.subtotal, 40000);
  assert.equal(q.itemDiscountTotal, 0);
  assert.equal(q.shipping, 2500); // 40,000 is below the free-shipping threshold
  assert.equal(q.tax, 3000); // 7.5% of 40,000
  assert.equal(q.total, 45500);
});

test('quoteCart charges the flash-sale price the storefront advertises', () => {
  const q = quoteCart({
    lines: [{ product: product(), variant: { size: 'M', color: 'Red' }, quantity: 2 }],
    discounts: [discount()],
    now: NOW,
  });
  assert.equal(q.items[0].unitPrice, 16000);
  assert.equal(q.items[0].originalUnitPrice, 20000);
  assert.equal(q.subtotal, 32000);
  assert.equal(q.itemDiscountTotal, 8000);
});

test('quoteCart prices each line from its own variant', () => {
  const p = product({
    variants: [
      { size: 'S', color: 'Red', price: 10000, stock: 2 },
      { size: 'L', color: 'Blue', price: 30000, stock: 2 },
    ],
  });
  const q = quoteCart({
    lines: [
      { product: p, variant: { size: 'S', color: 'Red' }, quantity: 1 },
      { product: p, variant: { size: 'L', color: 'Blue' }, quantity: 1 },
    ],
    now: NOW,
  });
  assert.equal(q.items[0].unitPrice, 10000);
  assert.equal(q.items[1].unitPrice, 30000);
  assert.equal(q.subtotal, 40000);
});

test('a code cannot be redeemed when it already marked the items down', () => {
  const d = discount({ _id: 'dx', code: 'FLASH30', value: 30 });
  const q = quoteCart({
    lines: [{ product: product(), quantity: 1 }],
    discounts: [d],
    code: 'FLASH30',
    now: NOW,
  });
  assert.equal(q.items[0].unitPrice, 14000); // markdown applied once
  assert.equal(q.discountAmount, 0); // and not a second time
  assert.equal(q.codeError, 'This promotion is already applied to items in your cart');
});

test('a code too shallow to auto-apply still discounts the order', () => {
  // 3,000 off 100,000 is 3% — below the 5% markdown floor, so tier 1 skips it
  // and it remains available as an order-level code.
  const codeOnly = discount({
    _id: 'd9',
    code: 'ORDER10',
    type: 'fixed',
    value: 3000,
    applicableTo: 'categories',
    categories: ['Accessories'],
  });
  const expensive = product({ variants: [{ size: 'M', color: 'Red', price: 100000, stock: 5 }] });
  const q = quoteCart({
    lines: [{ product: expensive, quantity: 1 }],
    discounts: [codeOnly],
    code: 'order10', // case-insensitive
    now: NOW,
  });
  assert.equal(q.items[0].unitPrice, 100000);
  assert.equal(q.codeError, null);
  assert.equal(q.discountAmount, 3000);
  assert.equal(q.subtotal, 100000);
  assert.equal(q.shipping, 0); // 97,000 clears the free-shipping threshold
  assert.equal(q.tax, 7275); // 7.5% of 97,000
  assert.equal(q.total, 104275);
});

test('a scoped code discounts only the items it covers', () => {
  const scarf = product({ _id: 'p1', category: 'Accessories', variants: [{ price: 100000, stock: 5 }] });
  const bag = product({ _id: 'p2', category: 'Bags', variants: [{ price: 100000, stock: 5 }] });
  const code = discount({
    _id: 'd9',
    code: 'ACC10',
    type: 'percentage',
    value: 4, // below the markdown floor, so it stays an order-level code
    applicableTo: 'categories',
    categories: ['Accessories'],
  });
  const q = quoteCart({
    lines: [
      { product: scarf, quantity: 1 },
      { product: bag, quantity: 1 },
    ],
    discounts: [code],
    code: 'ACC10',
    now: NOW,
  });
  assert.equal(q.subtotal, 200000);
  // 4% of the eligible 100,000 only — not of the full 200,000 cart.
  assert.equal(q.discountAmount, 4000);
});

test('maxDiscount caps an order-level code', () => {
  const p = product({ variants: [{ price: 500000, stock: 5 }] });
  const code = discount({ _id: 'd9', code: 'BIG', value: 4, maxDiscount: 10000 });
  const q = quoteCart({ lines: [{ product: p, quantity: 1 }], discounts: [code], code: 'BIG', now: NOW });
  // 4% of 500,000 is 20,000, capped to 10,000.
  assert.equal(q.discountAmount, 10000);
});

test('a code below its minimum order value is rejected', () => {
  const code = discount({ _id: 'd9', code: 'BIGSPEND', value: 4, minOrderValue: 100000 });
  const q = quoteCart({ lines: [{ product: product(), quantity: 1 }], discounts: [code], code: 'BIGSPEND', now: NOW });
  assert.match(q.codeError, /Minimum order value/);
  assert.equal(q.discountAmount, 0);
});

test('a code past its per-customer limit is rejected', () => {
  const code = discount({ _id: 'd9', code: 'ONCE', value: 4, perCustomerLimit: 1 });
  const q = quoteCart({
    lines: [{ product: product(), quantity: 1 }],
    discounts: [code],
    code: 'ONCE',
    customerUses: 1,
    now: NOW,
  });
  assert.match(q.codeError, /maximum number of times/);
  assert.equal(q.discountAmount, 0);
});

test('an unknown code is rejected without affecting the total', () => {
  const q = quoteCart({ lines: [{ product: product(), quantity: 1 }], discounts: [], code: 'NOPE', now: NOW });
  assert.equal(q.codeError, 'Invalid discount code');
  assert.equal(q.discountAmount, 0);
  assert.equal(q.total, 20000 + 2500 + 1500);
});

test('quantities are floored to whole positive units', () => {
  const q = quoteCart({ lines: [{ product: product(), quantity: -5 }], now: NOW });
  assert.equal(q.items[0].quantity, 1);
  assert.equal(q.subtotal, 20000);
});

test('an empty cart quotes zero, not a bare delivery fee', () => {
  const q = quoteCart({ lines: [], now: NOW });
  assert.equal(q.subtotal, 0);
  assert.equal(q.shipping, 0);
  assert.equal(q.tax, 0);
  assert.equal(q.total, 0);
});

test('a discount can never drive the order total negative', () => {
  const code = discount({ _id: 'd9', code: 'HUGE', type: 'fixed', value: 999999 });
  const p = product({ variants: [{ price: 100000, stock: 1 }] });
  const q = quoteCart({ lines: [{ product: p, quantity: 1 }], discounts: [code], code: 'HUGE', now: NOW });
  assert.ok(q.total >= 0);
  assert.ok(q.discountAmount <= q.subtotal);
});
