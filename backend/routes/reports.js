const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, adminOnly, posAccess } = require('../middleware/auth');
const Order    = require('../models/Order');
const Sale     = require('../models/Sale');
const Product  = require('../models/Product');
const User     = require('../models/User');
const Purchase = require('../models/Purchase');

// ── Helpers ──────────────────────────────────────────────────────

function parseDates(query) {
  const to = new Date(query.to || new Date());
  to.setHours(23, 59, 59, 999);
  const defaultFrom = new Date(to);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  defaultFrom.setHours(0, 0, 0, 0);
  const from = new Date(query.from || defaultFrom);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

// ── GET /api/admin/reports/sales ─────────────────────────────────
// Tracks: online orders, POS sales, POS refunds → net revenue per period
router.get('/sales', auth, adminOnly, async (req, res) => {
  try {
    const { from, to } = parseDates(req.query);
    const groupBy = req.query.groupBy || 'day'; // day | month

    const fmt = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const bucketExpr = { $dateToString: { format: fmt, date: '$createdAt' } };

    const [orderData, posData, posRefunds] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
        { $group: { _id: bucketExpr, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: bucketExpr, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { type: 'refund', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: bucketExpr, amount: { $sum: { $abs: '$total' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const keys = [...new Set([
      ...orderData.map(d => d._id),
      ...posData.map(d => d._id),
      ...posRefunds.map(d => d._id),
    ])].sort();

    const rows = keys.map(key => {
      const ord = orderData.find(d => d._id === key);
      const pos = posData.find(d => d._id === key);
      const ref = posRefunds.find(d => d._id === key);
      const onlineRev     = ord?.revenue || 0;
      const posRev        = pos?.revenue || 0;
      const refundAmount  = ref?.amount  || 0;
      const totalRev      = onlineRev + posRev;
      return {
        period:          key,
        onlineCount:     ord?.count || 0,
        onlineRevenue:   onlineRev,
        posCount:        pos?.count || 0,
        posRevenue:      posRev,
        posRefundCount:  ref?.count  || 0,
        posRefundAmount: refundAmount,
        totalCount:      (ord?.count || 0) + (pos?.count || 0),
        totalRevenue:    totalRev,
        netRevenue:      totalRev - refundAmount,
      };
    });

    const zero = { onlineCount: 0, onlineRevenue: 0, posCount: 0, posRevenue: 0,
      posRefundCount: 0, posRefundAmount: 0, totalCount: 0, totalRevenue: 0, netRevenue: 0 };
    const summary = rows.reduce((acc, r) => ({
      onlineCount:     acc.onlineCount     + r.onlineCount,
      onlineRevenue:   acc.onlineRevenue   + r.onlineRevenue,
      posCount:        acc.posCount        + r.posCount,
      posRevenue:      acc.posRevenue      + r.posRevenue,
      posRefundCount:  acc.posRefundCount  + r.posRefundCount,
      posRefundAmount: acc.posRefundAmount + r.posRefundAmount,
      totalCount:      acc.totalCount      + r.totalCount,
      totalRevenue:    acc.totalRevenue    + r.totalRevenue,
      netRevenue:      acc.netRevenue      + r.netRevenue,
    }), zero);

    res.json({ rows, summary, groupBy, from, to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/reports/products ──────────────────────────────
// Includes: POS refunds, current stock, margin %
router.get('/products', auth, adminOnly, async (req, res) => {
  try {
    const { from, to } = parseDates(req.query);

    const [posProducts, orderProducts, posRefunds] = await Promise.all([
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: from, $lte: to } } },
        { $unwind: '$items' },
        { $group: {
          _id:        '$items.product',
          name:       { $first: '$items.productName' },
          posQty:     { $sum: '$items.quantity' },
          posCost:    { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
          posRevenue: { $sum: '$items.total' },
        }},
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'pd' } },
        { $unwind: { path: '$pd', preserveNullAndEmptyArrays: true } },
        { $project: {
          name: 1, posQty: 1, posCost: 1, posRevenue: 1,
          category: '$pd.category',
          image:    { $arrayElemAt: ['$pd.images.url', 0] },
        }},
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: {
          _id:           '$items.product',
          name:          { $first: '$items.name' },
          onlineQty:     { $sum: '$items.quantity' },
          onlineRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        }},
      ]),
      Sale.aggregate([
        { $match: { type: 'refund', createdAt: { $gte: from, $lte: to } } },
        { $unwind: '$items' },
        { $group: {
          _id:            '$items.product',
          refundedQty:    { $sum: '$items.quantity' },
          refundedAmount: { $sum: { $abs: '$items.total' } },
        }},
      ]),
    ]);

    // Build product map
    const map = new Map();
    for (const p of posProducts) {
      const key = p._id?.toString(); if (!key) continue;
      map.set(key, {
        _id: key, name: p.name, category: p.category || '', image: p.image || null,
        posQty: p.posQty, posCost: p.posCost, posRevenue: p.posRevenue,
        onlineQty: 0, onlineRevenue: 0,
        posRefundedQty: 0, posRefundedAmount: 0,
        currentStock: null,
      });
    }
    for (const p of orderProducts) {
      const key = p._id?.toString(); if (!key) continue;
      if (map.has(key)) {
        map.get(key).onlineQty     = p.onlineQty;
        map.get(key).onlineRevenue = p.onlineRevenue;
      } else {
        map.set(key, {
          _id: key, name: p.name, category: '', image: null,
          posQty: 0, posCost: 0, posRevenue: 0,
          onlineQty: p.onlineQty, onlineRevenue: p.onlineRevenue,
          posRefundedQty: 0, posRefundedAmount: 0,
          currentStock: null,
        });
      }
    }
    for (const r of posRefunds) {
      const key = r._id?.toString(); if (!key) continue;
      if (map.has(key)) {
        map.get(key).posRefundedQty    = r.refundedQty;
        map.get(key).posRefundedAmount = r.refundedAmount;
      }
    }

    // Fetch current stock for all products
    const allIds = [...map.keys()].filter(id => /^[0-9a-fA-F]{24}$/.test(id))
      .map(id => new mongoose.Types.ObjectId(id));
    if (allIds.length > 0) {
      const stockData = await Product.find({ _id: { $in: allIds } }, 'variants').lean();
      for (const p of stockData) {
        const key = p._id.toString();
        if (map.has(key)) {
          map.get(key).currentStock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
        }
      }
    }

    const rows = [...map.values()].map(p => {
      const totalQty      = p.posQty     + p.onlineQty;
      const totalRevenue  = p.posRevenue + p.onlineRevenue;
      const netQty        = totalQty - p.posRefundedQty;
      const grossProfit   = p.posRevenue - p.posCost - p.posRefundedAmount;
      const marginPct     = p.posRevenue > 0 ? Math.round((grossProfit / p.posRevenue) * 100) : null;
      return {
        ...p,
        totalQty, totalRevenue, netQty, grossProfit, marginPct,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const summary = rows.reduce((acc, r) => ({
      totalQty:       acc.totalQty       + r.totalQty,
      netQty:         acc.netQty         + r.netQty,
      totalRevenue:   acc.totalRevenue   + r.totalRevenue,
      grossProfit:    acc.grossProfit    + r.grossProfit,
      refundedAmount: acc.refundedAmount + r.posRefundedAmount,
    }), { totalQty: 0, netQty: 0, totalRevenue: 0, grossProfit: 0, refundedAmount: 0 });

    summary.marginPct = pct(summary.grossProfit, summary.totalRevenue - summary.refundedAmount);

    res.json({ rows, summary, from, to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/reports/orders ────────────────────────────────
router.get('/orders', auth, adminOnly, async (req, res) => {
  try {
    const { from, to } = parseDates(req.query);
    const match = { createdAt: { $gte: from, $lte: to } };
    if (req.query.status) match.status = req.query.status;

    const orders = await Order.find(match)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const rows = orders.map(o => ({
      _id:           o._id,
      ref:           o._id.toString().slice(-6).toUpperCase(),
      customerName:  o.user?.name  || 'Guest',
      customerEmail: o.user?.email || '',
      date:          o.createdAt,
      itemCount:     o.items.reduce((s, i) => s + i.quantity, 0),
      total:         o.total,
      status:        o.status,
      shippingCity:  o.shippingAddress?.city  || '',
      shippingState: o.shippingAddress?.state || '',
      paymentStatus: o.paystackStatus || 'n/a',
    }));

    const nonCancelled = rows.filter(r => r.status !== 'cancelled');
    const summary = {
      count:         rows.length,
      revenue:       nonCancelled.reduce((s, r) => s + r.total, 0),
      avgOrder:      nonCancelled.length > 0 ? Math.round(nonCancelled.reduce((s, r) => s + r.total, 0) / nonCancelled.length) : 0,
      cancelledCount: rows.filter(r => r.status === 'cancelled').length,
      deliveredCount: rows.filter(r => r.status === 'delivered').length,
    };

    res.json({ rows, summary, from, to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/reports/customers ─────────────────────────────
router.get('/customers', auth, adminOnly, async (req, res) => {
  try {
    const { from, to } = parseDates(req.query);

    const [rows, cancelledData] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' }, user: { $ne: null } } },
        { $group: {
          _id:        '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          firstOrder: { $min: '$createdAt' },
          lastOrder:  { $max: '$createdAt' },
        }},
        { $sort: { totalSpent: -1 } },
        { $limit: 200 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
          name:       { $ifNull: ['$user.name',  'Unknown'] },
          email:      { $ifNull: ['$user.email', ''] },
          joined:     '$user.createdAt',
          isActive:   { $ifNull: ['$user.isActive', true] },
          orderCount: 1,
          totalSpent: 1,
          firstOrder: 1,
          lastOrder:  1,
          avgOrder:   { $round: [{ $divide: ['$totalSpent', '$orderCount'] }, 0] },
        }},
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: 'cancelled', user: { $ne: null } } },
        { $group: { _id: '$user', cancelledCount: { $sum: 1 } } },
      ]),
    ]);

    // Merge cancelled counts
    const cancelMap = new Map(cancelledData.map(c => [c._id.toString(), c.cancelledCount]));
    const enriched = rows.map(r => ({
      ...r,
      cancelledCount: cancelMap.get(r._id.toString()) || 0,
    }));

    const summary = {
      count:        enriched.length,
      totalRevenue: enriched.reduce((s, r) => s + r.totalSpent, 0),
      avgSpend:     enriched.length > 0 ? Math.round(enriched.reduce((s, r) => s + r.totalSpent, 0) / enriched.length) : 0,
      repeatCount:  enriched.filter(r => r.orderCount > 1).length,
    };

    res.json({ rows: enriched, summary, from, to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/reports/inventory ─────────────────────────────
// Includes: retail value per line, total retail value in summary
router.get('/inventory', auth, adminOnly, async (req, res) => {
  try {
    const filter = req.query.filter || 'all'; // all | low | out

    const products = await Product.find()
      .select('name category variants images status')
      .lean();

    const rows = [];
    for (const p of products) {
      for (let i = 0; i < p.variants.length; i++) {
        const v = p.variants[i];
        const stockStatus = v.stock === 0 ? 'out' : v.stock <= 5 ? 'low' : 'ok';
        if (filter === 'low' && stockStatus !== 'low') continue;
        if (filter === 'out' && stockStatus !== 'out') continue;
        rows.push({
          productId:     p._id,
          productName:   p.name,
          category:      p.category,
          productStatus: p.status,
          image:         p.images?.[0]?.url || null,
          variantLabel:  [v.size, v.color].filter(Boolean).join(' / ') || 'Default',
          sku:           v.sku || '',
          price:         v.price,
          costPrice:     v.costPrice || 0,
          stock:         v.stock,
          stockStatus,
          costValue:     v.stock * (v.costPrice || 0),
          retailValue:   v.stock * v.price,
        });
      }
    }

    rows.sort((a, b) => a.stock - b.stock);

    const summary = {
      total:           rows.length,
      outCount:        rows.filter(r => r.stockStatus === 'out').length,
      lowCount:        rows.filter(r => r.stockStatus === 'low').length,
      okCount:         rows.filter(r => r.stockStatus === 'ok').length,
      totalCostValue:  rows.reduce((s, r) => s + r.costValue,   0),
      totalRetailValue:rows.reduce((s, r) => s + r.retailValue, 0),
    };

    res.json({ rows, summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/reports/staff ─────────────────────────────────
// Fixes: $ifNull bug, adds itemsSold, refunds, netRevenue
router.get('/staff', auth, adminOnly, async (req, res) => {
  try {
    const { from, to } = parseDates(req.query);

    const [salesData, refundData] = await Promise.all([
      Sale.aggregate([
        { $match: { type: 'sale', status: 'completed', createdAt: { $gte: from, $lte: to } } },
        { $group: {
          _id:             '$cashier',
          cashierName:     { $first: '$cashierName' },
          transactions:    { $sum: 1 },
          revenue:         { $sum: '$total' },
          avgTransaction:  { $avg: '$total' },
          itemsSold:       { $sum: { $sum: '$items.quantity' } },
          cashRevenue:     { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] },     '$total', 0] } },
          cardRevenue:     { $sum: { $cond: [{ $eq: ['$paymentMethod', 'card'] },     '$total', 0] } },
          transferRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'transfer'] }, '$total', 0] } },
        }},
        { $sort: { revenue: -1 } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
          // Fix: nested $ifNull instead of 3-arg (MongoDB only accepts 2 args)
          name:            { $ifNull: ['$user.name', { $ifNull: ['$cashierName', 'Unknown'] }] },
          email:           { $ifNull: ['$user.email', ''] },
          transactions:    1,
          revenue:         1,
          avgTransaction:  { $round: ['$avgTransaction', 0] },
          itemsSold:       1,
          cashRevenue:     1,
          cardRevenue:     1,
          transferRevenue: 1,
        }},
      ]),
      Sale.aggregate([
        { $match: { type: 'refund', createdAt: { $gte: from, $lte: to } } },
        { $group: {
          _id:          '$cashier',
          refundCount:  { $sum: 1 },
          refundAmount: { $sum: { $abs: '$total' } },
        }},
      ]),
    ]);

    // Merge refund data
    const refundMap = new Map(refundData.map(r => [r._id?.toString(), r]));
    const rows = salesData.map(s => {
      const ref = refundMap.get(s._id?.toString());
      const refundAmount = ref?.refundAmount || 0;
      return {
        ...s,
        refundCount:  ref?.refundCount  || 0,
        refundAmount,
        netRevenue:   s.revenue - refundAmount,
      };
    });

    const summary = {
      staffCount:   rows.length,
      totalRevenue: rows.reduce((s, r) => s + r.revenue,      0),
      totalTx:      rows.reduce((s, r) => s + r.transactions, 0),
      totalItems:   rows.reduce((s, r) => s + r.itemsSold,    0),
      refundAmount: rows.reduce((s, r) => s + r.refundAmount, 0),
      netRevenue:   rows.reduce((s, r) => s + r.netRevenue,   0),
    };

    res.json({ rows, summary, from, to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/reports/purchases ─────────────────────────────
router.get('/purchases', auth, adminOnly, async (req, res) => {
  try {
    const { from, to } = parseDates(req.query);

    const purchases = await Purchase.find({ createdAt: { $gte: from, $lte: to } })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const rows = purchases.map(p => {
      const returnsTotal = (p.returns || []).reduce((s, r) => s + r.totalCost, 0);
      return {
        _id:          p._id,
        ref:          p.reference || p._id.toString().slice(-6).toUpperCase(),
        supplier:     p.supplier,
        date:         p.purchaseDate || p.createdAt,
        itemsOrdered: p.items.reduce((s, i) => s + i.quantity, 0),
        totalCost:    p.totalCost,
        returnsTotal,
        netCost:      p.totalCost - returnsTotal,
        returnCount:  (p.returns || []).length,
        status:       p.status,
        performedBy:  p.performedBy?.name || 'Unknown',
      };
    });

    const summary = {
      count:       rows.length,
      totalCost:   rows.reduce((s, r) => s + r.totalCost,    0),
      returnsTotal:rows.reduce((s, r) => s + r.returnsTotal, 0),
      netCost:     rows.reduce((s, r) => s + r.netCost,      0),
    };

    res.json({ rows, summary, from, to });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POS Reports (X, Z, Hourly) ─────────────────────────────────────

const {
  getXReport,
  getZReport,
  getHourlySales,
  getStaffPerformance,
  getSummary,
} = require('../controllers/reportController');

router.get('/pos/x', auth, posAccess, getXReport);
router.get('/pos/z', auth, posAccess, getZReport);
router.get('/pos/hourly', auth, posAccess, getHourlySales);
router.get('/pos/staff', auth, adminOnly, getStaffPerformance);
router.get('/pos/summary', auth, adminOnly, getSummary);

module.exports = router;
