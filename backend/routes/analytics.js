const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Product = require('../models/Product');

// ── GET /api/admin/analytics?period=7d|30d|90d|12m ──────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const now = new Date();
    now.setUTCHours(23, 59, 59, 999);
    // UTC midnight — keeps bucket keys aligned with MongoDB's $dateToString (which outputs UTC dates)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let start, prevStart, prevEnd, dateFormat;

    if (period === '7d') {
      start = new Date(todayStart); start.setUTCDate(todayStart.getUTCDate() - 6);
      prevEnd = new Date(start); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setUTCDate(prevEnd.getUTCDate() - 6); prevStart.setUTCHours(0, 0, 0, 0);
      dateFormat = '%Y-%m-%d';
    } else if (period === '30d') {
      start = new Date(todayStart); start.setUTCDate(todayStart.getUTCDate() - 29);
      prevEnd = new Date(start); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setUTCDate(prevEnd.getUTCDate() - 29); prevStart.setUTCHours(0, 0, 0, 0);
      dateFormat = '%Y-%m-%d';
    } else if (period === '90d') {
      start = new Date(todayStart); start.setUTCDate(todayStart.getUTCDate() - 89);
      prevEnd = new Date(start); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(prevEnd); prevStart.setUTCDate(prevEnd.getUTCDate() - 89); prevStart.setUTCHours(0, 0, 0, 0);
      dateFormat = '%Y-%m-%d';
    } else { // 12m
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      prevEnd = new Date(start); prevEnd.setUTCMilliseconds(-1);
      prevStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth() - 11, 1));
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
      posCategories,
      orderCategories,
      refundAgg,
      discountAgg,
      avgItemsAgg,
      topCashiersAgg,
      totalCustomers,
      recentOrdersRaw,
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
      // Order status breakdown (all-time — shows current pipeline state)
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Payment methods (POS) — split sales are broken down by splitPayments sub-array
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $facet: {
          regular: [
            { $match: { paymentMethod: { $ne: 'split' } } },
            { $group: { _id: '$paymentMethod', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
          ],
          split: [
            { $match: { paymentMethod: 'split' } },
            { $unwind: '$splitPayments' },
            { $group: { _id: '$splitPayments.method', revenue: { $sum: '$splitPayments.amount' }, count: { $sum: 1 } } },
          ],
        }},
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
      // Category source — POS: group by product ID only (category resolved in JS below)
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', revenue: { $sum: '$items.total' }, qty: { $sum: '$items.quantity' } } },
      ]),
      // Category source — Online Orders: group by product ID only
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.product',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          qty: { $sum: '$items.quantity' },
        }},
      ]),
      // Refunds
      Sale.aggregate([
        { $match: { type: 'refund', createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: { $abs: '$total' } } } },
      ]),
      // Discounts given (POS)
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$discountAmount' } } },
      ]),
      // Avg items per POS transaction
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $project: { itemCount: { $size: '$items' } } },
        { $group: { _id: null, avg: { $avg: '$itemCount' } } },
      ]),
      // Top cashiers by revenue
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: now } } },
        { $group: { _id: '$cashierName', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      // Total customers (all-time)
      User.countDocuments({ role: 'customer' }),
      // Recent online orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('_id total status createdAt items shippingAddress')
        .lean(),
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

    // ── Resolve categories via Product.find (same pattern as inventoryController) ──
    const allCatSales = [...posCategories, ...orderCategories].filter(s => s._id != null);
    const catProductIds = [...new Set(allCatSales.map(s => String(s._id)))];
    const catProducts = await Product.find({ _id: { $in: catProductIds } })
      .select('category')
      .lean();
    const catProdMap = Object.fromEntries(catProducts.map(p => [String(p._id), p.category || 'Uncategorized']));

    const catRev = {};
    const catQty = {};
    for (const s of allCatSales) {
      const cat = catProdMap[String(s._id)] || 'Uncategorized';
      catRev[cat] = (catRev[cat] || 0) + (s.revenue || 0);
      catQty[cat] = (catQty[cat] || 0) + (s.qty    || 0);
    }
    const topCategories = Object.entries(catRev)
      .map(([name, revenue]) => ({ name, revenue, qty: catQty[name] || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // ── Low stock products ──────────────────────────────────────────
    const lowStock = await Product.aggregate([
      { $match: { status: 'published' } },
      { $addFields: {
        totalStock: { $sum: '$variants.stock' },
        threshold:  { $ifNull: ['$minStock', 5] },
      }},
      { $match: { $expr: { $lte: ['$totalStock', '$threshold'] } } },
      { $sort: { totalStock: 1 } },
      { $limit: 5 },
      { $project: { name: 1, category: 1, totalStock: 1, minStock: '$threshold', image: { $arrayElemAt: ['$images.url', 0] } } },
    ]);

    // ── Shape new widget data ────────────────────────────────────────
    const refunds = {
      count: refundAgg[0]?.count || 0,
      total: refundAgg[0]?.total || 0,
    };
    const totalDiscounts  = discountAgg[0]?.total  || 0;
    const avgItemsPerTx   = Math.round((avgItemsAgg[0]?.avg || 0) * 10) / 10;
    const topCashiers     = topCashiersAgg.map(c => ({ name: c._id || 'Unknown', revenue: c.revenue, count: c.count }));
    const recentOrders = recentOrdersRaw.map(o => {
      const sa = o.shippingAddress || {};
      const customer = [sa.firstName, sa.lastName].filter(Boolean).join(' ') || sa.email || 'Guest';
      return {
        _id:       String(o._id),
        total:     o.total,
        status:    o.status,
        createdAt: o.createdAt,
        itemCount: o.items?.length || 0,
        customer,
      };
    });

    // ── Status / payment maps ───────────────────────────────────────
    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const s of orderStatusBreakdown) if (s._id) statusMap[s._id] = s.count;

    const pmMap = { cash: 0, card: 0, transfer: 0 };
    const pmRaw = [...(paymentMethods[0]?.regular || []), ...(paymentMethods[0]?.split || [])];
    for (const pm of pmRaw) {
      if (pm._id && pm._id in pmMap) pmMap[pm._id] += pm.revenue;
    }

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
      topCategories,
      orderStatusBreakdown: statusMap,
      paymentMethods: pmMap,
      refunds,
      totalDiscounts,
      avgItemsPerTx,
      totalCustomers,
      topCashiers,
      recentOrders,
      lowStock: lowStock.map(p => ({
        _id:        String(p._id),
        name:       p.name,
        category:   p.category || 'Uncategorized',
        totalStock: p.totalStock,
        minStock:   p.minStock || 5,
        image:      p.image || null,
      })),
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
      const d = new Date(todayStart); d.setUTCDate(todayStart.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
      buckets.push({ key, label });
    }
  } else if (period === '30d') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart); d.setUTCDate(todayStart.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      buckets.push({ key, label });
    }
  } else if (period === '90d') {
    for (let i = 89; i >= 0; i--) {
      const d = new Date(todayStart); d.setUTCDate(todayStart.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      buckets.push({ key, label });
    }
  } else { // 12m
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7); // "YYYY-MM"
      const label = d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      buckets.push({ key, label });
    }
  }

  return buckets;
}

module.exports = router;
