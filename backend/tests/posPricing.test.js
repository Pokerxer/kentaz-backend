const test = require('node:test');
const assert = require('node:assert/strict');

const { priceLine, quoteSale } = require('../utils/posPricing');
const { priceVariant, resolveUnitPrice, TAX_RATE } = require('../utils/pricing');

// ── Fixtures ────────────────────────────────────────────────────
// Synthetic products/discounts only — nothing here touches the database.
// The clock is frozen so the suite can't change colour with the calendar.

const NOW = new Date('2026-08-03T12:00:00.000Z');

function product(overrides = {}) {
  return {
    _id: 'p1',
    name: 'Silk Blazer',
    category: 'Female Fashion',
    variants: [
      { size: 'M', color: 'Black', price: 18000, stock: 4, costPrice: 9000 },
      { size: 'L', color: 'Black', price: 20000, stock: 2, costPrice: 10000 },
    ],
    ...overrides,
  };
}

function discount(overrides = {}) {
  return {
    _id: 'd1',
    code: 'FLASH25',
    type: 'percentage',
    value: 25,
    minOrderValue: 0,
    maxDiscount: null,
    applicableTo: 'all',
    categories: [],
    products: [],
    productPrices: [],
    usageLimit: null,
    usageCount: 0,
    perCustomerLimit: null,
    isActive: true,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T23:59:59.999Z'),
    ...overrides,
  };
}

/** The storefront example: ₦18,000 hand-priced down to ₦12,500. */
function handPriced() {
  return discount({
    applicableTo: 'products',
    products: ['p1'],
    productPrices: [{ product: 'p1', price: 12500 }],
  });
}

const line = (overrides = {}) => ({ product: product(), variantIndex: 0, quantity: 1, ...overrides });

// ── priceVariant / resolveUnitPrice parity ──────────────────────
// priceVariant was extracted from resolveUnitPrice so the POS can address a
// variant by index. If the two ever disagree, the till and the shop disagree.

test('priceVariant matches resolveUnitPrice for the variant it would have found', () => {
  const p = product();
  const ds = [discount()];
  for (const v of p.variants) {
    assert.deepEqual(
      priceVariant(p, v, ds, NOW),
      resolveUnitPrice(p, { size: v.size, color: v.color }, ds, NOW)
    );
  }
});

test('priceVariant prices the variant given, not the first one sharing its size/color', () => {
  // Two rows, same size and color, different prices — findVariant() can only
  // ever return the first, which is exactly why the POS needs the index.
  const p = product({
    variants: [
      { size: 'M', color: 'Black', price: 18000, stock: 1 },
      { size: 'M', color: 'Black', price: 30000, stock: 1 },
    ],
  });
  assert.equal(priceVariant(p, p.variants[1], [], NOW).listPrice, 30000);
  assert.equal(resolveUnitPrice(p, { size: 'M', color: 'Black' }, [], NOW).listPrice, 18000);
});

// ── Automatic markdowns reach the till ──────────────────────────

test('a hand-set product price is what the till charges, per unit', () => {
  const { item, error } = priceLine({ ...line({ quantity: 3 }), discounts: [handPriced()], now: NOW });
  assert.equal(error, null);
  assert.equal(item.price, 12500);
  assert.equal(item.listPrice, 18000);
  assert.equal(item.total, 37500); // charged per unit, not once per sale
  assert.equal(item.appliedDiscountCode, 'FLASH25');
  assert.equal(item.discountPercent, 31);
});

test('a percentage discount marks the line down', () => {
  const { item } = priceLine({ ...line(), discounts: [discount()], now: NOW });
  assert.equal(item.price, 13500); // 25% off 18,000
  assert.equal(item.listPrice, 18000);
});

test('the deepest of several applicable discounts wins', () => {
  const shallow = discount({ _id: 'd2', code: 'SAVE10', value: 10 });
  const { item } = priceLine({ ...line(), discounts: [shallow, discount()], now: NOW });
  assert.equal(item.price, 13500);
  assert.equal(item.appliedDiscountCode, 'FLASH25');
});

