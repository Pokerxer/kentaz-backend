const axios = require('axios');
const Order = require('../models/Order');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    
    // Verify transaction with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const { status, data } = response.data;
    
    if (status && data.status === 'success') {
      // Update order with payment success
      const order = await Order.findOne({ paystackRef: reference });
      if (order) {
        order.paystackStatus = 'success';
        order.status = 'processing';
        await order.save();
      }
      
      return res.json({ success: true, data: response.data });
    }
    
    // Payment not successful
    const order = await Order.findOne({ paystackRef: reference });
    if (order) {
      order.paystackStatus = 'failed';
      await order.save();
    }
    
    res.json({ success: false, message: 'Payment verification failed' });
  } catch (err) {
    console.error('Paystack verification error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    // Simplified webhook handler - just acknowledge receipt
    const event = req.body.event;
    const data = req.body.data;
    
    // Handle payment success
    if (event === 'charge.success') {
      const order = await Order.findOne({ paystackRef: data.reference });
      if (order) {
        order.paystackStatus = 'success';
        order.status = 'processing';
        await order.save();
      }
    }
    
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};