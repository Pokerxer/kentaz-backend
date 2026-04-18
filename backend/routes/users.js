const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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

    const [users, total, roleAgg, activeCount] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.countDocuments({ isActive: { $ne: false } }),
    ]);

    const roleCounts = Object.fromEntries(roleAgg.map(r => [r._id, r.count]));

    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      roleCounts,
      activeCount,
    });
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

// Create a new user (admin-initiated)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role = 'staff', permissions = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (!['customer', 'admin', 'therapist', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role, permissions });
    await user.save();

    const { password: _, ...userObj } = user.toObject();
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Combined update: role + permissions + isActive in one call
router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { role, isActive, permissions } = req.body;
    const VALID_ROLES = ['customer', 'admin', 'therapist', 'staff'];

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (permissions !== undefined && !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent removing own admin role
    if (role !== undefined && role !== 'admin' && req.user.id?.toString() === req.params.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin role' });
    }

    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (permissions !== undefined) user.permissions = permissions;

    await user.save();
    const { password: _, ...userObj } = user.toObject();
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password
router.patch('/:id/reset-password', auth, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status (kept for backwards compat)
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

// Delete user
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.user.id?.toString() === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
