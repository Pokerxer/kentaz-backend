const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment, handleWebhook } = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Initialize payment — returns Korapay authorizationUrl
router.post('/initialize', auth, initializePayment);

// Verify payment after redirect
router.post('/verify', auth, verifyPayment);

// Webhook — called by Korapay directly (no auth)
router.post('/webhook', handleWebhook);

module.exports = router;
