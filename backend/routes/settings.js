const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { auth, adminOnly } = require('../middleware/auth');

const DEFAULTS = {
  general:      { storeName: 'Kentaz', storeUrl: 'https://kentazemporium.com', currency: 'NGN', timezone: 'Africa/Lagos', email: 'info@kentazemporium.com', phone: '07081856411' },
  payments:     { paystackEnabled: true, paystackPublicKey: '', codEnabled: true, codFee: 0 },
  shipping:     { enableShipping: true, defaultProcessingDays: 3, freeShippingThreshold: 50000, standardShippingFee: 2500, expressShippingFee: 5000, allowPickup: true, pickupAddress: '' },
  notifications:{ emailOrders: true, emailLowStock: true, emailLowStockThreshold: 10, emailDailyDigest: false, pushNewOrders: true, pushLowStock: true },
  security:     { sessionTimeout: 60, passwordMinLength: 8, requireUppercase: true, requireNumbers: true, ipWhitelist: '' },
};

// GET /api/admin/settings — returns all setting groups
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const docs = await Setting.find({});
    const result = { ...DEFAULTS };
    for (const doc of docs) {
      result[doc.key] = { ...(DEFAULTS[doc.key] || {}), ...doc.value };
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings/:key — upsert a single settings group
router.put('/:key', auth, adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const allowed = Object.keys(DEFAULTS);
    if (!allowed.includes(key)) {
      return res.status(400).json({ error: `Unknown settings key: ${key}` });
    }
    // Never persist raw secret keys — strip paystackSecretKey
    const value = { ...req.body };
    delete value.paystackSecretKey;

    const doc = await Setting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    res.json({ [key]: { ...(DEFAULTS[key] || {}), ...doc.value } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
