const express = require('express');
const router = express.Router();
const { createProduct, updateProduct, deleteProduct, getAdminProducts, getAdminProductById } = require('../controllers/productController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, adminOnly, getAdminProducts);
router.get('/:id', auth, adminOnly, getAdminProductById);
router.post('/', auth, adminOnly, createProduct);
router.put('/:id', auth, adminOnly, updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);

module.exports = router;
