const express = require('express');
const router = express.Router();
const { getProducts, getProduct, getCategories } = require('../controllers/productController');

router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:slug', getProduct);

module.exports = router;
