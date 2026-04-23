const express = require('express');
const router = express.Router();
const { getProducts, getProduct, getCategories, getTrendingProducts } = require('../controllers/productController');
const Product = require('../models/Product');
const Review = require('../models/Review');

router.get('/categories', getCategories);
router.get('/trending', getTrendingProducts);

// Public store stats (product count, avg rating)
router.get('/stats', async (req, res) => {
  try {
    const [productCount, ratingResult] = await Promise.all([
      Product.countDocuments(),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);
    res.json({
      productCount,
      avgRating: ratingResult[0]?.avg ? parseFloat(ratingResult[0].avg.toFixed(1)) : 4.8,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', getProducts);
router.get('/:slug', getProduct);

module.exports = router;
