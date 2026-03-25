const express = require('express');
const router = express.Router();
const { addToWishlist, removeFromWishlist, getWishlist } = require('../controllers/wishlistController');
const { auth } = require('../middleware/auth');

router.post('/:productId', auth, addToWishlist);
router.delete('/:productId', auth, removeFromWishlist);
router.get('/', auth, getWishlist);

module.exports = router;
