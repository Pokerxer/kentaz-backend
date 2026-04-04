const express = require('express');
const router = express.Router();
const { auth, posAccess, adminOnly } = require('../middleware/auth');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  lookupByPhone,
  redeemPoints,
  getPurchaseHistory,
} = require('../controllers/customerController');

// All routes require auth (POS or admin)
router.get('/', auth, posAccess, getCustomers);
router.get('/lookup/:phone', auth, posAccess, lookupByPhone);
router.get('/:id', auth, posAccess, getCustomer);
router.get('/:id/history', auth, posAccess, getPurchaseHistory);
router.post('/', auth, posAccess, createCustomer);
router.put('/:id', auth, posAccess, updateCustomer);
router.delete('/:id', auth, adminOnly, deleteCustomer);
router.post('/:id/points/redeem', auth, posAccess, redeemPoints);

module.exports = router;