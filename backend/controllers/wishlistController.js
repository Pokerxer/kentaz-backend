const User = require('../models/User');

exports.addToWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.wishlist.includes(req.params.productId)) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }
    user.wishlist.push(req.params.productId);
    await user.save();
    res.json(user.wishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    res.json(user.wishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    res.json(user.wishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
