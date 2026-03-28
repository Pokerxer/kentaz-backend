const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

exports.getAllInventory = async (req, res) => {
  try {
    const { productId, type, page = 1, limit = 50, startDate, endDate } = req.query;

    const filter = {};
    if (productId) filter.product = productId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [inventory, total] = await Promise.all([
      Inventory.find(filter)
        .populate('product', 'name slug images category')
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Inventory.countDocuments(filter),
    ]);

    res.json({
      inventory,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInventoryByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const [inventory, product] = await Promise.all([
      Inventory.find({ product: productId })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 }),
      Product.findById(productId).select('name slug images variants'),
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentStock = {};
    product.variants.forEach((v, idx) => {
      currentStock[`${idx}`] = v.stock || 0;
    });

    res.json({
      history: inventory,
      currentStock,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addInventory = async (req, res) => {
  try {
    const { productId, variantIndex = -1, type, quantity, notes, reference, referenceType } = req.body;

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Always operate on a specific variant; -1 defaults to first variant
    const idx = variantIndex >= 0 ? variantIndex : 0;
    if (!product.variants[idx]) {
      return res.status(400).json({ error: `Variant at index ${idx} not found` });
    }

    const previousStock = product.variants[idx].stock || 0;
    let newStock;

    switch (type) {
      case 'in':
      case 'return':
      case 'restock':
        newStock = previousStock + qty;
        break;
      case 'out':
      case 'sale':
      case 'damage':
        newStock = Math.max(0, previousStock - qty);
        break;
      case 'adjustment':
      case 'initial':
        newStock = qty;
        break;
      default:
        return res.status(400).json({ error: `Invalid type: ${type}` });
    }

    product.variants[idx].stock = newStock;
    product.markModified('variants');
    await product.save();

    const inventory = await Inventory.create({
      product: productId,
      variantIndex: idx,
      type,
      quantity: qty,
      previousStock,
      newStock,
      reference,
      referenceType: referenceType || type,
      notes,
      performedBy: req.user?.id,
    });

    res.status(201).json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adjustInventory = async (req, res) => {
  try {
    const { productId, variantIndex = -1, newStockLevel, notes } = req.body;

    const newLevel = parseInt(newStockLevel);
    if (isNaN(newLevel) || newLevel < 0) {
      return res.status(400).json({ error: 'newStockLevel must be a non-negative number' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const idx = variantIndex >= 0 ? variantIndex : 0;
    if (!product.variants[idx]) {
      return res.status(400).json({ error: `Variant at index ${idx} not found` });
    }

    const previousStock = product.variants[idx].stock || 0;

    product.variants[idx].stock = newLevel;
    product.markModified('variants');
    await product.save();

    const inventory = await Inventory.create({
      product: productId,
      variantIndex: idx,
      type: 'adjustment',
      quantity: newLevel - previousStock,
      previousStock,
      newStock: newLevel,
      referenceType: 'adjustment',
      notes: notes || `Stock adjusted from ${previousStock} to ${newLevel}`,
      performedBy: req.user?.id,
    });

    res.status(201).json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInventoryStats = async (req, res) => {
  try {
    const lowStockThreshold = parseInt(req.query.threshold) || 10;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [stockAgg, productCount, todayIn, todayOut, recentMovements] = await Promise.all([
      Product.aggregate([
        { $unwind: { path: '$variants', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: null,
            totalStock: { $sum: { $ifNull: ['$variants.stock', 0] } },
            totalValue: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$variants.stock', 0] },
                  { $ifNull: ['$variants.price', 0] },
                ],
              },
            },
            lowStockProducts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: [{ $ifNull: ['$variants.stock', 0] }, 0] },
                      { $lte: [{ $ifNull: ['$variants.stock', 0] }, lowStockThreshold] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockProducts: {
              $sum: { $cond: [{ $eq: [{ $ifNull: ['$variants.stock', 0] }, 0] }, 1, 0] },
            },
          },
        },
      ]),
      Product.countDocuments(),
      Inventory.countDocuments({
        type: { $in: ['in', 'return', 'restock'] },
        createdAt: { $gte: todayStart },
      }),
      Inventory.countDocuments({
        type: { $in: ['out', 'sale', 'damage'] },
        createdAt: { $gte: todayStart },
      }),
      Inventory.find()
        .populate('product', 'name slug images category')
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const agg = stockAgg[0] || {
      totalStock: 0,
      totalValue: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    };

    res.json({
      totalStock: agg.totalStock,
      totalValue: agg.totalValue,
      totalProducts: productCount,
      lowStockProducts: agg.lowStockProducts,
      outOfStockProducts: agg.outOfStockProducts,
      todayIn,
      todayOut,
      recentMovements,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkUpdateStock = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    const productIds = [...new Set(items.map(i => i.productId))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    const inventoryDocs = [];
    const results = [];

    for (const item of items) {
      const { productId, variantIndex = -1, stock, notes } = item;
      const product = productMap[productId];

      if (!product) {
        results.push({ productId, success: false, error: 'Product not found' });
        continue;
      }

      const idx = variantIndex >= 0 ? variantIndex : 0;
      if (!product.variants[idx]) {
        results.push({ productId, success: false, error: `Variant at index ${idx} not found` });
        continue;
      }

      const newStock = parseInt(stock);
      if (isNaN(newStock) || newStock < 0) {
        results.push({ productId, success: false, error: 'stock must be a non-negative number' });
        continue;
      }

      const previousStock = product.variants[idx].stock || 0;
      product.variants[idx].stock = newStock;
      product.markModified('variants');

      inventoryDocs.push({
        product: productId,
        variantIndex: idx,
        type: 'adjustment',
        quantity: newStock - previousStock,
        previousStock,
        newStock,
        referenceType: 'adjustment',
        notes: notes || 'Bulk stock update',
        performedBy: req.user?.id,
      });

      results.push({ productId, success: true, previousStock, newStock });
    }

    await Promise.all([
      ...products.map(p => p.save()),
      inventoryDocs.length > 0 ? Inventory.insertMany(inventoryDocs) : Promise.resolve(),
    ]);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;

    const products = await Product.find().select('name slug images category variants');

    const lowStock = [];
    products.forEach(product => {
      product.variants.forEach((variant, idx) => {
        const stock = variant.stock || 0;
        if (stock <= threshold) {
          lowStock.push({
            product: {
              _id: product._id,
              name: product.name,
              slug: product.slug,
              images: product.images,
              category: product.category,
            },
            variantIndex: idx,
            variant: {
              size: variant.size,
              color: variant.color,
              price: variant.price,
              stock,
            },
            isOutOfStock: stock === 0,
          });
        }
      });
    });

    lowStock.sort((a, b) => a.variant.stock - b.variant.stock);

    res.json({ items: lowStock, total: lowStock.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/inventory/analytics
exports.getInventoryAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // ── 1. Sales aggregation (POS) ────────────────────────────
    const salesAgg = await Sale.aggregate([
      { $match: { status: { $ne: 'voided' }, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          unitsSold:    { $sum: { $cond: [{ $eq: ['$type', 'sale']   }, '$items.quantity', 0] } },
          unitsRefunded:{ $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$items.quantity', 0] } },
          revenue:      { $sum: { $cond: [{ $eq: ['$type', 'sale']   }, '$items.total',    0] } },
          refundAmount: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$items.total',    0] } },
        },
      },
      {
        $addFields: {
          netSold:    { $subtract: ['$unitsSold', '$unitsRefunded'] },
          netRevenue: { $add:      ['$revenue',   '$refundAmount'] },
        },
      },
      { $match: { netSold: { $gt: 0 } } },
      { $sort: { netRevenue: -1 } },
      { $limit: 20 },
    ]);

    const productIds = salesAgg.map(s => s._id);
    const products   = await Product.find({ _id: { $in: productIds } })
      .select('name category images variants')
      .lean();
    const prodMap = Object.fromEntries(products.map(p => [String(p._id), p]));

    const topProducts = salesAgg
      .map(s => {
        const p = prodMap[String(s._id)];
        if (!p) return null;
        const totalStock = p.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
        return {
          _id:        s._id,
          name:       p.name,
          category:   p.category,
          image:      p.images?.[0]?.url || null,
          netSold:    s.netSold,
          unitsSold:  s.unitsSold,
          unitsRefunded: s.unitsRefunded,
          netRevenue: s.netRevenue,
          stock:      totalStock,
        };
      })
      .filter(Boolean)
      .slice(0, 10);

    // ── 2. Category breakdown ─────────────────────────────────
    const categoryMap = {};
    for (const item of topProducts) {
      const cat = item.category || 'Uncategorised';
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, netSold: 0, netRevenue: 0, productCount: 0 };
      categoryMap[cat].netSold    += item.netSold;
      categoryMap[cat].netRevenue += item.netRevenue;
      categoryMap[cat].productCount++;
    }
    // Also pick up products NOT in top 10 for full category picture
    const allSalesAgg = await Sale.aggregate([
      { $match: { type: 'sale', status: { $ne: 'voided' }, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          netSold:    { $sum: '$items.quantity' },
          netRevenue: { $sum: '$items.total' },
        },
      },
    ]);
    const allProductIds = allSalesAgg.map(s => s._id);
    const allProducts   = await Product.find({ _id: { $in: allProductIds } })
      .select('name category')
      .lean();
    const allProdMap = Object.fromEntries(allProducts.map(p => [String(p._id), p]));
    const catTotals  = {};
    for (const s of allSalesAgg) {
      const p = allProdMap[String(s._id)];
      const cat = p?.category || 'Uncategorised';
      if (!catTotals[cat]) catTotals[cat] = { name: cat, netSold: 0, netRevenue: 0, productCount: 0 };
      catTotals[cat].netSold    += s.netSold;
      catTotals[cat].netRevenue += s.netRevenue;
      catTotals[cat].productCount++;
    }
    const topCategories = Object.values(catTotals)
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 8);
    const totalCatRevenue = topCategories.reduce((s, c) => s + c.netRevenue, 0);
    topCategories.forEach(c => {
      c.share = totalCatRevenue > 0 ? Math.round((c.netRevenue / totalCatRevenue) * 100) : 0;
    });

    // ── 3. Slow movers (high stock, zero sales in period) ─────
    const soldProductIds = new Set(allSalesAgg.map(s => String(s._id)));
    const allProds = await Product.find({ status: 'published' })
      .select('name category images variants')
      .lean();
    const slowMovers = allProds
      .filter(p => !soldProductIds.has(String(p._id)))
      .map(p => ({
        _id:      p._id,
        name:     p.name,
        category: p.category,
        image:    p.images?.[0]?.url || null,
        stock:    p.variants.reduce((s, v) => s + (v.stock || 0), 0),
      }))
      .filter(p => p.stock > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10);

    // ── 4. Stock health summary ───────────────────────────────
    let healthIn = 0, healthLow = 0, healthOut = 0;
    for (const p of allProds) {
      for (const v of p.variants) {
        const s = v.stock || 0;
        if (s === 0)      healthOut++;
        else if (s <= 10) healthLow++;
        else              healthIn++;
      }
    }

    res.json({
      period:         days,
      topProducts,
      topCategories,
      slowMovers,
      stockHealth:    { inStock: healthIn, lowStock: healthLow, outOfStock: healthOut },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
