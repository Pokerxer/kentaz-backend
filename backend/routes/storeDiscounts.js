const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount');

// ── Public: Active discounts for the storefront ─────────────────
// Powers the flash sale / promotion views. Returns only discounts that
// are usable right now (active, within start/end window, usage not
// exhausted) with product info populated for 'products' scope.
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
        'code description type value minOrderValue maxDiscount applicableTo categories products startDate endDate'
      )
      .populate('products', 'name slug images category')
      .lean();

    res.json({ discounts });
  } catch (err) {
    console.error('store discounts error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
