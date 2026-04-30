const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  getAllInventory,
  getInventoryByProduct,
  addInventory,
  adjustInventory,
  getInventoryStats,
  bulkUpdateStock,
  getLowStockProducts,
  getInventoryAnalytics,
  saveStockCount,
  getStockCountHistory,
  getStockCountById,
  getLastCounted,
} = require('../controllers/inventoryController');

router.get('/', auth, adminOnly, getAllInventory);
router.get('/stats', auth, adminOnly, getInventoryStats);
router.get('/analytics', auth, adminOnly, getInventoryAnalytics);
router.get('/low-stock', auth, adminOnly, getLowStockProducts);
router.get('/last-counted', auth, adminOnly, getLastCounted);
router.get('/stock-count', auth, adminOnly, getStockCountHistory);
router.post('/stock-count', auth, adminOnly, saveStockCount);
router.get('/stock-count/:id', auth, adminOnly, getStockCountById);
router.get('/product/:productId', auth, adminOnly, getInventoryByProduct);
router.post('/', auth, adminOnly, addInventory);
router.post('/adjust', auth, adminOnly, adjustInventory);
router.post('/bulk', auth, adminOnly, bulkUpdateStock);

module.exports = router;
