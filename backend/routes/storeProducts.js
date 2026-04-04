const express = require('express');
const router = express.Router();
const { getProducts, getProduct, getCategories, getTrendingProducts } = require('../controllers/productController');

router.get('/categories', getCategories);
router.get('/trending', getTrendingProducts);
router.get('/', getProducts);
router.get('/:slug', getProduct);

module.exports = router;
