const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Hero = require('../models/Hero');

// Seed heroes (public - for initial setup)
router.post('/seed', async (req, res) => {
  try {
    const heroes = req.body;
    if (!Array.isArray(heroes)) {
      return res.status(400).json({ error: 'Expected array of heroes' });
    }
    
    await Hero.deleteMany({});
    const created = await Hero.insertMany(heroes);
    res.json({ message: `Created ${created.length} heroes`, heroes: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all heroes for admin (no auth needed for this endpoint) - must be before public GET /
router.get('/all', async (req, res) => {
  try {
    const heroes = await Hero.find().sort({ order: 1 });
    res.json(heroes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get active heroes (public); an empty collection stays empty.
router.get('/', async (req, res) => {
  try {
    const heroes = await Hero.find({ isActive: true }).sort({ order: 1 });
    res.json(heroes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create hero
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const hero = new Hero(req.body);
    await hero.save();
    res.status(201).json(hero);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update hero
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const hero = await Hero.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!hero) return res.status(404).json({ error: 'Hero not found' });
    res.json(hero);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete hero
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const hero = await Hero.findByIdAndDelete(req.params.id);
    if (!hero) return res.status(404).json({ error: 'Hero not found' });
    res.json({ message: 'Hero deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder heroes
router.post('/reorder', auth, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    await Promise.all(ids.map((id, index) => 
      Hero.findByIdAndUpdate(id, { order: index })
    ));
    res.json({ message: 'Heroes reordered' });
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message });
  }
});

module.exports = router;
