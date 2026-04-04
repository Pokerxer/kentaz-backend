const express = require('express');
const router = express.Router();
const { auth, posAccess, adminOnly } = require('../middleware/auth');
const {
  searchReceipts,
  getReceipt,
  sendReceipt,
  getReceiptPrint,
} = require('../controllers/receiptController');

// Public or authenticated
router.get('/search', auth, posAccess, searchReceipts);
router.get('/:id', auth, posAccess, getReceipt);
router.post('/:id/send', auth, posAccess, sendReceipt);
router.get('/:id/print', auth, posAccess, getReceiptPrint);

module.exports = router;