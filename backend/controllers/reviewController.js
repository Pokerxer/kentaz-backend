const Review = require('../models/Review');
const Product = require('../models/Product');

exports.createReview = async (req, res) => {
  try {
    // Accept both `productId` (legacy contract) and `product` (the field the
    // storefront actually sends) so either caller can create a review.
    const { productId, product: productField, rating, comment } = req.body;
    const targetProduct = productId || productField;
    if (!targetProduct) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const existingReview = await Review.findOne({ product: targetProduct, user: req.user.id });
    if (existingReview) {
      return res.status(400).json({ error: 'You already reviewed this product' });
    }

    const review = new Review({
      product: targetProduct,
      user: req.user.id,
      rating,
      comment
    });
    await review.save();

    const product = await Product.findById(targetProduct);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const reviews = await Review.find({ product: targetProduct });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    product.ratings = { avg: avgRating, count: reviews.length };
    await product.save();

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
