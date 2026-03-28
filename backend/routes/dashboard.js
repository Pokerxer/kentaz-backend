const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Booking = require('../models/Booking');
const Inventory = require('../models/Inventory');

router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const now = new Date();

    // ── Time windows ─────────────────────────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd   = new Date(todayEnd);   yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const sevenDaysAgo = new Date(todayStart); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // ── Parallel queries ──────────────────────────────────────────
    const [
      // Counts
      totalCustomers,
      newCustomersThisMonth,
      totalProducts,
      totalOrders,

      // Orders: current month
      ordersThisMonth,
      ordersLastMonth,

      // Orders: today
      ordersToday,
      ordersYesterday,

      // Orders: status breakdown
      ordersByStatus,

      // Recent orders
      recentOrders,

      // POS: current month
      posSalesThisMonth,
      posSalesLastMonth,

      // POS: today
      posSalesToday,

      // Recent POS sales
      recentPosSales,

      // 7-day daily trend
      ordersTrend,
      posTrend,

      // Low stock
      lowStockProducts,

      // Bookings today
      bookingsToday,
      bookingsPending,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: monthStart } }),
      Product.countDocuments(),
      Order.countDocuments(),

      // Orders this month
      Order.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Orders today
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Orders by status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Recent orders (last 8)
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      // POS this month
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // POS today
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Recent POS sales (last 6)
      Sale.find({ type: 'sale', status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      // 7-day order trend
      Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // 7-day POS trend
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Low stock (top 8 variants, stock > 0 and <= 10)
      Product.aggregate([
        { $unwind: { path: '$variants', includeArrayIndex: 'variantIndex' } },
        { $match: { 'variants.stock': { $gt: 0, $lte: 10 } } },
        { $project: { name: 1, category: 1, images: 1, variantIndex: 1, variant: '$variants' } },
        { $sort: { 'variant.stock': 1 } },
        { $limit: 8 },
      ]),

      // Bookings today
      Booking.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } }),
      Booking.countDocuments({ status: 'pending' }),
    ]);

    // ── Helper: safe value from agg ────────────────────────────
    const agg = (arr, key = 'revenue') => arr[0]?.[key] || 0;
    const pctChange = (curr, prev) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // ── Revenue calculations ────────────────────────────────────
    const orderRevThisMonth = agg(ordersThisMonth);
    const orderRevLastMonth = agg(ordersLastMonth);
    const posRevThisMonth   = agg(posSalesThisMonth);
    const posRevLastMonth   = agg(posSalesLastMonth);
    const totalRevThisMonth = orderRevThisMonth + posRevThisMonth;
    const totalRevLastMonth = orderRevLastMonth + posRevLastMonth;

    const orderRevToday   = agg(ordersToday);
    const posRevToday     = agg(posSalesToday);
    const totalRevToday   = orderRevToday + posRevToday;
    const orderRevYest    = agg(ordersYesterday);

    const orderCountThisMonth = agg(ordersThisMonth, 'count');
    const orderCountLastMonth = agg(ordersLastMonth, 'count');
    const posCountThisMonth   = agg(posSalesThisMonth, 'count');
    const posCountLastMonth   = agg(posSalesLastMonth, 'count');
    const totalCountThisMonth = orderCountThisMonth + posCountThisMonth;
    const totalCountLastMonth = orderCountLastMonth + posCountLastMonth;

    const orderCountToday   = agg(ordersToday, 'count');
    const posCountToday     = agg(posSalesToday, 'count');
    const orderCountYest    = agg(ordersYesterday, 'count');

    // ── Order status map ────────────────────────────────────────
    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const s of ordersByStatus) statusMap[s._id] = s.count;

    // ── Build 7-day trend (fill missing days) ──────────────────
    const days7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' });
      const ord = ordersTrend.find(x => x._id === key);
      const pos = posTrend.find(x => x._id === key);
      days7.push({
        date:        key,
        label,
        orderRev:    ord?.revenue || 0,
        posRev:      pos?.revenue || 0,
        totalRev:    (ord?.revenue || 0) + (pos?.revenue || 0),
        orderCount:  ord?.count || 0,
        posCount:    pos?.count || 0,
      });
    }

    res.json({
      // KPIs
      revenue: {
        today:         totalRevToday,
        todayOrders:   orderRevToday,
        todayPos:      posRevToday,
        thisMonth:     totalRevThisMonth,
        thisMonthOrders: orderRevThisMonth,
        thisMonthPos:  posRevThisMonth,
        vsLastMonth:   pctChange(totalRevThisMonth, totalRevLastMonth),
        vsYesterday:   pctChange(totalRevToday, orderRevYest),
      },
      orders: {
        today:         orderCountToday + posCountToday,
        todayOrders:   orderCountToday,
        todayPos:      posCountToday,
        thisMonth:     totalCountThisMonth,
        vsLastMonth:   pctChange(totalCountThisMonth, totalCountLastMonth),
        vsYesterday:   pctChange(orderCountToday, orderCountYest),
        statusBreakdown: statusMap,
        total:         totalOrders,
      },
      customers: {
        total:         totalCustomers,
        newThisMonth:  newCustomersThisMonth,
      },
      products: {
        total: totalProducts,
      },
      avgOrderValue: totalCountThisMonth > 0
        ? Math.round(totalRevThisMonth / totalCountThisMonth)
        : 0,

      // Lists
      recentOrders,
      recentPosSales,
      lowStock: lowStockProducts,
      trend: days7,

      // Bookings
      bookings: {
        today:   bookingsToday,
        pending: bookingsPending,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
