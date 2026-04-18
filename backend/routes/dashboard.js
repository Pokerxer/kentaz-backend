const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Booking = require('../models/Booking');

router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const now = new Date();
    now.setUTCHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let currentStart, currentEnd, prevStart, prevEnd, trendDays;

    if (period === '30d') {
      currentStart = new Date(todayStart); currentStart.setUTCDate(todayStart.getUTCDate() - 29);
      currentEnd = new Date(now);
      prevEnd = new Date(currentStart); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setUTCDate(prevEnd.getUTCDate() - 29);
      prevStart.setUTCHours(0, 0, 0, 0);
      trendDays = 30;
    } else if (period === '90d') {
      currentStart = new Date(todayStart); currentStart.setUTCDate(todayStart.getUTCDate() - 89);
      currentEnd = new Date(now);
      prevEnd = new Date(currentStart); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setUTCDate(prevEnd.getUTCDate() - 89);
      prevStart.setUTCHours(0, 0, 0, 0);
      trendDays = 90;
    } else {
      // 7d default
      currentStart = new Date(todayStart); currentStart.setUTCDate(todayStart.getUTCDate() - 6);
      currentEnd = new Date(now);
      prevEnd = new Date(currentStart); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setUTCDate(prevEnd.getUTCDate() - 6);
      prevStart.setUTCHours(0, 0, 0, 0);
      trendDays = 7;
    }

    const periodLabel = period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days';

    // ── Parallel queries ───────────────────────────────────────────
    const [
      totalCustomers,
      newCustomersCurrent,
      newCustomersPrevious,
      totalProducts,
      totalOrders,

      // Orders: current + previous (all statuses — for count)
      ordersCurrent,
      ordersPrevious,

      // Orders: current + previous (non-cancelled — for revenue)
      orderRevCurrent,
      orderRevPrevious,

      // Orders by status (all-time pipeline)
      ordersByStatus,

      // Recent orders
      recentOrders,

      // POS: current + previous
      posSalesCurrent,
      posSalesPrevious,

      // Recent POS sales
      recentPosSales,

      // Daily trend arrays
      ordersTrend,
      posTrend,

      // Category revenue breakdown (POS, current period)
      posCategoryRevenue,

      // Category revenue breakdown (online orders, current period)
      orderCategoryRevenue,

      // Low stock (top 8 variants, stock 1–10)
      lowStockProducts,

      // Bookings
      bookingsToday,
      bookingsPending,
    ] = await Promise.all([

      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: currentStart, $lte: currentEnd } }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: prevStart, $lte: prevEnd } }),
      Product.countDocuments(),
      Order.countDocuments(),

      // Orders current (all statuses — count only)
      Order.aggregate([
        { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      // Orders previous (all statuses — count only)
      Order.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),

      // Orders current (non-cancelled — revenue + count)
      Order.aggregate([
        { $match: { createdAt: { $gte: currentStart, $lte: currentEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      // Orders previous (non-cancelled — revenue + count)
      Order.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Orders by status (all-time)
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Recent orders (last 8)
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      // POS current period
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      // POS previous period
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Recent POS sales (last 6)
      Sale.find({ type: 'sale', status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      // Order trend (daily)
      Order.aggregate([
        { $match: { createdAt: { $gte: currentStart, $lte: currentEnd }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // POS trend (daily)
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: currentStart, $lte: currentEnd } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // POS revenue by product (category resolved in JS below)
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', revenue: { $sum: '$items.total' } } },
      ]),

      // Online order revenue by product (category resolved in JS below)
      Order.aggregate([
        { $match: { createdAt: { $gte: currentStart, $lte: currentEnd }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.product',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        }},
      ]),

      // Low stock (top 8 variants with stock 1–10)
      Product.aggregate([
        { $unwind: { path: '$variants', includeArrayIndex: 'variantIndex' } },
        { $match: { 'variants.stock': { $gt: 0, $lte: 10 } } },
        { $project: { name: 1, category: 1, images: 1, variantIndex: 1, variant: '$variants' } },
        { $sort: { 'variant.stock': 1 } },
        { $limit: 8 },
      ]),

      Booking.countDocuments({ createdAt: { $gte: currentStart, $lte: currentEnd } }),
      Booking.countDocuments({ status: 'pending' }),
    ]);

    // ── Helper functions ────────────────────────────────────────────
    const agg = (arr, key = 'revenue') => arr[0]?.[key] || 0;
    const pctChange = (curr, prev) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // ── Revenue calculations ────────────────────────────────────────
    const orderCountCurrent  = agg(ordersCurrent, 'count');
    const orderCountPrevious = agg(ordersPrevious, 'count');

    const onlineRevCurrent  = agg(orderRevCurrent, 'revenue');
    const onlineRevPrevious = agg(orderRevPrevious, 'revenue');
    const onlineCountCurrent  = agg(orderRevCurrent, 'count');
    const onlineCountPrevious = agg(orderRevPrevious, 'count');

    const posRevCurrent   = agg(posSalesCurrent, 'revenue');
    const posRevPrevious  = agg(posSalesPrevious, 'revenue');
    const posCountCurrent  = agg(posSalesCurrent, 'count');
    const posCountPrevious = agg(posSalesPrevious, 'count');

    const totalRevCurrent  = onlineRevCurrent + posRevCurrent;
    const totalRevPrevious = onlineRevPrevious + posRevPrevious;

    // Total transaction count (online non-cancelled + POS completed)
    const totalCountCurrent  = onlineCountCurrent + posCountCurrent;
    const totalCountPrevious = onlineCountPrevious + posCountPrevious;

    // Avg order value
    const avgOrderValue         = totalCountCurrent  > 0 ? Math.round(totalRevCurrent  / totalCountCurrent)  : 0;
    const avgOrderValuePrevious = totalCountPrevious > 0 ? Math.round(totalRevPrevious / totalCountPrevious) : 0;

    // ── Order status map ────────────────────────────────────────────
    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const s of ordersByStatus) {
      if (s._id in statusMap) statusMap[s._id] = s.count;
    }

    // ── Resolve categories via Product.find (same as inventoryController) ──
    const allCatRows = [...posCategoryRevenue, ...orderCategoryRevenue].filter(r => r._id != null);
    const catIds = [...new Set(allCatRows.map(r => String(r._id)))];
    const catProds = await Product.find({ _id: { $in: catIds } }).select('category').lean();
    const catLookup = Object.fromEntries(catProds.map(p => [String(p._id), p.category || 'Uncategorised']));

    const categoryMap = {};
    for (const row of allCatRows) {
      const key = catLookup[String(row._id)] || 'Uncategorised';
      categoryMap[key] = (categoryMap[key] || 0) + row.revenue;
    }
    const categoryRevenue = Object.entries(categoryMap)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // ── Build daily trend (fill missing days) ──────────────────────
    const trend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(todayStart.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
      const ord = ordersTrend.find(x => x._id === key);
      const pos = posTrend.find(x => x._id === key);
      trend.push({
        date: key,
        label,
        orderRev:   ord?.revenue || 0,
        posRev:     pos?.revenue || 0,
        totalRev:   (ord?.revenue || 0) + (pos?.revenue || 0),
        orderCount: ord?.count   || 0,
        posCount:   pos?.count   || 0,
      });
    }

    res.json({
      period,
      periodLabel,

      revenue: {
        currentPeriod:       totalRevCurrent,
        currentPeriodOrders: onlineRevCurrent,
        currentPeriodPos:    posRevCurrent,
        previousPeriod:      totalRevPrevious,
        previousPeriodOrders: onlineRevPrevious,
        previousPeriodPos:   posRevPrevious,
        vsPrevious:          pctChange(totalRevCurrent, totalRevPrevious),
      },

      orders: {
        currentPeriod:        totalCountCurrent,
        currentPeriodOrders:  onlineCountCurrent,
        currentPeriodPos:     posCountCurrent,
        previousPeriod:       totalCountPrevious,
        previousPeriodOrders: onlineCountPrevious,
        previousPeriodPos:    posCountPrevious,
        vsPrevious:           pctChange(totalCountCurrent, totalCountPrevious),
        statusBreakdown:      statusMap,
        total:                totalOrders,
        // Raw online order count (all statuses) for display
        allStatusCurrent:     orderCountCurrent,
        allStatusPrevious:    orderCountPrevious,
      },

      customers: {
        total:           totalCustomers,
        newThisPeriod:   newCustomersCurrent,
        newPrevPeriod:   newCustomersPrevious,
        vsPrevious:      pctChange(newCustomersCurrent, newCustomersPrevious),
      },

      products: { total: totalProducts },

      avgOrderValue,
      avgOrderValuePrevious,
      avgOrderValueVsPrevious: pctChange(avgOrderValue, avgOrderValuePrevious),

      categoryRevenue,
      recentOrders,
      recentPosSales,
      lowStock: lowStockProducts,
      trend,

      bookings: {
        today:   bookingsToday,
        pending: bookingsPending,
      },
    });
  } catch (err) {
    console.error('[dashboard/stats]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
