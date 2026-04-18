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

// Get active heroes (public) - seeds default heroes if none exist
router.get('/', async (req, res) => {
  try {
    let heroes = await Hero.find({ isActive: true }).sort({ order: 1 });
    
    // Seed default heroes if none exist
    if (heroes.length === 0) {
      const defaultHeroes = [
        {
          title: "Luxury.",
          subtitle: "Lifestyle. Wellness.",
          description: "Elevate your presence with our curated collection of premium fashion, luxury hair, and skincare.",
          image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80",
          ctaText: "Shop Now",
          ctaLink: "/shop",
          isActive: true,
          order: 0
        },
        {
          title: "Luxury Human Hair.",
          subtitle: "Collections.",
          description: "100% authentic human hair wigs and extensions. Natural look, effortless style.",
          image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=80",
          ctaText: "Shop Hair",
          ctaLink: "/shop?category=Human%20Hair",
          isActive: true,
          order: 1
        },
        {
          title: "Mental Wellness.",
          subtitle: "Professional Support.",
          description: "Expert therapy and mental health consultations to help you thrive.",
          image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80",
          ctaText: "Book Session",
          ctaLink: "/services",
          isActive: true,
          order: 2
        }
      ];
      await Hero.insertMany(defaultHeroes);
      heroes = await Hero.find({ isActive: true }).sort({ order: 1 });
    }
    
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
    const hero = await Hero.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
