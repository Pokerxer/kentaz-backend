/**
 * Pricing and discount math.
 *
 * Pure functions only — no DB access, no Express — so the storefront quote
 * endpoint, order creation and the tests all run the exact same arithmetic.
 * Anything that decides what a customer pays belongs here, so that the price
 * the shop advertises and the price we charge can never drift apart.
 *
 * Money is computed in two tiers:
 *
 *   Tier 1 — automatic line markdown (the "flash sale"). Every usable Discount
 *   that covers a product competes to reduce that line's unit price and the
 *   deepest one wins. This is what product cards and /flash-sale advertise, so
 *   it has to be what the cart charges. `maxDiscount` caps the markdown PER
 *   UNIT in this tier, because a unit price must be quotable on a product card
 *   before any cart exists.
 *
 *   Tier 2 — a promo code applied to the order. The code discounts only the
 *   portion of the post-markdown subtotal it actually covers, and `maxDiscount`
 *   caps the total amount taken off the order.
 *
 * A discount that already marked a line down in tier 1 cannot also be redeemed
 * as a code in tier 2 — otherwise publishing a flash-sale code lets it apply
 * twice to the same items.
 */

const TAX_RATE = 0.075;
const FREE_SHIPPING_THRESHOLD = 50000;
const STANDARD_SHIPPING = 2500;
const EXPRESS_SHIPPING = 5000;

/** Markdowns shallower than this are noise, not a promotion. */
const MIN_MARKDOWN_PERCENT = 5;

const money = (n) => Math.round(Number(n) || 0);
const idOf = (v) => (v && v._id ? String(v._id) : String(v));

/** Active, inside its date window, and with redemptions left. */
function isDiscountUsable(discount, now = new Date()) {
  if (!discount || discount.isActive === false) return false;
  const t = now.getTime();
  if (discount.startDate && t < new Date(discount.startDate).getTime()) return false;
  if (discount.endDate && t > new Date(discount.endDate).getTime()) return false;
  if (
    discount.usageLimit !== null &&
    discount.usageLimit !== undefined &&
    (discount.usageCount || 0) >= discount.usageLimit
  ) {
    return false;
  }
  return true;
}

/** Whether a discount's scope covers this product. */
function discountAppliesToProduct(discount, product) {
  if (!discount || !product) return false;
  const scope = discount.applicableTo || 'all';
  if (scope === 'all') return true;
  if (scope === 'categories') {
    const cats = (discount.categories || []).map((c) => String(c).toLowerCase());
    return cats.includes(String(product.category || '').toLowerCase());
  }
  if (scope === 'products') {
    const ids = new Set((discount.products || []).map(idOf));
    return ids.has(String(product._id));
  }
  return false;
}

/**
 * Amount taken off `base` by a discount, before any cap.
 * `cap` is the ceiling for percentage discounts (per unit in tier 1, per order
 * in tier 2) — pass null for uncapped.
 */
function discountAmountOn(discount, base, cap) {
  if (base <= 0) return 0;
  let off;
  if (discount.type === 'percentage') {
    off = (base * discount.value) / 100;
    if (cap !== null && cap !== undefined && cap > 0) off = Math.min(off, cap);
  } else {
    off = discount.value;
  }
  return money(Math.max(0, Math.min(off, base)));
}

/**
 * A hand-priced sale price for this product, or null when the discount does
 * not name one. Set per selected product on the admin discounts page; it wins
 * over the discount's own type/value so a merchant can price a hero item
 * exactly instead of describing it as a percentage.
 */
function productOverridePrice(discount, product) {
  if (!discount || !product) return null;
  const entries = discount.productPrices || [];
  if (!entries.length) return null;
  const wanted = String(product._id);
  for (const entry of entries) {
    // Strictly a number: `money()` turns null, '' and [] into 0, so a
    // malformed entry would otherwise price the product at zero.
    if (!entry || typeof entry.price !== 'number' || !Number.isFinite(entry.price)) continue;
    if (idOf(entry.product) === wanted) return money(entry.price);
  }
  return null;
}

/**
 * Unit price after a single discount (tier 1: `maxDiscount` caps per unit).
 *
 * `product` is optional and only used to find a hand-priced override. An
 * override names the exact price to charge, so `maxDiscount` does not apply to
 * it — a cap would silently contradict the figure the merchant typed. It is
 * clamped to the list price so an override sitting above today's price can
 * only ever mean "no markdown", never a price increase.
 */
