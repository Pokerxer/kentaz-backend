const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendEmail, getOrderEmailHtml, getAdminOrderEmailHtml } = require('../utils/email');

async function sendOrderEmails(order) {
  const user = await User.findById(order.user).select('name email');
  if (!user) return;

  const adminEmail = process.env.ADMIN_EMAIL;

  try {
    // Send to customer
    await sendEmail(
      user.email,
      `Order Confirmed - #${order._id}`,
      getOrderEmailHtml(order, user)
    );
  } catch (err) {
    console.error('Failed to send customer email:', err.message);
  }

  try {
    // Send to admin
    if (adminEmail) {
      await sendEmail(
        adminEmail,
        `New Order - ${order._id} - ₦${order.total}`,
        getAdminOrderEmailHtml(order, user)
      );
    }
  } catch (err) {
    console.error('Failed to send admin email:', err.message);
  }
}

// Read keys at call time so they're always current regardless of when server started
function getSecretKey() { return process.env.PAYSTACK_SECRET_KEY; }
function getWebhookSecret() { return process.env.PAYSTACK_WEBHOOK_SECRET; }

// ── Initialize transaction ──────────────────────────────────────
// POST /api/payments/initialize
// Body: { email, amount (in kobo), orderId, callbackUrl? }
exports.initializePayment = async (req, res) => {
  try {
    const { email, amount, orderId, callbackUrl } = req.body;
    if (!email || !amount || !orderId) {
      return res.status(400).json({ error: 'email, amount and orderId are required' });
    }

    const reference = `KTZ-${orderId}-${Date.now()}`;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount), // kobo (integer)
        reference,
        callback_url: callbackUrl,
        metadata: {
          orderId,
          custom_fields: [{ display_name: 'Order ID', variable_name: 'order_id', value: orderId }],
        },
      },
      { headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' } }
    );

    const { authorization_url, access_code } = response.data.data;

    // Save reference to order
    await Order.findByIdAndUpdate(orderId, { paystackRef: reference, paystackStatus: 'pending' });

    res.json({ authorizationUrl: authorization_url, accessCode: access_code, reference });
  } catch (err) {
    console.error('Paystack init error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || 'Payment initialization failed' });
  }
};

// ── Verify transaction ──────────────────────────────────────────
// POST /api/payments/verify
// Body: { reference }
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference is required' });

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${getSecretKey()}` } }
    );

    const txn = response.data.data;
    const order = await Order.findOne({ paystackRef: reference });

    if (order) {
      order.paystackStatus = txn.status;
      if (txn.status === 'success') {
        order.status = 'processing';
        await order.save();
        // Send order confirmation emails
        sendOrderEmails(order);
      } else {
        await order.save();
      }
    }

    res.json({ success: txn.status === 'success', status: txn.status, data: txn });
  } catch (err) {
    console.error('Paystack verify error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || 'Payment verification failed' });
  }
};

// ── Webhook ─────────────────────────────────────────────────────
// POST /api/payments/webhook
exports.handleWebhook = async (req, res) => {
  try {
    // Verify Paystack signature if secret is configured
    const secret = getWebhookSecret();
    if (secret && secret !== 'your-paystack-webhook-secret') {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Invalid signature');
      }
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const order = await Order.findOne({ paystackRef: data.reference });
      if (order && order.paystackStatus !== 'success') {
        order.paystackStatus = 'success';
        order.status = 'processing';
        await order.save();
        console.log(`Webhook: order ${order._id} → processing (${data.reference})`);
        // Send order confirmation emails
        sendOrderEmails(order);
      }
    }

    if (event === 'charge.failed') {
      const order = await Order.findOne({ paystackRef: data.reference });
      if (order) {
        order.paystackStatus = 'failed';
        await order.save();
      }
    }

    res.sendStatus(200); // Always 200 to prevent Paystack retries
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200);
  }
};
