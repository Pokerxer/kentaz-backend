const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Discount = require('../models/Discount');
const { validateCode, discountAmountOn } = require('../utils/pricing');
const { sanitizeProductPrices } = require('../utils/discountInput');

// Date-only strings ("YYYY-MM-DD") are ambiguous: JS/Mongoose parse them as
// UTC midnight, which for a non-UTC timezone lands in the PAST the same day —
// a discount with endDate "today" would be instantly expired. Normalize
// date-only input to local start-of-day / end-of-day so a picked date means
// the whole day.
function normalizeDate(v, endOfDay) {
  if (!v) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'));
  }
  return v;
}

// ── Admin: List all discounts ───────────────────────────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (search) {
      filter.code = { $regex: search.toUpperCase(), $options: 'i' };
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const discounts = await Discount.find(filter)
      .populate('products', 'name images category variants')
      .sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Get one ──────────────────────────────────────────────
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id)
      .populate('products', 'name images category variants');
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Create ───────────────────────────────────────────────
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      code, description, type, value,
      minOrderValue, maxDiscount,
      applicableTo, categories, products, productPrices,
      usageLimit, perCustomerLimit,
      isActive, startDate, endDate,
    } = req.body;

    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'code, type and value are required' });
    }

    const existing = await Discount.findOne({ code: code.toUpperCase().trim() });
    if (existing) return res.status(400).json({ error: 'Discount code already exists' });

    const discount = new Discount({
      code: code.toUpperCase().trim(),
      description,
      type,
      value,
      minOrderValue: minOrderValue || 0,
      maxDiscount: maxDiscount || null,
      applicableTo: applicableTo || 'all',
      categories: categories || [],
      products: products || [],
      productPrices: sanitizeProductPrices(productPrices, products),
      usageLimit: usageLimit || null,
      perCustomerLimit: perCustomerLimit || null,
      isActive: isActive !== false,
      startDate: normalizeDate(startDate, false) || new Date(),
      endDate: normalizeDate(endDate, true) || null,
    });

    await discount.save();
    await discount.populate('products', 'name images category variants');
    res.status(201).json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Update ───────────────────────────────────────────────
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ error: 'Discount not found' });

    const fields = [
      'description', 'type', 'value', 'minOrderValue', 'maxDiscount',
      'applicableTo', 'categories', 'products', 'productPrices',
      'usageLimit', 'perCustomerLimit',
      'isActive', 'startDate', 'endDate',
    ];
    fields.forEach(f => {
      if (req.body[f] === undefined) return;
      if (f === 'startDate' || f === 'endDate') {
        discount[f] = normalizeDate(req.body[f], f === 'endDate') ?? discount[f];
      } else {
        discount[f] = req.body[f];
      }
    });

    // Re-check after every field is in place: editing the selection alone
    // (without resending prices) can orphan an existing hand-priced entry.
    discount.productPrices = sanitizeProductPrices(discount.productPrices, discount.products);

    // Allow code update if changed and not duplicate
    if (req.body.code) {
      const newCode = req.body.code.toUpperCase().trim();
      if (newCode !== discount.code) {
        const dup = await Discount.findOne({ code: newCode });
        if (dup) return res.status(400).json({ error: 'Discount code already exists' });
        discount.code = newCode;
      }
    }

    await discount.save();
    await discount.populate('products', 'name images category variants');
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Delete ───────────────────────────────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Check a discount code against a hypothetical cart ───────────
// Backs the admin "test a code" panel. Real carts are priced by
// POST /api/store/discounts/quote, which resolves line prices from the
// catalogue; this route only knows a cart total, so it answers the narrower
// question "would this code apply, and for how much off that total?".
// Both run the same arithmetic from utils/pricing, so their answers agree.
router.post('/validate', async (req, res) => {
  try {
    const { code, cartTotal = 0, cartCategories = [], cartProductIds = [] } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const discount = await Discount.findOne({ code: code.toUpperCase().trim() });
    if (!discount) return res.status(404).json({ valid: false, error: 'Invalid discount code' });

    // Which part of the supplied total the code's scope covers. Without line
    // items we can only tell whether the scope overlaps at all, so an
    // overlapping scoped code is measured against the whole total.
    let eligibleSubtotal = cartTotal;
    if (discount.applicableTo === 'categories') {
      const cats = (discount.categories || []).map((c) => String(c).toLowerCase());
      const overlap = cartCategories.some((c) => cats.includes(String(c).toLowerCase()));
      if (!overlap) eligibleSubtotal = 0;
    } else if (discount.applicableTo === 'products') {
      const ids = (discount.products || []).map((id) => id.toString());
      const overlap = cartProductIds.some((id) => ids.includes(id.toString()));
      if (!overlap) eligibleSubtotal = 0;
    }

    const error = validateCode(discount, { subtotal: cartTotal, eligibleSubtotal });
    if (error) return res.json({ valid: false, error });

    res.json({
      valid: true,
      discount: {
        _id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description,
      },
      discountAmount: discountAmountOn(discount, eligibleSubtotal, discount.maxDiscount),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Reset usage count ────────────────────────────────────
router.post('/:id/reset-usage', auth, adminOnly, async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      { usageCount: 0 },
      { new: true }
    );
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