test('an expired or inactive discount does not mark anything down', () => {
  const expired = discount({ endDate: new Date('2026-08-02T00:00:00.000Z') });
  const inactive = discount({ _id: 'd3', code: 'OFF', isActive: false });
  const { item } = priceLine({ ...line(), discounts: [expired, inactive], now: NOW });
  assert.equal(item.price, 18000);
  assert.equal(item.discountPercent, 0);
  assert.equal(item.appliedDiscount, null);
});

test('a product no discount covers rings up at list price', () => {
  const scoped = discount({ applicableTo: 'products', products: ['other-product'] });
  const { item } = priceLine({ ...line(), discounts: [scoped], now: NOW });
  assert.equal(item.price, 18000);
});

test('a compareAtPrice markdown needs no Discount record to ring up', () => {
  const p = product({ variants: [{ size: 'M', color: 'Black', price: 12000, compareAtPrice: 20000, stock: 3 }] });
  const { item } = priceLine({ product: p, variantIndex: 0, quantity: 1, discounts: [], now: NOW });
  assert.equal(item.price, 12000);
  assert.equal(item.discountPercent, 40);
  // The "was" is compareAtPrice: for this kind of markdown the variant's own
  // price is already the sale price, so reporting listPrice would show a
  // 40%-off item as never discounted and strike nothing through on the slip.
  assert.equal(item.listPrice, 20000);
});

test('a compareAtPrice markdown is counted as money taken off', () => {
  const p = product({ variants: [{ size: 'M', color: 'Black', price: 12000, compareAtPrice: 20000, stock: 3 }] });
  const quote = quoteSale({ lines: [{ product: p, variantIndex: 0, quantity: 2 }], now: NOW });
  assert.equal(quote.subtotal, 24000);
  assert.equal(quote.itemDiscountTotal, 16000); // 2 x (20,000 - 12,000)
});

test('an invalid variant index is an error, not a guess at another price', () => {
  const { item, error } = priceLine({ ...line({ variantIndex: 7 }), now: NOW });
  assert.equal(item, null);
  assert.match(error, /Invalid variant index 7/);
});

// ── Price overrides ─────────────────────────────────────────────

test('an override is refused without the permission', () => {
  const { item, error } = priceLine({ ...line({ customPrice: 5000 }), now: NOW, allowOverride: false });
  assert.equal(item, null);
  assert.match(error, /permission/i);
});

test('a permitted override sets the price and is recorded as one', () => {
  const { item, error } = priceLine({ ...line({ customPrice: 15000 }), now: NOW, allowOverride: true });
  assert.equal(error, null);
  assert.equal(item.price, 15000);
  assert.equal(item.priceOverridden, true);
  assert.equal(item.listPrice, 18000); // what it would have cost, kept for the receipt
});

test('an override above the selling price is refused — it is a markup, not a discount', () => {
  const { item, error } = priceLine({ ...line({ customPrice: 19000 }), now: NOW, allowOverride: true });
  assert.equal(item, null);
  assert.match(error, /can only reduce a price/);
});

test('an override is measured against the marked-down price, not the list price', () => {
  // On sale at 12,500. 15,000 is under list but over what the shop advertises,
  // so charging it in store would quietly undo the markdown.
  const args = { ...line({ customPrice: 15000 }), discounts: [handPriced()], now: NOW, allowOverride: true };
  const { item, error } = priceLine(args);
  assert.equal(item, null);
  assert.match(error, /above the selling price of ₦12,500/);
});

test('an override may go below an automatic markdown', () => {
  const args = { ...line({ customPrice: 10000 }), discounts: [handPriced()], now: NOW, allowOverride: true };
  const { item, error } = priceLine(args);
  assert.equal(error, null);
  assert.equal(item.price, 10000);
  assert.equal(item.autoUnitPrice, 12500); // the promotion is still on the record
  assert.equal(item.priceOverridden, true);
});

test('a negative override is rejected even with the permission', () => {
  const { item, error } = priceLine({ ...line({ customPrice: -100 }), now: NOW, allowOverride: true });
  assert.equal(item, null);
  assert.match(error, /Invalid price override/);
});

test('no customPrice at all is not an override', () => {
  const { item } = priceLine({ ...line(), now: NOW, allowOverride: true });
  assert.equal(item.priceOverridden, false);
  assert.equal(item.price, 18000);
});

// ── Whole-sale totals ───────────────────────────────────────────

