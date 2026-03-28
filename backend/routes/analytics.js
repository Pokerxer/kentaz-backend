const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const User = require('../models/User');

// ── GET /api/admin/analytics?period=7d|30d|90d|12m ──────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start, prevStart, prevEnd, dateFormat;

    if (period === '7d') {
      start = new Date(todayStart); start.setDate(todayStart.getDate() - 6);
      prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 6); prevStart.setHours(0, 0, 0, 0);
      dateFormat = '%Y-%m-%d';
    } else if (period === '30d') {
      start = new Date(todayStart); start.setDate(todayStart.getDate() - 29);
      prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 29); prevStart.setHours(0, 0, 0, 0);
      dateFormat = '%Y-%m-%d';
    } else if (period === '90d') {
      start = new Date(todayStart); start.setDate(todayStart.getDate() - 89);
      prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 89); prevStart.setHours(0, 0, 0, 0);
      dateFormat = '%Y-%m-%d';
    } else { // 12m
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth() - 11, 1);
      dateFormat = '%Y-%m';
    }

    const bucketExpr = { $dateToString: { format: dateFormat, date: '$createdAt' } };

    const [
      orderTrend, posTrend,
      orderTotal, posTotal,
      prevOrderTotal, prevPosTotal,
      newCustomers, prevNewCustomers,
      orderStatusBreakdown,
      paymentMethods,
      topPosProducts,
      topOrderProducts,
      topCategories,
    ] = await Promise.all([
      // Order trend
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now }, status: { $ne: 'cancelled' } } },
        { $group: { _id: bucketExpr, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // POS trend
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: bucketExpr, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Current totals
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      // Previous period totals
      Order.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      // New customers
      User.countDocuments({ role: 'customer', createdAt: { $gte: start, $lte: now } }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: prevStart, $lte: prevEnd } }),
      // Order status breakdown
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Payment methods (POS)
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: '$paymentMethod', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      // Top products by POS
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          revenue: { $sum: '$items.total' },
          qty: { $sum: '$items.quantity' },
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'pd' } },
        { $unwind: { path: '$pd', preserveNullAndEmptyArrays: true } },
        { $project: { name: 1, revenue: 1, qty: 1, image: { $arrayElemAt: ['$pd.images.url', 0] } } },
      ]),
      // Top products by online orders
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          qty: { $sum: '$items.quantity' },
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'pd' } },
        { $unwind: { path: '$pd', preserveNullAndEmptyArrays: true } },
        { $project: { name: 1, revenue: 1, qty: 1, image: { $arrayElemAt: ['$pd.images.url', 0] } } },
      ]),
      // Top categories (from POS)
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
        { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$prod.category', revenue: { $sum: '$items.total' }, qty: { $sum: '$items.quantity' } } },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
        { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$cat.name', 'Uncategorized'] }, revenue: 1, qty: 1 } },
      ]),
    ]);

    // ── Build trend buckets (fill gaps) ────────────────────────────
    const buckets = generateBuckets(period, todayStart);
    const trend = buckets.map(b => {
      const ord = orderTrend.find(x => x._id === b.key);
      const pos = posTrend.find(x => x._id === b.key);
      return {
        label: b.label,
        key: b.key,
        orders: ord?.revenue || 0,
        pos: pos?.revenue || 0,
        total: (ord?.revenue || 0) + (pos?.revenue || 0),
        orderCount: ord?.count || 0,
        posCount: pos?.count || 0,
      };
    });

    // ── Summaries ───────────────────────────────────────────────────
    const agg = (arr, key = 'revenue') => arr[0]?.[key] || 0;
    const pctChange = (curr, prev) => !prev ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    const orderRev    = agg(orderTotal);
    const posRev      = agg(posTotal);
    const totalRev    = orderRev + posRev;
    const prevRev     = agg(prevOrderTotal) + agg(prevPosTotal);
    const totalCount  = agg(orderTotal, 'count') + agg(posTotal, 'count');
    const prevCount   = agg(prevOrderTotal, 'count') + agg(prevPosTotal, 'count');

    // ── Merge top products ──────────────────────────────────────────
    const productMap = new Map();
    for (const p of [...topPosProducts, ...topOrderProducts]) {
      if (!p._id) continue;
      const key = p._id.toString();
      if (productMap.has(key)) {
        productMap.get(key).revenue += p.revenue;
        productMap.get(key).qty     += p.qty;
      } else {
        productMap.set(key, { _id: key, name: p.name, image: p.image || null, revenue: p.revenue, qty: p.qty });
      }
    }
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ── Status / payment maps ───────────────────────────────────────
    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const s of orderStatusBreakdown) if (s._id) statusMap[s._id] = s.count;

    const pmMap = { cash: 0, card: 0, transfer: 0 };
    for (const pm of paymentMethods) if (pm._id) pmMap[pm._id] = pm.revenue;

    res.json({
      period,
      summary: {
        totalRevenue:        totalRev,
        orderRevenue:        orderRev,
        posRevenue:          posRev,
        totalTransactions:   totalCount,
        avgTransactionValue: totalCount > 0 ? Math.round(totalRev / totalCount) : 0,
        newCustomers,
        vsRevenue:           pctChange(totalRev, prevRev),
        vsTransactions:      pctChange(totalCount, prevCount),
        vsCustomers:         pctChange(newCustomers, prevNewCustomers),
      },
      trend,
      topProducts,
      topCategories: topCategories.map(c => ({ name: c.name, revenue: c.revenue, qty: c.qty })),
      orderStatusBreakdown: statusMap,
      paymentMethods: pmMap,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bucket label generators ─────────────────────────────────────
function generateBuckets(period, todayStart) {
  const buckets = [];

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart); d.setDate(todayStart.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
      buckets.push({ key, label });
    }
  } else if (period === '30d') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart); d.setDate(todayStart.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
      buckets.push({ key, label });
    }
  } else if (period === '90d') {
    for (let i = 89; i >= 0; i--) {
      const d = new Date(todayStart); d.setDate(todayStart.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
      buckets.push({ key, label });
    }
  } else { // 12m
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
      buckets.push({ key, label });
    }
  }

  return buckets;
}

module.exports = router;
