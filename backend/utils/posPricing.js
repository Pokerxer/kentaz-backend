/**
 * In-store (POS) pricing.
 *
 * Pure functions only — no DB access, no Express — so `createSale`, the offline
 * sync and the tests all run the exact same arithmetic. The whole point of this
 * module is that the till and the storefront cannot disagree: every unit price
 * here comes from `priceVariant()` in utils/pricing.js, the same function the
 * shop's product cards and /flash-sale advertise from. No pricing rule is
 * restated here — this file only composes that one with the things unique to a
 * counter sale.
 *
 * What differs from a web order:
 *
 *   - No shipping. A walk-in carries the goods out.
 *   - No promo codes. A code's per-customer limit is counted against a customer
 *     account and a walk-in has none, so codes are deliberately not honoured in
 *     store. Automatic markdowns are.
 *   - A manual discount. Staff negotiate at the counter, so a typed goodwill
 *     discount applies ON TOP of any automatic markdown, against the
 *     already-marked-down subtotal.
 *   - A price override. A cashier holding `pos:price_override` may type a unit
 *     price directly.
 *
 * Money keeps the till's existing kobo rounding (2dp) rather than the
 * storefront's whole-naira rounding, so this change moves no receipt total that
 * wasn't already wrong. Unit prices are whole naira either way, because
 * `priceVariant` rounds them.
 */

const { TAX_RATE, priceVariant } = require('./pricing');

/** Round to kobo — the precision Sale.total has always been stored at. */
const kobo = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Price one till line.
 *
 * `product` must be loaded from the database — never a price the client sent.
 * `customPrice` is the only client-supplied money this module accepts, and only
 * when `allowOverride` says the cashier is permitted to set one.
 *
 * An override may only ever reduce what the customer would otherwise pay: it is
 * rejected above the automatic price, not above the list price. Letting a till
 * ring an item up for MORE than the shop advertises is not a discount
 * permission, it is a mispriced sale.
 *
 * Returns `{ item, error }` — `error` is a message for the caller to surface,
 * and `item` is null in that case.
 */
function priceLine({
  product,
  variantIndex = 0,
  quantity = 1,
  customPrice = null,
  discounts = [],
  now = new Date(),
  allowOverride = false,
}) {
  const variant = product && product.variants && product.variants[variantIndex];
  if (!variant) {
    const name = (product && product.name) || 'product';
    return { item: null, error: `Invalid variant index ${variantIndex} for "${name}"` };
  }

  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const priced = priceVariant(product, variant, discounts, now);
  const label = [variant.size, variant.color].filter(Boolean).join(' / ');

  let unitPrice = priced.unitPrice;
  let priceOverridden = false;

  const wantsOverride = customPrice !== null && customPrice !== undefined && customPrice !== '';
  if (wantsOverride) {
    const typed = Number(customPrice);
    if (!Number.isFinite(typed) || typed < 0) {
      return { item: null, error: `Invalid price override for "${product.name}"` };
    }
    if (!allowOverride) {
      return { item: null, error: 'You do not have permission to override prices' };
    }
    if (typed > priced.unitPrice) {
      return {
        item: null,
        error:
          `Price override for "${product.name}" (₦${typed.toLocaleString()}) is above the selling ` +
          `price of ₦${priced.unitPrice.toLocaleString()}. An override can only reduce a price.`,
      };
    }
    unitPrice = Math.round(typed);
    priceOverridden = true;
  }

  return {
    error: null,
    item: {
      product: product._id,
      productName: product.name,
      variantIndex,
      variantLabel: label,
      quantity: qty,
      price: unitPrice,
      // What one unit cost before any promotion or override — the "was" figure
      // on the receipt, and what reports measure markdown against.
      //
      // For a compareAtPrice markdown the variant's own `price` IS the sale
      // price, so the pre-markdown figure is `compareAtPrice`. Using
      // `listPrice` there would report a 30%-off item as never discounted.
      listPrice: priced.compareAtPrice || priced.listPrice,
      // The automatic markdown, recorded even when an override then went lower,
      // so a report can tell a promotion from a cashier's goodwill.
      discountPercent: priced.discountPercent,
      appliedDiscount: priced.discount && priced.discount._id ? priced.discount._id : null,
      appliedDiscountCode: (priced.discount && priced.discount.code) || null,
      autoUnitPrice: priced.unitPrice,
      priceOverridden,
      costPrice: variant.costPrice || 0,
      total: unitPrice * qty,
      stock: Number(variant.stock) || 0,
    },
  };
}

/**
 * Price a whole counter sale.
 *
 * `lines` are `{ product, variantIndex, quantity, customPrice }` with `product`
 * loaded from the database. `loyaltyDiscount` is a naira amount the caller has
 * already redeemed against the customer's points balance (that is a DB write,
 * so it cannot happen in here).
 *
 * Returns the full breakdown plus `error` — non-null when a line could not be
 * priced, in which case no totals are meaningful.
 */
function quoteSale({
  lines = [],
  discounts = [],
  discount = 0,
  discountType = 'percent',
  loyaltyDiscount = 0,
  now = new Date(),
  allowOverride = false,
}) {
  const empty = {
    items: [],
    subtotal: 0,
    itemDiscountTotal: 0,
    discountAmount: 0,
    loyaltyDiscount: 0,
    taxRate: TAX_RATE,
    taxAmount: 0,
    total: 0,
  };

  const items = [];
  let subtotal = 0;
  let itemDiscountTotal = 0;

  for (const line of lines) {
    const { item, error } = priceLine({ ...line, discounts, now, allowOverride });
    if (error) return { ...empty, error };
    subtotal += item.total;
    // Everything taken off list price on this line — automatic markdown and
    // override together.
    itemDiscountTotal += (item.listPrice - item.price) * item.quantity;
    items.push(item);
  }

  const typedDiscount = Number(discount) || 0;
  if (typedDiscount < 0) return { ...empty, error: 'Discount cannot be negative' };
  if (discountType === 'percent' && typedDiscount > 100) {
    return { ...empty, error: 'A percentage discount cannot exceed 100%' };
  }

  // Clamped to the subtotal so the figure stored on the sale can never claim
  // more was taken off than was ever charged — reports read this field.
  const rawDiscountAmount = discountType === 'percent' ? (subtotal * typedDiscount) / 100 : typedDiscount;
  const discountAmount = kobo(Math.min(Math.max(0, rawDiscountAmount), subtotal));

  const loyalty = kobo(
    Math.min(Math.max(0, Number(loyaltyDiscount) || 0), Math.max(0, subtotal - discountAmount))
  );

  const preTax = Math.max(0, subtotal - discountAmount - loyalty);
  const taxAmount = kobo(preTax * TAX_RATE);
  const total = kobo(preTax + taxAmount);

  return {
    items,
    subtotal: kobo(subtotal),
    itemDiscountTotal: kobo(itemDiscountTotal),
    discountAmount,
    loyaltyDiscount: loyalty,
    taxRate: TAX_RATE,
    taxAmount,
    total,
    error: null,
  };
}

module.exports = { TAX_RATE, priceLine, quoteSale };
