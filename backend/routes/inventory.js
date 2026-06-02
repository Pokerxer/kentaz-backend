const express = require('express');
const router = express.Router();
const { auth, adminOnly, adminOrStaff } = require('../middleware/auth');
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

router.get('/', auth, adminOrStaff('/inventory'), getAllInventory);
router.get('/stats', auth, adminOrStaff('/inventory'), getInventoryStats);
router.get('/analytics', auth, adminOrStaff('/inventory'), getInventoryAnalytics);
router.get('/low-stock', auth, adminOrStaff('/inventory'), getLowStockProducts);
router.get('/last-counted', auth, adminOrStaff('/inventory'), getLastCounted);
router.get('/stock-count', auth, adminOrStaff('/inventory'), getStockCountHistory);
router.post('/stock-count', auth, adminOrStaff('/inventory'), saveStockCount);
router.get('/stock-count/:id', auth, adminOrStaff('/inventory'), getStockCountById);
router.get('/product/:productId', auth, adminOrStaff('/inventory'), getInventoryByProduct);
router.post('/', auth, adminOnly, addInventory);
router.post('/adjust', auth, adminOnly, adjustInventory);
router.post('/bulk', auth, adminOnly, bulkUpdateStock);

module.exports = router;
