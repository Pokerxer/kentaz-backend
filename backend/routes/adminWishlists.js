const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/admin/wishlists - Get all users with wishlists
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sort = 'recent' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter for users who have wishlists
    const filter = { wishlist: { $exists: true, $ne: [] } };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email wishlist createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort === 'recent' ? { updatedAt: -1 } : { 'wishlist.length': -1 })
        .lean(),
      User.countDocuments(filter),
    ]);

    // Populate wishlist products
    const userIds = users.map(u => u._id);
    const populatedUsers = await User.find({ _id: { $in: userIds } })
      .populate({
        path: 'wishlist',
        select: 'name slug images category variants.price',
        populate: { path: 'category', select: 'name' }
      })
      .lean();

    res.json({
      users: populatedUsers.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        wishlist: u.wishlist || [],
        wishlistCount: u.wishlist?.length || 0,
        createdAt: u.createdAt,
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/wishlists/stats - Get wishlist statistics
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const [
      totalWishlists,
      usersWithWishlist,
      totalItems,
      topProducts,
      popularCategories,
    ] = await Promise.all([
      User.countDocuments({ wishlist: { $exists: true, $ne: [] } }),
      User.aggregate([
        { $match: { wishlist: { $exists: true, $ne: [] } } },
        { $group: { _id: null, count: { $sum: 1 }, totalItems: { $sum: { $size: '$wishlist' } } } }
      ]),
      User.aggregate([
        { $match: { wishlist: { $exists: true, $ne: [] } } },
        { $group: { _id: null, total: { $sum: { $size: '$wishlist' } } } }
      ]),
      // Most wishlisted products
      User.aggregate([
        { $match: { wishlist: { $exists: true, $ne: [] } } },
        { $unwind: '$wishlist' },
        { $group: { _id: '$wishlist', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { productId: '$_id', count: 1, name: { $ifNull: ['$product.name', 'Unknown'] }, image: { $arrayElemAt: ['$product.images.url', 0] } } },
      ]),
      // Popular categories in wishlists
      User.aggregate([
        { $match: { wishlist: { $exists: true, $ne: [] } } },
        { $unwind: '$wishlist' },
        { $lookup: { from: 'products', localField: 'wishlist', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$product.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      totalUsers: usersWithWishlist[0]?.count || 0,
      totalItems: totalItems[0]?.total || 0,
      avgItemsPerUser: usersWithWishlist[0]?.count 
        ? (usersWithWishlist[0].totalItems / usersWithWishlist[0].count).toFixed(1) 
        : 0,
      topProducts: topProducts.map(p => ({
        _id: p.productId,
        name: p.name,
        image: p.image,
        wishlistCount: p.count,
      })),
      popularCategories: popularCategories.map(c => ({
        category: c._id || 'Unknown',
        count: c.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/wishlists/user/:userId - Get specific user's wishlist
router.get('/user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate({
        path: 'wishlist',
        select: 'name slug images category variants.price',
        populate: { path: 'category', select: 'name' }
      })
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      wishlist: user.wishlist || [],
      wishlistCount: user.wishlist?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/wishlists/user/:userId/product/:productId - Remove item from user's wishlist
router.delete('/user/:userId/product/:productId', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.wishlist = user.wishlist.filter(
      id => id.toString() !== req.params.productId
    );
    await user.save();

    res.json({ message: 'Product removed from wishlist', wishlistCount: user.wishlist.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/wishlists/user/:userId - Clear user's wishlist
router.delete('/user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.wishlist = [];
    await user.save();

    res.json({ message: 'Wishlist cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;