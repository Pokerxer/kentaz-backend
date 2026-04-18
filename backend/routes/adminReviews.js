const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Review = require('../models/Review');
const Product = require('../models/Product');

// GET /api/admin/reviews - Get all reviews with pagination
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, product, rating, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (product) filter.product = product;
    if (rating) filter.rating = parseInt(rating);
    if (search) {
      filter.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('product', 'name slug images')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({
      reviews,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reviews/stats - Get review statistics
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const [totalReviews, avgRating, ratingDistribution, recentReviews] = await Promise.all([
      Review.countDocuments(),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]),
      Review.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]),
      Review.find()
        .populate('product', 'name')
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(r => {
      distribution[r._id] = r.count;
    });

    res.json({
      total: totalReviews,
      avgRating: avgRating[0]?.avg?.toFixed(1) || 0,
      distribution,
      recentReviews,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reviews/:id - Get single review
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('product', 'name slug images')
      .populate('user', 'name email')
      .lean();

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/reviews/:id - Delete a review
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Update product ratings
    const reviews = await Review.find({ product: review.product });
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    await Product.findByIdAndUpdate(review.product, {
      'ratings.avg': avgRating,
      'ratings.count': reviews.length,
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/reviews/:id - Update a review
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment },
      { new: true }
    )
      .populate('product', 'name slug')
      .populate('user', 'name email');

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Update product ratings
    const reviews = await Review.find({ product: review.product });
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    await Product.findByIdAndUpdate(review.product, {
      'ratings.avg': avgRating,
      'ratings.count': reviews.length,
    });

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;