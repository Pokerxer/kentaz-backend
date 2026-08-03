const axios = require('axios');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Discount = require('../models/Discount');
const { quoteCart } = require('../utils/pricing');
const { sendEmail, getOrderStatusEmailHtml, getOrderEmailHtml, getAdminOrderEmailHtml } = require('../utils/email');

/** Underpayment below this many naira is rounding noise, not tampering. */
const PAYMENT_TOLERANCE = 1;

/**
 * Build the priced cart for a request, reading every price from the database.
 * The client tells us WHAT it wants (product, variant, quantity) and we decide
 * what it costs — a `price` or `total` in the request body is ignored.
 */
async function quoteFromRequest({ items, discountCode, deliveryMethod, userId }) {
  const ids = [...new Set((items || []).map((i) => i.product).filter(Boolean))];
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const item of items || []) {
    const product = byId.get(String(item.product));
    if (!product) continue; // deleted mid-checkout — drop it rather than guess a price
    lines.push({ product, variant: item.variant, quantity: item.quantity });
  }

  const discounts = await Discount.find({ isActive: true });

  // How many times this customer has already redeemed the code they entered.
  let customerUses = 0;
  if (discountCode && userId) {
    customerUses = await Order.countDocuments({
      user: userId,
      'discount.code': String(discountCode).toUpperCase().trim(),
      status: { $ne: 'cancelled' },
    });
  }

  return quoteCart({ lines, discounts, code: discountCode, deliveryMethod, customerUses });
}

exports.quoteFromRequest = quoteFromRequest;

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, korapayRef, discountCode, deliveryMethod } = req.body;

    if (!korapayRef) {
      return res.status(400).json({ error: 'Payment reference is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Prevent duplicate orders for the same payment reference. Checked before
    // the catalogue lookup so a retry is cheap and returns the original order.
    const existing = await Order.findOne({ korapayRef });
    if (existing) {
      return res.status(200).json(existing);
    }

    // Price the cart from the catalogue. Anything the client said about money
    // is discarded here — this is the only figure we charge against.
    const quote = await quoteFromRequest({
      items,
      discountCode,
      deliveryMethod: deliveryMethod || (shippingAddress && shippingAddress.deliveryMethod),
      userId: req.user.id,
    });

    if (quote.items.length === 0) {
      return res.status(400).json({ error: 'None of the items in this order are still available' });
    }

    // Verify payment server-side before creating the order
    const secretKey = process.env.KORAPAY_SECRET_KEY;
    let korapayStatus = 'pending';
    let paidAmount = null;
    try {
      const txnRes = await axios.get(
        `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(korapayRef)}`,
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      const txn = txnRes.data.data;
      korapayStatus = txn.status; // 'success' | 'failed' | ...
      paidAmount = Number(txn.amount);

      if (txn.status !== 'success') {
        return res.status(402).json({ error: 'Payment not confirmed. Please complete payment before placing the order.' });
      }
    } catch (verifyErr) {
      // If Korapay is unreachable (e.g. dev environment), warn but allow order through
      console.warn('[createOrder] Korapay verify failed — proceeding with pending status:', verifyErr.message);
    }

    // The customer paid whatever the browser asked Korapay for. If that is less
    // than the price we just computed, the client-side total was wrong or was
    // tampered with. Hold the order for review rather than ship underpaid goods
    // — but never discard a payment that was actually captured.
    let paymentMismatch = null;
    if (Number.isFinite(paidAmount) && paidAmount < quote.total - PAYMENT_TOLERANCE) {
      paymentMismatch = { expected: quote.total, paid: paidAmount, at: new Date() };
      console.warn(
        `[createOrder] payment mismatch on ${korapayRef}: paid ₦${paidAmount}, expected ₦${quote.total}`
      );
    }

    const order = new Order({
      user: req.user.id,
      items: quote.items.map((i) => ({
        product: i.product,
        name: i.name,
        price: i.unitPrice,
        originalUnitPrice: i.originalUnitPrice,
        lineTotal: i.lineTotal,
        appliedDiscount: i.appliedDiscount
          ? {
              discount: i.appliedDiscount._id || undefined,
              code: i.appliedDiscount.code || undefined,
              source: i.appliedDiscount.source,
            }
          : undefined,
        quantity: i.quantity,
        variant: i.variant || undefined,
      })),
      shippingAddress,
      subtotal: quote.subtotal,
      itemDiscountTotal: quote.itemDiscountTotal,
      discount: quote.discount
        ? { discount: quote.discount._id, code: quote.discount.code, amount: quote.discount.amount }
        : undefined,
      shippingCost: quote.shipping,
      tax: quote.tax,
      deliveryMethod: quote.deliveryMethod,
      total: quote.total,
      korapayRef,
      korapayStatus,
      paymentMismatch: paymentMismatch || undefined,
      status: korapayStatus === 'success' && !paymentMismatch ? 'processing' : 'pending',
    });
    await order.save();

    // Record the redemption. The filter re-checks the limit so two orders
    // racing for the last remaining use cannot both take it.
    if (quote.discount) {
      await Discount.findOneAndUpdate(
        {
          _id: quote.discount._id,
          $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }],
        },
        { $inc: { usageCount: 1 } }
      );
    }

    // Send confirmation emails for verified payments
    if (korapayStatus === 'success') {
      const user = await User.findById(req.user.id).select('name email');
      const adminEmail = process.env.ADMIN_EMAIL;
      if (user) {
        sendEmail(user.email, `Order Confirmed — #${order._id}`, getOrderEmailHtml(order, user))
          .catch(err => console.error('Order confirm email error:', err.message));
        if (adminEmail) {
          sendEmail(adminEmail, `New Order — ${order._id} — ₦${order.total}`, getAdminOrderEmailHtml(order, user))
            .catch(err => console.error('Admin order email error:', err.message));
        }
      }
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user.id };

    const order = await Order.findOne(filter)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images slug category');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const User = require('../models/User');
      const users = await User.find({
        $or: [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const userIds = users.map(u => u._id);
      const orClauses = [{ user: { $in: userIds } }];
      if (/^[a-f\d]{24}$/i.test(search)) orClauses.push({ _id: search });
      filter.$or = orClauses;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total, statusCounts] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]),
    ]);

    const statusMap = {};
    let totalRevenue = 0;
    for (const s of statusCounts) {
      statusMap[s._id] = { count: s.count, revenue: s.revenue };
      if (s._id !== 'cancelled') totalRevenue += s.revenue;
    }

    res.json({ orders, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), statusCounts: statusMap, totalRevenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images slug category');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Notify customer on meaningful status changes
    const notifyStatuses = ['shipped', 'delivered', 'cancelled'];
    if (notifyStatuses.includes(status) && order.user?.email) {
      sendEmail(
        order.user.email,
        `Your Kentaz order is ${status.charAt(0).toUpperCase() + status.slice(1)} — #${order._id}`,
        getOrderStatusEmailHtml(order, order.user)
      ).catch(err => console.error('Status email error:', err.message));
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
