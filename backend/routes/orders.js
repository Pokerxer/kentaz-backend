const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrder, getAdminOrders, updateOrderStatus } = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', auth, createOrder);
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrder);
router.put('/:id/status', auth, adminOnly, updateOrderStatus);

router.get('/admin/all', auth, adminOnly, getAdminOrders);

module.exports = router;
