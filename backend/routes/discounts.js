const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Discount = require('../models/Discount');

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
      .populate('products', 'name images category')
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
      .populate('products', 'name images category');
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
      applicableTo, categories, products,
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
      usageLimit: usageLimit || null,
      perCustomerLimit: perCustomerLimit || null,
      isActive: isActive !== false,
      startDate: startDate || new Date(),
      endDate: endDate || null,
    });

    await discount.save();
    await discount.populate('products', 'name images category');
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
      'applicableTo', 'categories', 'products', 'usageLimit', 'perCustomerLimit',
      'isActive', 'startDate', 'endDate',
    ];
    fields.forEach(f => {
      if (req.body[f] !== undefined) discount[f] = req.body[f];
    });

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
    await discount.populate('products', 'name images category');
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

// ── Public: Validate a discount code ───────────────────────────
// Used by checkout and POS to apply a code
router.post('/validate', async (req, res) => {
  try {
    const { code, cartTotal = 0, cartCategories = [], cartProductIds = [] } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const discount = await Discount.findOne({ code: code.toUpperCase().trim() });
    if (!discount) return res.status(404).json({ valid: false, error: 'Invalid discount code' });

    if (!discount.isActive) {
      return res.json({ valid: false, error: 'This discount code is inactive' });
    }

    const now = new Date();
    if (discount.startDate && now < new Date(discount.startDate)) {
      return res.json({ valid: false, error: 'This discount code is not yet active' });
    }
    if (discount.endDate && now > new Date(discount.endDate)) {
      return res.json({ valid: false, error: 'This discount code has expired' });
    }

    if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
      return res.json({ valid: false, error: 'This discount code has reached its usage limit' });
    }

    if (cartTotal < discount.minOrderValue) {
      return res.json({
        valid: false,
        error: `Minimum order value of ₦${discount.minOrderValue.toLocaleString()} required`,
      });
    }

    // Category check
    if (discount.applicableTo === 'categories' && discount.categories.length > 0) {
      const overlap = discount.categories.some(c => cartCategories.includes(c));
      if (!overlap) {
        return res.json({
          valid: false,
          error: `This code only applies to: ${discount.categories.join(', ')}`,
        });
      }
    }

    // Product check
    if (discount.applicableTo === 'products' && discount.products.length > 0) {
      const discountProductIds = discount.products.map(id => id.toString());
      const overlap = cartProductIds.some(id => discountProductIds.includes(id.toString()));
      if (!overlap) {
        return res.json({
          valid: false,
          error: 'This code does not apply to any items in your cart',
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (cartTotal * discount.value) / 100;
      if (discount.maxDiscount !== null) {
        discountAmount = Math.min(discountAmount, discount.maxDiscount);
      }
    } else {
      discountAmount = Math.min(discount.value, cartTotal);
    }

    res.json({
      valid: true,
      discount: {
        _id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description,
      },
      discountAmount: Math.round(discountAmount),
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
