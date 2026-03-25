const Review = require('../models/Review');
const Product = require('../models/Product');

exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    const existingReview = await Review.findOne({ product: productId, user: req.user.id });
    if (existingReview) {
      return res.status(400).json({ error: 'You already reviewed this product' });
    }

    const review = new Review({
      product: productId,
      user: req.user.id,
      rating,
      comment
    });
    await review.save();

    const product = await Product.findById(productId);
    const reviews = await Review.find({ product: productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    product.ratings = { avg: avgRating, count: reviews.length };
    await product.save();

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
