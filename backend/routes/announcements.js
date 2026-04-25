const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/admin/announcements
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const items = await Announcement.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store/announcements — public: active announcements only
router.get('/public', async (req, res) => {
  try {
    const now = new Date();
    const items = await Announcement.find({
      active: true,
      $or: [
        { startsAt: null, endsAt: null },
        { startsAt: { $lte: now }, endsAt: { $gte: now } },
        { startsAt: { $lte: now }, endsAt: null },
        { startsAt: null, endsAt: { $gte: now } },
      ],
    }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/announcements
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { title, body, type, active, startsAt, endsAt } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
    const item = await Announcement.create({
      title, body, type, active,
      startsAt: startsAt || null,
      endsAt:   endsAt   || null,
      createdBy: req.user.id,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/announcements/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, body, type, active, startsAt, endsAt } = req.body;
    const item = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, body, type, active, startsAt: startsAt || null, endsAt: endsAt || null },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/announcements/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
