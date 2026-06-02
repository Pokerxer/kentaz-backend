const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrder, getAdminOrders, updateOrderStatus } = require('../controllers/orderController');
const { auth, adminOnly, staffOrAdmin } = require('../middleware/auth');

router.post('/', auth, createOrder);
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrder);
router.put('/:id/status', auth, staffOrAdmin, updateOrderStatus);

router.get('/admin/all', auth, staffOrAdmin, getAdminOrders);

module.exports = router;
