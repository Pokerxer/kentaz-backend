const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// ─── helpers ────────────────────────────────────────────────────────────────

async function applyPurchaseToStock(purchase, performedById) {
  const productIds = [...new Set(purchase.items.map(i => i.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));
  const inventoryDocs = [];

  for (const item of purchase.items) {
    const product = productMap[item.product.toString()];
    if (!product) continue;
    const idx = item.variantIndex >= 0 ? item.variantIndex : 0;
    if (!product.variants[idx]) continue;

    const previousStock = product.variants[idx].stock || 0;
    const newStock = previousStock + item.quantity;
    product.variants[idx].stock = newStock;
    product.variants[idx].costPrice = item.costPrice;
    product.markModified('variants');

    inventoryDocs.push({
      product: item.product,
      variantIndex: idx,
      type: 'in',
      quantity: item.quantity,
      previousStock,
      newStock,
      reference: purchase._id.toString(),
      referenceType: 'restock',
      notes: `Purchase from ${purchase.supplier}${purchase.reference ? ` · Ref: ${purchase.reference}` : ''}`,
      performedBy: performedById,
    });
  }

  await Promise.all([
    ...products.map(p => p.save()),
    inventoryDocs.length > 0 ? Inventory.insertMany(inventoryDocs) : Promise.resolve(),
  ]);
}

// Compute how many units of each item have already been returned
function getAlreadyReturnedMap(purchase) {
  const map = {};
  for (const ret of purchase.returns) {
    for (const ri of ret.items) {
      const key = `${ri.product.toString()}_${ri.variantIndex}`;
      map[key] = (map[key] || 0) + ri.quantity;
    }
  }
  return map;
}

// ─── controllers ────────────────────────────────────────────────────────────

exports.createPurchase = async (req, res) => {
  try {
    const { supplier, reference, purchaseDate, items, notes, receiveNow } = req.body;

    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ error: 'supplier and at least one item are required' });
    }

    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    const purchaseItems = [];
    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });

      const qty = parseInt(item.quantity);
      const cost = parseFloat(item.costPrice);
      if (!qty || qty <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' });
      if (isNaN(cost) || cost < 0) return res.status(400).json({ error: 'costPrice must be a non-negative number' });

      const idx = item.variantIndex >= 0 ? parseInt(item.variantIndex) : 0;
      const variant = product.variants[idx];
      const variantLabel = variant ? [variant.size, variant.color].filter(Boolean).join(' / ') : '';

      purchaseItems.push({
        product: item.productId,
        productName: product.name,
        variantIndex: idx,
        variantLabel,
        quantity: qty,
        costPrice: cost,
        totalCost: qty * cost,
      });
    }

    const totalCost = purchaseItems.reduce((sum, i) => sum + i.totalCost, 0);

    const purchase = await Purchase.create({
      supplier,
      reference,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: purchaseItems,
      totalCost,
      notes,
      status: receiveNow ? 'received' : 'pending',
      receivedAt: receiveNow ? new Date() : undefined,
      performedBy: req.user?.id,
    });

    if (receiveNow) await applyPurchaseToStock(purchase, req.user?.id);

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, supplier } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (supplier) filter.supplier = { $regex: supplier, $options: 'i' };

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Purchase.countDocuments(filter),
    ]);

    res.json({ purchases, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('performedBy', 'name email')
      .populate('items.product', 'name slug images variants')
      .populate('returns.performedBy', 'name email');

    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.receivePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    if (purchase.status !== 'pending') {
      return res.status(400).json({ error: `Cannot receive a purchase with status "${purchase.status}"` });
    }

    await applyPurchaseToStock(purchase, req.user?.id);
    purchase.status = 'received';
    purchase.receivedAt = new Date();
    await purchase.save();

    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    if (!['pending'].includes(purchase.status)) {
      return res.status(400).json({
        error: purchase.status === 'cancelled'
          ? 'Order is already cancelled'
          : 'Only pending orders can be cancelled. Use "Return Items" to return received stock.',
      });
    }

    purchase.status = 'cancelled';
    await purchase.save();

    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.returnPurchase = async (req, res) => {
  try {
    const { items, reason, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required for a return' });
    }
    if (!reason) {
      return res.status(400).json({ error: 'A return reason is required' });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    if (!['received', 'partially_returned'].includes(purchase.status)) {
      return res.status(400).json({ error: 'Only received orders can have items returned' });
    }

    // Map purchase items by product+variantIndex for quick lookup
    const purchaseItemMap = {};
    for (const pi of purchase.items) {
      const key = `${pi.product.toString()}_${pi.variantIndex}`;
      purchaseItemMap[key] = pi;
    }

    // Calculate how many units of each item have already been returned
    const alreadyReturned = getAlreadyReturnedMap(purchase);

    // Validate and build return items
    const returnItems = [];
    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) continue; // skip zero-quantity rows

      const key = `${item.productId}_${item.variantIndex}`;
      const purchaseItem = purchaseItemMap[key];
      if (!purchaseItem) {
        return res.status(400).json({ error: `Item not found in original purchase` });
      }

      const alreadyReturnedQty = alreadyReturned[key] || 0;
      const maxReturnable = purchaseItem.quantity - alreadyReturnedQty;
      if (qty > maxReturnable) {
        return res.status(400).json({
          error: `Cannot return ${qty} units of "${purchaseItem.productName}" — only ${maxReturnable} unit${maxReturnable !== 1 ? 's' : ''} returnable`,
        });
      }

      returnItems.push({
        product: purchaseItem.product,
        productName: purchaseItem.productName,
        variantIndex: purchaseItem.variantIndex,
        variantLabel: purchaseItem.variantLabel,
        quantity: qty,
        costPrice: purchaseItem.costPrice,
        totalCost: qty * purchaseItem.costPrice,
      });
    }

    if (returnItems.length === 0) {
      return res.status(400).json({ error: 'No valid return quantities provided' });
    }

    // Reduce stock and create inventory out-records
    const productIds = [...new Set(returnItems.map(i => i.product.toString()))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));
    const inventoryDocs = [];

    for (const ri of returnItems) {
      const product = productMap[ri.product.toString()];
      if (!product) continue;
      const idx = ri.variantIndex >= 0 ? ri.variantIndex : 0;
      if (!product.variants[idx]) continue;

      const previousStock = product.variants[idx].stock || 0;
      const newStock = Math.max(0, previousStock - ri.quantity);
      product.variants[idx].stock = newStock;
      product.markModified('variants');

      inventoryDocs.push({
        product: ri.product,
        variantIndex: idx,
        type: 'out',
        quantity: ri.quantity,
        previousStock,
        newStock,
        reference: purchase._id.toString(),
        referenceType: 'return',
        notes: `Supplier return to ${purchase.supplier} · Reason: ${reason}${notes ? ` · ${notes}` : ''}`,
        performedBy: req.user?.id,
      });
    }

    await Promise.all([
      ...products.map(p => p.save()),
      inventoryDocs.length > 0 ? Inventory.insertMany(inventoryDocs) : Promise.resolve(),
    ]);

    // Record the return on the purchase
    const returnTotalCost = returnItems.reduce((s, i) => s + i.totalCost, 0);
    purchase.returns.push({
      items: returnItems,
      totalCost: returnTotalCost,
      reason,
      notes,
      returnedAt: new Date(),
      performedBy: req.user?.id,
    });

    // Update status based on whether all items are now fully returned
    const updatedAlreadyReturned = getAlreadyReturnedMap(purchase);
    const allReturned = purchase.items.every(pi => {
      const key = `${pi.product.toString()}_${pi.variantIndex}`;
      return (updatedAlreadyReturned[key] || 0) >= pi.quantity;
    });
    purchase.status = allReturned ? 'returned' : 'partially_returned';

    await purchase.save();

    // Re-populate and return the full updated document
    const updated = await Purchase.findById(purchase._id)
      .populate('performedBy', 'name email')
      .populate('items.product', 'name slug images variants')
      .populate('returns.performedBy', 'name email');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPurchaseStats = async (req, res) => {
  try {
    const byStatus = {
      pending: { count: 0, totalCost: 0 },
      received: { count: 0, totalCost: 0 },
      partially_returned: { count: 0, totalCost: 0 },
      returned: { count: 0, totalCost: 0 },
      cancelled: { count: 0, totalCost: 0 },
    };

    const rows = await Purchase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalCost: { $sum: '$totalCost' } } },
    ]);
    rows.forEach(r => { if (byStatus[r._id]) byStatus[r._id] = { count: r.count, totalCost: r.totalCost }; });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTotal = await Purchase.aggregate([
      { $match: { status: { $in: ['received', 'partially_returned', 'returned'] }, receivedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, totalCost: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]);

    res.json({
      byStatus,
      last30Days: recentTotal[0] || { totalCost: 0, count: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
