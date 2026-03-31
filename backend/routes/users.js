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

// Update user role
router.patch('/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin', 'therapist', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent removing own admin role
    if (req.user.id && req.user.id.toString() === req.params.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot remove your own admin role' });
    }

    user.role = role;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent self-delete
    if (req.user.id && req.user.id.toString() === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user permissions
router.patch('/:id/permissions', auth, adminOnly, async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.permissions = permissions;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