test('the manual discount stacks on top of the automatic markdown', () => {
  const quote = quoteSale({
    lines: [line({ quantity: 2 })],
    discounts: [handPriced()],
    discount: 10,
    discountType: 'percent',
    now: NOW,
  });
  assert.equal(quote.error, null);
  assert.equal(quote.subtotal, 25000); // 2 x 12,500 — markdown first
  assert.equal(quote.discountAmount, 2500); // then 10% goodwill off that
  assert.equal(quote.itemDiscountTotal, 11000); // 2 x (18,000 - 12,500)
});

test('tax is charged on the subtotal after both discounts', () => {
  const quote = quoteSale({
    lines: [line()],
    discounts: [handPriced()],
    discount: 2500,
    discountType: 'fixed',
    now: NOW,
  });
  const preTax = 12500 - 2500;
  assert.equal(quote.taxRate, TAX_RATE);
  assert.equal(quote.taxAmount, Math.round(preTax * TAX_RATE * 100) / 100);
  assert.equal(quote.total, Math.round((preTax + quote.taxAmount) * 100) / 100);
});

test('a fixed discount larger than the cart is clamped, never recorded as more than was charged', () => {
  const quote = quoteSale({ lines: [line()], discount: 999999, discountType: 'fixed', now: NOW });
  assert.equal(quote.discountAmount, 18000);
  assert.equal(quote.total, 0);
});

test('a nonsense manual discount is refused', () => {
  assert.match(quoteSale({ lines: [line()], discount: -5, now: NOW }).error, /cannot be negative/);
  assert.match(
    quoteSale({ lines: [line()], discount: 150, discountType: 'percent', now: NOW }).error,
    /cannot exceed 100/
  );
});

test('loyalty redemption cannot push a sale below zero', () => {
  const quote = quoteSale({ lines: [line()], loyaltyDiscount: 999999, now: NOW });
  assert.equal(quote.loyaltyDiscount, 18000);
  assert.equal(quote.total, 0);
});

test('a line that cannot be priced fails the whole sale', () => {
  const quote = quoteSale({ lines: [line(), line({ variantIndex: 9 })], now: NOW });
  assert.match(quote.error, /Invalid variant index 9/);
  assert.equal(quote.items.length, 0);
  assert.equal(quote.total, 0);
});

test('several lines add up, each priced on its own variant', () => {
  const quote = quoteSale({ lines: [line(), line({ variantIndex: 1, quantity: 2 })], discounts: [], now: NOW });
  assert.equal(quote.subtotal, 18000 + 40000);
  assert.equal(quote.items.map((i) => i.price).join(','), '18000,20000');
});

test('an empty sale quotes zero, not a bare tax charge', () => {
  const quote = quoteSale({ lines: [], now: NOW });
  assert.equal(quote.subtotal, 0);
  assert.equal(quote.taxAmount, 0);
  assert.equal(quote.total, 0);
});

// ── The reason this module exists ───────────────────────────────

test('the offline sync and the live till quote identical totals for identical input', () => {
  // Both paths call quoteSale with the same loaded products, so a sale rung up
  // on a tablet with no signal cannot bank a different figure from the same
  // sale rung up online. Before this module the offline path banked whatever
  // total the tablet sent, with no tax recorded at all.
  const args = {
    lines: [line({ quantity: 2 }), line({ variantIndex: 1 })],
    discounts: [handPriced()],
    discount: 5,
    discountType: 'percent',
    now: NOW,
  };
  const live = quoteSale(args);
  const synced = quoteSale({ ...args });
  assert.deepEqual(synced, live);
  assert.ok(synced.taxAmount > 0, 'a synced sale must record its tax');
});

test('in-store pricing agrees with what the storefront advertises', () => {
  // The storefront quotes from resolveUnitPrice; the till quotes from
  // priceLine. Same product, same discount, same unit price — that agreement
  // is the entire point of this work.
  const p = product();
  const ds = [handPriced()];
  const advertised = resolveUnitPrice(p, { size: 'M', color: 'Black' }, ds, NOW);
  const { item } = priceLine({ product: p, variantIndex: 0, quantity: 1, discounts: ds, now: NOW });
  assert.equal(item.price, advertised.unitPrice);
  assert.equal(item.listPrice, advertised.listPrice);
  assert.equal(item.discountPercent, advertised.discountPercent);
});
