const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../utils/jwt');
const Discount = require('../models/Discount');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { quoteCart } = require('../utils/pricing');

/**
 * Attach req.user when a valid token is present, but let anonymous shoppers
 * through — a cart has to be priceable before anyone logs in.
 */
function optionalAuth(req, _res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // An expired or bogus token just means "anonymous" for a price quote.
    }
  }
  next();
}

// ── Public: Active discounts for the storefront ─────────────────
// Powers the flash sale / promotion views. Returns only discounts that
// are usable right now (active, within start/end window, usage not
// exhausted) with product info populated for 'products' scope.
//
// Deliberately omits `code`: the storefront renders markdowns and never the
// code itself, and listing every code publicly would hand targeted campaign
// codes to anyone who opened devtools.
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const discounts = await Discount.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        { $or: [{ endDate: null }, { endDate: { $gt: now } }] },
        {
          $expr: {
            $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usageCount', '$usageLimit'] }],
          },
        },
      ],
    })
      .select(
        'description type value minOrderValue maxDiscount applicableTo categories products productPrices startDate endDate'
      )
      .populate('products', 'name slug images category')
      .lean();

    res.json({ discounts });
  } catch (err) {
    console.error('store discounts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Public: Price a cart ────────────────────────────────────────
// The authoritative quote. The client sends what it wants to buy — product
// id, variant and quantity — and gets back line prices, flash-sale
// markdowns, the promo-code discount, shipping, tax and the total. The cart
// and checkout both render this response and order creation recomputes the
// same figures, so what is displayed is always what is charged.
router.post('/quote', optionalAuth, async (req, res) => {
  try {
    const { items = [], code = null, deliveryMethod = 'standard' } = req.body;

    const ids = [...new Set(items.map((i) => i.product).filter(Boolean))];
    const products = ids.length ? await Product.find({ _id: { $in: ids } }) : [];
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const lines = [];
    const unavailable = [];
    for (const item of items) {
      const product = byId.get(String(item.product));
      if (!product) {
        unavailable.push(String(item.product));
        continue;
      }
      lines.push({ product, variant: item.variant, quantity: item.quantity });
    }

    const discounts = await Discount.find({ isActive: true });

    // Per-customer redemption count, for shoppers who are signed in.
    let customerUses = 0;
    if (code && req.user) {
      customerUses = await Order.countDocuments({
        user: req.user.id,
        'discount.code': String(code).toUpperCase().trim(),
        status: { $ne: 'cancelled' },
      });
    }

    const quote = quoteCart({ lines, discounts, code, deliveryMethod, customerUses });
    res.json({ ...quote, unavailable });
  } catch (err) {
    console.error('cart quote error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