function discountedUnitPrice(discount, unitPrice, product = null) {
  const price = money(unitPrice);
  const override = productOverridePrice(discount, product);
  if (override !== null) return Math.max(0, Math.min(override, price));
  return Math.max(0, price - discountAmountOn(discount, price, discount.maxDiscount));
}

/** Locate the variant a cart line refers to, falling back to the first one. */
function findVariant(product, variant) {
  const variants = (product && product.variants) || [];
  if (!variants.length) return null;
  if (!variant) return variants[0];
  const norm = (v) => (v === undefined || v === null || v === '' ? null : String(v));
  const wantSize = norm(variant.size);
  const wantColor = norm(variant.color);
  const match = variants.find((v) => norm(v.size) === wantSize && norm(v.color) === wantColor);
  return match || variants[0];
}

/**
 * Best automatic markdown for one unit of a product, for a variant the caller
 * already holds.
 *
 * Two sources compete and the deeper one wins:
 *   1. a usable Discount whose scope covers the product, and
 *   2. a genuine `compareAtPrice` markdown recorded on the variant.
 *
 * Returns the unit price to charge plus the "was" price to strike through.
 * Never invents a "was" price — an item with no real promotion comes back at
 * its list price with `discount: null`.
 *
 * Prefer this over `resolveUnitPrice` when the exact variant is already known:
 * the POS addresses variants by index, and two variants may share a size/color
 * pair, so looking one up by those fields could price the wrong row.
 */
function priceVariant(product, v, discounts = [], now = new Date()) {
  const listPrice = money(v && v.price);
  const result = {
    unitPrice: listPrice,
    listPrice,
    compareAtPrice: null,
    discountPercent: 0,
    discount: null,
    variant: v ? { size: v.size, color: v.color, stock: Number(v.stock) || 0, sku: v.sku } : null,
  };
  if (listPrice <= 0) return result;

  const pctOff = (was, sale) => (was > 0 ? Math.round(((was - sale) / was) * 100) : 0);

  // Source 1: usable discounts covering this product.
  for (const d of discounts) {
    if (!isDiscountUsable(d, now) || !discountAppliesToProduct(d, product)) continue;
    const sale = discountedUnitPrice(d, listPrice, product);
    if (sale >= listPrice) continue;
    const percent = pctOff(listPrice, sale);
    if (percent < MIN_MARKDOWN_PERCENT) continue;
    if (sale < result.unitPrice) {
      result.unitPrice = sale;
      result.compareAtPrice = listPrice;
      result.discountPercent = percent;
      result.discount = { _id: String(d._id), code: d.code, source: 'discount' };
    }
  }

  // Source 2: a compareAtPrice markdown already baked into the variant.
  const compareAt = money(v && v.compareAtPrice);
  if (compareAt > listPrice) {
    const percent = pctOff(compareAt, listPrice);
    if (percent >= MIN_MARKDOWN_PERCENT && percent > result.discountPercent) {
      result.unitPrice = listPrice;
      result.compareAtPrice = compareAt;
      result.discountPercent = percent;
      result.discount = { _id: null, code: null, source: 'compareAtPrice' };
    }
  }

  return result;
}

/**
 * Best automatic markdown for one unit, addressing the variant by its
 * size/color (the storefront's shape — a cart line names what the shopper
 * picked). Falls back to the first variant, same as `findVariant`.
 */
function resolveUnitPrice(product, variant, discounts = [], now = new Date()) {
  return priceVariant(product, findVariant(product, variant), discounts, now);
}

