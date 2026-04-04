const ProductBundle = require('../models/ProductBundle');
const Product = require('../models/Product');

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/bundles
exports.getBundles = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Only active bundles that are within date range
    const now = new Date();
    filter.$or = [
      { endDate: { $exists: false } },
      { endDate: { $gte: now } },
    ];
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'active';
    }

    const bundles = await ProductBundle.find(filter)
      .populate('items.product', 'name images variants')
      .sort({ createdAt: -1 });

    res.json(bundles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/bundles/:id
exports.getBundle = async (req, res) => {
  try {
    const bundle = await ProductBundle.findById(req.params.id)
      .populate('items.product', 'name images variants');

    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/bundles
exports.createBundle = async (req, res) => {
  try {
    const { name, description, items, bundlePrice, compareAtPrice, discount, minQuantity, maxQuantity, startDate, endDate } = req.body;

    if (!name || !items || items.length < 2 || !bundlePrice) {
      return res.status(400).json({ error: 'Name, at least 2 items, and bundle price are required' });
    }

    // Validate items exist
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(400).json({ error: `Product not found: ${item.product}` });
    }

    // Calculate compareAtPrice if not provided
    let calcCompareAtPrice = compareAtPrice;
    if (!calcCompareAtPrice) {
      calcCompareAtPrice = 0;
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (product && product.variants[0]) {
          calcCompareAtPrice += product.variants[0].price * item.quantity;
        }
      }
    }

    const slug = generateSlug(name);

    const bundle = await ProductBundle.create({
      name,
      slug,
      description,
      items,
      bundlePrice,
      compareAtPrice: calcCompareAtPrice,
      discount,
      minQuantity: minQuantity || 1,
      maxQuantity,
      startDate,
      endDate,
    });

    res.status(201).json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/bundles/:id
exports.updateBundle = async (req, res) => {
  try {
    const { name, description, items, bundlePrice, compareAtPrice, discount, minQuantity, maxQuantity, status, startDate, endDate } = req.body;

    const bundle = await ProductBundle.findById(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

    if (name && name !== bundle.name) bundle.slug = generateSlug(name);
    if (description !== undefined) bundle.description = description;
    if (items) bundle.items = items;
    if (bundlePrice) bundle.bundlePrice = bundlePrice;
    if (compareAtPrice !== undefined) bundle.compareAtPrice = compareAtPrice;
    if (discount !== undefined) bundle.discount = discount;
    if (minQuantity) bundle.minQuantity = minQuantity;
    if (maxQuantity !== undefined) bundle.maxQuantity = maxQuantity;
    if (status) bundle.status = status;
    if (startDate !== undefined) bundle.startDate = startDate;
    if (endDate !== undefined) bundle.endDate = endDate;

    await bundle.save();
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/bundles/:id
exports.deleteBundle = async (req, res) => {
  try {
    const bundle = await ProductBundle.findByIdAndDelete(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json({ message: 'Bundle deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/bundles/validate - Check if bundle is valid for sale
exports.validateBundle = async (req, res) => {
  try {
    const { bundleId, quantity = 1 } = req.body;

    const bundle = await ProductBundle.findById(bundleId)
      .populate('items.product', 'name variants');

    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    if (bundle.status !== 'active') return res.status(400).json({ error: 'Bundle is not active' });

    // Check date range
    const now = new Date();
    if (bundle.startDate && now < bundle.startDate) return res.status(400).json({ error: 'Bundle has not started yet' });
    if (bundle.endDate && now > bundle.endDate) return res.status(400).json({ error: 'Bundle has expired' });

    // Check stock for each item
    const stockCheck = [];
    for (const item of bundle.items) {
      const product = item.product;
      const variant = product.variants[item.variantIndex || 0];
      const requiredQty = item.quantity * quantity;
      const available = variant?.stock || 0;

      stockCheck.push({
        productName: product.name,
        required: requiredQty,
        available,
        sufficient: available >= requiredQty,
      });
    }

    const allSufficient = stockCheck.every(s => s.sufficient);

    res.json({
      valid: allSufficient,
      bundle,
      quantity,
      totalPrice: bundle.bundlePrice * quantity,
      stockCheck,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;