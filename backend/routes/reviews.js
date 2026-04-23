const express = require('express');
const router = express.Router();
const { createReview } = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');
const Review = require('../models/Review');

// Public: get top reviews for the homepage testimonials
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const reviews = await Review.find({ rating: { $gte: 4 }, comment: { $exists: true, $ne: '' } })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .populate('user', 'name')
      .populate('product', 'name')
      .lean();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, createReview);

module.exports = router;