/** Shipping for a post-discount subtotal. */
function getShippingCost(deliveryMethod, subtotal) {
  if (deliveryMethod === 'express') return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

/**
 * Why a promo code was rejected, or null when it holds.
 * `eligibleSubtotal` is the part of the cart the code's scope actually covers.
 */
function validateCode(
  discount,
  { subtotal, eligibleSubtotal, autoAppliedIds = [], customerUses = 0 },
  now = new Date()
) {
  if (!discount) return 'Invalid discount code';
  if (discount.isActive === false) return 'This discount code is inactive';

  const t = now.getTime();
  if (discount.startDate && t < new Date(discount.startDate).getTime()) {
    return 'This discount code is not yet active';
  }
  if (discount.endDate && t > new Date(discount.endDate).getTime()) {
    return 'This discount code has expired';
  }
  if (
    discount.usageLimit !== null &&
    discount.usageLimit !== undefined &&
    (discount.usageCount || 0) >= discount.usageLimit
  ) {
    return 'This discount code has reached its usage limit';
  }
  if (
    discount.perCustomerLimit !== null &&
    discount.perCustomerLimit !== undefined &&
    customerUses >= discount.perCustomerLimit
  ) {
    return 'You have already used this discount code the maximum number of times';
  }
  if (subtotal < (discount.minOrderValue || 0)) {
    return `Minimum order value of ₦${(discount.minOrderValue || 0).toLocaleString()} required`;
  }
  // Already taken off these items as a sale price — don't let it apply twice.
  if (autoAppliedIds.map(String).includes(String(discount._id))) {
    return 'This promotion is already applied to items in your cart';
  }
  if (eligibleSubtotal <= 0) {
    return 'This code does not apply to any items in your cart';
  }
  return null;
}

/**
 * Price a whole cart.
 *
 * `lines` are `{ product, variant, quantity }` with `product` loaded from the
 * database — never a price supplied by the client.
 *
 * Returns the full breakdown: per-line prices with their markdowns, the
 * order-level code discount, shipping, tax and the total to charge.
 */
function quoteCart({
  lines = [],
  discounts = [],
  code = null,
  deliveryMethod = 'standard',
  customerUses = 0,
  now = new Date(),
}) {
  const usable = discounts.filter((d) => isDiscountUsable(d, now));

  const items = [];
  let subtotal = 0;
  let itemDiscountTotal = 0;
  const autoAppliedIds = [];

  for (const line of lines) {
    const { product, variant, quantity } = line;
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const priced = resolveUnitPrice(product, variant, usable, now);
    const lineTotal = priced.unitPrice * qty;
    const wasTotal = (priced.compareAtPrice || priced.unitPrice) * qty;

    subtotal += lineTotal;
    itemDiscountTotal += wasTotal - lineTotal;
    if (priced.discount && priced.discount._id) autoAppliedIds.push(priced.discount._id);

    items.push({
      product: String(product._id),
      name: product.name,
      slug: product.slug,
      image: (product.images && product.images[0] && product.images[0].url) || null,
      quantity: qty,
      variant: priced.variant,
      unitPrice: priced.unitPrice,
      originalUnitPrice: priced.compareAtPrice || priced.listPrice,
      lineTotal,
      discountPercent: priced.discountPercent,
      appliedDiscount: priced.discount,
    });
  }

  // Tier 2: the promo code, against the slice of the cart its scope covers.
  let codeDiscount = null;
  let codeError = null;
  let codeDiscountAmount = 0;

  if (code) {
    const wanted = String(code).toUpperCase().trim();
    const discount = discounts.find((d) => String(d.code).toUpperCase() === wanted) || null;

    const eligibleSubtotal = discount
      ? lines.reduce((sum, line, i) => {
          if (!discountAppliesToProduct(discount, line.product)) return sum;
          // A hand-priced product is already sitting at the exact price the
          // merchant set for this discount. Letting the same code then take
          // its percentage off that price again would charge less than the
          // figure typed on the discounts page.
          if (productOverridePrice(discount, line.product) !== null) return sum;
          return sum + items[i].lineTotal;
        }, 0)
      : 0;

    codeError = validateCode(
      discount,
      { subtotal, eligibleSubtotal, autoAppliedIds, customerUses },
      now
    );

    if (!codeError) {
      codeDiscountAmount = discountAmountOn(discount, eligibleSubtotal, discount.maxDiscount);
      codeDiscount = {
        _id: String(discount._id),
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description || '',
        amount: codeDiscountAmount,
      };
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - codeDiscountAmount);
  // Nothing to ship and nothing to tax when there is nothing to buy — an empty
  // cart must quote zero, not a bare delivery fee.
  const empty = items.length === 0;
  const shipping = empty ? 0 : getShippingCost(deliveryMethod, discountedSubtotal);
  const tax = empty ? 0 : money(discountedSubtotal * TAX_RATE);
  const total = empty ? 0 : discountedSubtotal + shipping + tax;

  return {
    items,
    subtotal,
    itemDiscountTotal,
    discount: codeDiscount,
    discountAmount: codeDiscountAmount,
    codeError,
    shipping,
    tax,
    total,
    deliveryMethod: deliveryMethod === 'express' ? 'express' : 'standard',
  };
}

module.exports = {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING,
  EXPRESS_SHIPPING,
  MIN_MARKDOWN_PERCENT,
  isDiscountUsable,
  discountAppliesToProduct,
  discountAmountOn,
  productOverridePrice,
  discountedUnitPrice,
  findVariant,
  priceVariant,
  resolveUnitPrice,
  getShippingCost,
  validateCode,
  quoteCart,
};
