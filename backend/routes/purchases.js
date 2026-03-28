const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  receivePurchase,
  cancelPurchase,
  returnPurchase,
  getPurchaseStats,
} = require('../controllers/purchaseController');

router.get('/', auth, adminOnly, getAllPurchases);
router.get('/stats', auth, adminOnly, getPurchaseStats);
router.get('/:id', auth, adminOnly, getPurchaseById);
router.post('/', auth, adminOnly, createPurchase);
router.post('/:id/receive', auth, adminOnly, receivePurchase);
router.post('/:id/cancel', auth, adminOnly, cancelPurchase);
router.post('/:id/return', auth, adminOnly, returnPurchase);

module.exports = router;
