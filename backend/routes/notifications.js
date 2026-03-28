const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const Booking = require('../models/Booking');

// ── Helpers ──────────────────────────────────────────────────────

function shortId(id) {
  return id.toString().slice(-6).toUpperCase();
}

function fmtAmount(n) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Sync: generate notifications from live data ──────────────────

async function syncNotifications() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentOrders, recentCustomers, pendingBookings, lowStockProducts] = await Promise.all([
    Order.find({ createdAt: { $gte: thirtyDaysAgo } })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),

    User.find({ role: 'customer', createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),

    Booking.find({ status: 'pending' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),

    Product.aggregate([
      { $unwind: { path: '$variants', includeArrayIndex: 'variantIndex' } },
      { $match: { 'variants.stock': { $lte: 5 } } },
      { $project: { name: 1, images: 1, variantIndex: 1, variant: '$variants' } },
      { $sort: { 'variant.stock': 1 } },
      { $limit: 40 },
    ]),
  ]);

  const ops = [];

  // ── Order notifications ────────────────────────────────────────
  for (const order of recentOrders) {
    const customerName = order.user?.name || 'A customer';
    ops.push({
      updateOne: {
        filter: { ref: `order_${order._id}` },
        update: {
          $setOnInsert: {
            ref: `order_${order._id}`,
            type: 'order',
            title: 'New Order',
            message: `${customerName} placed order #${shortId(order._id)} for ${fmtAmount(order.total)}`,
            link: '/orders',
            isRead: false,
            metadata: { orderId: order._id, total: order.total, status: order.status },
            createdAt: order.createdAt,
          },
        },
        upsert: true,
      },
    });
  }

  // ── Customer notifications ─────────────────────────────────────
  for (const customer of recentCustomers) {
    ops.push({
      updateOne: {
        filter: { ref: `customer_${customer._id}` },
        update: {
          $setOnInsert: {
            ref: `customer_${customer._id}`,
            type: 'customer',
            title: 'New Customer',
            message: `${customer.name} (${customer.email}) just signed up`,
            link: '/customers',
            isRead: false,
            metadata: { userId: customer._id, email: customer.email },
            createdAt: customer.createdAt,
          },
        },
        upsert: true,
      },
    });
  }

  // ── Booking notifications ──────────────────────────────────────
  for (const booking of pendingBookings) {
    const customerName = booking.user?.name || 'A customer';
    ops.push({
      updateOne: {
        filter: { ref: `booking_${booking._id}` },
        update: {
          $setOnInsert: {
            ref: `booking_${booking._id}`,
            type: 'booking',
            title: 'Pending Booking',
            message: `${customerName} booked a ${booking.serviceType} session on ${fmtDate(booking.date)}`,
            link: '/bookings',
            isRead: false,
            metadata: { bookingId: booking._id, serviceType: booking.serviceType },
            createdAt: booking.createdAt,
          },
        },
        upsert: true,
      },
    });
  }

  // ── Stock notifications — upsert with updated message ──────────
  const activeLowStockRefs = [];
  for (const p of lowStockProducts) {
    const ref = `stock_${p._id}_${p.variantIndex}`;
    activeLowStockRefs.push(ref);
    const isOut = p.variant.stock === 0;
    const variantLabel = [p.variant.size, p.variant.color].filter(Boolean).join(' / ');
    const productLabel = variantLabel ? `${p.name} (${variantLabel})` : p.name;

    ops.push({
      updateOne: {
        filter: { ref },
        update: {
          $set: {
            type: isOut ? 'out_of_stock' : 'low_stock',
            title: isOut ? 'Out of Stock' : 'Low Stock',
            message: isOut
              ? `${productLabel} is out of stock`
              : `${productLabel} has only ${p.variant.stock} unit${p.variant.stock === 1 ? '' : 's'} left`,
            link: '/products',
            metadata: { productId: p._id, variantIndex: p.variantIndex, stock: p.variant.stock },
          },
          $setOnInsert: {
            ref,
            isRead: false,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  // Remove stale stock notifications (product now back in stock)
  const staleCleanup = [];
  staleCleanup.push(
    Notification.deleteMany({
      type: { $in: ['low_stock', 'out_of_stock'] },
      ref: { $nin: activeLowStockRefs },
    })
  );

  // Remove booking notifications for bookings no longer pending
  const pendingBookingRefs = pendingBookings.map(b => `booking_${b._id}`);
  staleCleanup.push(
    Notification.deleteMany({
      type: 'booking',
      ref: { $nin: pendingBookingRefs },
    })
  );

  await Promise.all([
    ops.length > 0 ? Notification.bulkWrite(ops, { ordered: false }) : Promise.resolve(),
    ...staleCleanup,
  ]);
}

// ── GET /api/admin/notifications ────────────────────────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    await syncNotifications();
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/notifications/unread-count ────────────────────
router.get('/unread-count', auth, adminOnly, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/admin/notifications/read-all ──────────────────────
router.patch('/read-all', auth, adminOnly, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/admin/notifications/:id/read ──────────────────────
router.patch('/:id/read', auth, adminOnly, async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json(n);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/notifications/clear-read ───────────────────
router.delete('/clear-read', auth, adminOnly, async (req, res) => {
  try {
    const { deletedCount } = await Notification.deleteMany({ isRead: true });
    res.json({ message: `${deletedCount} notification${deletedCount !== 1 ? 's' : ''} cleared` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/notifications/:id ──────────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const n = await Notification.findByIdAndDelete(req.params.id);
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
