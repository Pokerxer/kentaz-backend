const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const ShippingZone = require('../models/ShippingZone');
const ShippingSettings = require('../models/ShippingSettings');

// ── Helper: get or create settings singleton ────────────────────
async function getSettings() {
  let settings = await ShippingSettings.findOne();
  if (!settings) {
    settings = await ShippingSettings.create({});
  }
  return settings;
}

// ── GET /api/admin/shipping — all zones + settings ──────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const [zones, settings] = await Promise.all([
      ShippingZone.find().sort({ sortOrder: 1, name: 1 }),
      getSettings(),
    ]);
    res.json({ zones, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/shipping/settings ───────────────────────────
router.put('/settings', auth, adminOnly, async (req, res) => {
  try {
    const settings = await getSettings();
    const fields = [
      'enableShipping', 'defaultProcessingDays', 'checkoutNote',
      'allowPickup', 'pickupAddress', 'pickupNote', 'pickupPrice',
    ];
    fields.forEach(f => { if (req.body[f] !== undefined) settings[f] = req.body[f]; });
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/shipping/zones ─────────────────────────────
router.post('/zones', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, regions, methods, isActive, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: 'Zone name is required' });

    const zone = new ShippingZone({
      name,
      description: description || '',
      regions: regions || [],
      methods: methods || [],
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
    });
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/shipping/zones/:id ──────────────────────────
router.put('/zones/:id', auth, adminOnly, async (req, res) => {
  try {
    const zone = await ShippingZone.findById(req.params.id);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const fields = ['name', 'description', 'regions', 'methods', 'isActive', 'sortOrder'];
    fields.forEach(f => { if (req.body[f] !== undefined) zone[f] = req.body[f]; });
    await zone.save();
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/shipping/zones/:id ───────────────────────
router.delete('/zones/:id', auth, adminOnly, async (req, res) => {
  try {
    const zone = await ShippingZone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/shipping/calculate ─────────────────────────
// Public endpoint — used by checkout to calculate shipping
// body: { state, city, cartTotal }
router.post('/calculate', async (req, res) => {
  try {
    const { state = '', city = '', cartTotal = 0 } = req.body;
    const settings = await getSettings();

    if (!settings.enableShipping) {
      return res.json({ available: false, error: 'Shipping is currently unavailable' });
    }

    const zones = await ShippingZone.find({ isActive: true }).sort({ sortOrder: 1 });

    // Find best matching zone — check if any region keyword is in the address
    const location = `${state} ${city}`.toLowerCase();
    let matchedZone = null;

    for (const zone of zones) {
      const matches = zone.regions.some(r => {
        const region = r.toLowerCase();
        return location.includes(region) || region.includes(location.split(' ')[0]);
      });
      if (matches) { matchedZone = zone; break; }
    }

    // Fall back to a zone named "Rest of Nigeria" or last zone
    if (!matchedZone) {
      matchedZone = zones.find(z =>
        z.name.toLowerCase().includes('rest') ||
        z.name.toLowerCase().includes('other') ||
        z.name.toLowerCase().includes('nigeria')
      ) || zones[zones.length - 1] || null;
    }

    if (!matchedZone) {
      return res.json({ available: false, error: 'No shipping available for your location' });
    }

    const activeMethods = matchedZone.methods
      .filter(m => m.isActive)
      .map(m => ({
        _id: m._id,
        name: m.name,
        description: m.description,
        price: (m.freeThreshold !== null && cartTotal >= m.freeThreshold) ? 0 : m.price,
        originalPrice: m.price,
        isFree: m.freeThreshold !== null && cartTotal >= m.freeThreshold,
        minDays: m.minDays,
        maxDays: m.maxDays,
        freeThreshold: m.freeThreshold,
      }));

    // Pickup option
    const pickup = settings.allowPickup ? {
      _id: 'pickup',
      name: 'Store Pickup',
      description: settings.pickupNote,
      price: settings.pickupPrice,
      isFree: settings.pickupPrice === 0,
      minDays: 0,
      maxDays: 0,
    } : null;

    res.json({
      available: true,
      zone: { _id: matchedZone._id, name: matchedZone.name },
      methods: activeMethods,
      pickup,
      processingDays: settings.defaultProcessingDays,
      checkoutNote: settings.checkoutNote,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
