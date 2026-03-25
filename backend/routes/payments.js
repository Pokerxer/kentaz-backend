const express = require('express');
const router = express.Router();
const { verifyPayment, handleWebhook } = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Verify payment (frontend initiated)
router.post('/verify', auth, verifyPayment);

// Webhook endpoint (Paystack initiated)
router.post('/webhook', handleWebhook);

module.exports = router;