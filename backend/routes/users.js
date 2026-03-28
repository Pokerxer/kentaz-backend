const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Booking = require('../models/Booking');

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [orders, bookings] = await Promise.all([
      Order.find({ user: req.params.id })
        .select('total status createdAt items')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Booking.find({ user: req.params.id })
        .select('serviceType status date amount createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalSpend    = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    const totalOrders   = orders.length;
    const lastOrderDate = orders[0]?.createdAt || null;

    res.json({ user, orders, bookings, stats: { totalSpend, totalOrders, lastOrderDate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status
router.patch('/:id/toggle-active', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
