const express = require('express');
const router = express.Router();
const { getProducts, getProduct } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/:slug', getProduct);

module.exports = router;
