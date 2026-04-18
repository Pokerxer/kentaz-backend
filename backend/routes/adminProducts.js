const express = require('express');
const router = express.Router();
const { createProduct, updateProduct, deleteProduct, getAdminProducts, getAdminProductById, upload, uploadFile, importProducts, parseCSV, parseFile, importFile } = require('../controllers/productController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, adminOnly, getAdminProducts);
router.get('/:id', auth, adminOnly, getAdminProductById);
router.post('/', auth, adminOnly, upload.array('images', 10), createProduct);
router.put('/:id', auth, adminOnly, upload.array('images', 10), updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);
router.post('/import', auth, adminOnly, importProducts);
router.post('/parse-csv', auth, adminOnly, parseCSV);
router.post('/parse-file', auth, adminOnly, uploadFile.single('file'), parseFile);
router.post('/import-file', auth, adminOnly, uploadFile.single('file'), importFile);

module.exports = router;
