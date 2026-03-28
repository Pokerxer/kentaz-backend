const express = require('express');
const router = express.Router();
const { auth, posAccess, adminOnly } = require('../middleware/auth');
const {
  posLogin,
  getPosProducts,
  createSale,
  getSales,
  getSalesSummary,
  getSaleById,
  voidSale,
  refundSaleItems,
  openRegister,
  getCurrentRegister,
  getRegisterSessions,
  recordCashMovement,
  getRegisterReport,
  closeRegister,
  getProductSalesStats,
} = require('../controllers/posController');

// Public POS login
router.post('/login', posLogin);

// POS operations (staff or admin)
router.get('/products', auth, posAccess, getPosProducts);
router.post('/sales', auth, posAccess, createSale);
router.get('/sales/summary', auth, posAccess, getSalesSummary);
router.get('/sales', auth, posAccess, getSales);
router.get('/sales/:id', auth, posAccess, getSaleById);
router.post('/sales/:id/void', auth, posAccess, voidSale);
router.post('/sales/:id/refund', auth, posAccess, refundSaleItems);

// Register / Session
router.post('/register/open', auth, posAccess, openRegister);
router.get('/register/current', auth, posAccess, getCurrentRegister);
router.get('/register/sessions', auth, posAccess, getRegisterSessions);
router.post('/register/cash', auth, posAccess, recordCashMovement);
router.get('/register/:id/report', auth, posAccess, getRegisterReport);
router.post('/register/close', auth, posAccess, closeRegister);

// Admin-only: all POS sales with full filters (uses same getSales — cashierId filter handled there)
router.get('/admin/sales', auth, adminOnly, getSales);
router.get('/admin/summary', auth, adminOnly, getSalesSummary);
router.get('/admin/products/:id/sales-stats', auth, adminOnly, getProductSalesStats);

module.exports = router;
