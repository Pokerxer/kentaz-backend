const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendEmail, getOrderEmailHtml, getAdminOrderEmailHtml } = require('../utils/email');
const {
  createGatewayTransaction,
  verifyGatewayTransaction,
} = require('../services/payment.service');
const {
  fetchCharge,
  classifyChargeFailure,
  isChargePaid,
  amountLimitError,
} = require('../utils/korapay');

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
function getSecretKey() { return process.env.KORAPAY_SECRET_KEY; }

// ── Initialize transaction ──────────────────────────────────────
// POST /api/payments/initialize
// Body: { email, amount (in naira), orderId, callbackUrl? }
exports.initializePayment = async (req, res) => {
  try {
    const { email, amount, orderId, callbackUrl } = req.body;
    if (!email || !amount || !orderId) {
      return res.status(400).json({ error: 'email, amount and orderId are required' });
    }

    // Catch the merchant-account ceiling here so the shopper reads a sentence
    // instead of Korapay's AA021 wording.
    const limitError = amountLimitError(amount);
    if (limitError) return res.status(400).json({ error: limitError });

    // Force our own reference so the callback + verify echo the same value.
    const reference = `KTZ-${orderId}-${Date.now()}`;

    const charge = await createGatewayTransaction(
      amount,
      email,
      { orderId },
      { reference, callbackUrl }
    );

    // Save reference to order
    await Order.findByIdAndUpdate(orderId, { korapayRef: charge.reference, korapayStatus: 'pending' });

    res.json({ authorizationUrl: charge.authorizationUrl, reference: charge.reference });
  } catch (err) {
    console.error('Korapay init error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Payment initialization failed' });
  }
};

// ── Verify transaction ──────────────────────────────────────────
// POST /api/payments/verify
// Body: { reference }
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference is required' });

    const txn = await fetchCharge(reference);
    const status = txn.status; // 'success' | 'processing' | 'failed' | ...
    const paid = isChargePaid(txn);
    const order = await Order.findOne({ korapayRef: reference });

    if (order) {
      order.korapayStatus = status;
      // Only ever advance the order — never walk a confirmed payment backwards
      // because a later poll caught the charge mid-settlement.
      if (paid && order.status === 'pending') {
        order.status = 'processing';
        await order.save();
        sendOrderEmails(order).catch(err => console.error('Order email error (verify):', err.message));
      } else {
        await order.save();
      }
    }

    res.json({ success: paid, status, data: txn });
  } catch (err) {
    const failure = classifyChargeFailure(err);
    console.error('Korapay verify error:', failure.message);
    // An unreachable gateway is our problem, not a failed payment — 503 so the
    // caller can retry instead of telling a paying customer they failed.
    res.status(failure.definitive ? 400 : 503).json({
      error: failure.definitive
        ? failure.message || 'Payment verification failed'
        : 'Could not reach the payment provider. If you were debited, your order will be confirmed automatically.',
    });
  }
};

// ── Webhook ─────────────────────────────────────────────────────
// POST /api/payments/webhook
exports.handleWebhook = async (req, res) => {
  try {
    // Verify Korapay signature: HMAC SHA256 of the data object only, signed with the secret key
    const secret = getSecretKey();
    if (secret) {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body.data))
        .digest('hex');
      if (hash !== req.headers['x-korapay-signature']) {
        return res.status(401).send('Invalid signature');
      }
    }

    const { event, data } = req.body;
    // Korapay sends data.reference as the merchant reference (our reference)
    const ref = data.reference || data.payment_reference;

    if (event === 'charge.success') {
      // Match against orders
      const order = await Order.findOne({ korapayRef: ref });
      if (order && order.korapayStatus !== 'success') {
        order.korapayStatus = 'success';
        order.status = 'processing';
        await order.save();
        console.log(`Webhook: order ${order._id} → processing (${ref})`);
        sendOrderEmails(order).catch(err => console.error('Order email error (webhook):', err.message));
      }

      // Match against bookings
      const Booking = require('../models/Booking');
      const booking = await Booking.findOne({ korapayRef: ref });
      if (booking && booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        await booking.save();
        console.log(`Webhook: booking ${booking._id} → confirmed (${ref})`);
      }
    }

    if (event === 'charge.failed') {
      const order = await Order.findOne({ korapayRef: ref });
      if (order) {
        order.korapayStatus = 'failed';
        await order.save();
      }
    }

    res.sendStatus(200); // Always 200 to prevent Korapay retries
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200);
  }
};
