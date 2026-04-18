const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Register = require('../models/Register');
const CashMovement = require('../models/CashMovement');
const Customer = require('../models/Customer');
const OfflineSale = require('../models/OfflineSale');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { trackSale } = require('./customerController');

const JWT_SECRET = process.env.JWT_SECRET || 'kentaz-super-secret-jwt';

// GET /api/pos/staff-list — public, returns selectable staff for the login screen
exports.getPosStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['staff', 'admin'] }, isActive: { $ne: false } })
      .select('name role avatar')
      .lean();
    res.json(staff.map(u => ({
      _id:      u._id,
      name:     u.name,
      role:     u.role,
      avatar:   u.avatar || null,
      initials: u.name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/login
// Accepts { email, password } OR { userId, pin } OR { userId, password }
exports.posLogin = async (req, res) => {
  try {
    const { email, userId, password, pin } = req.body;
    const credential = pin || password;
    if (!credential) return res.status(400).json({ error: 'PIN or password is required' });

    const user = userId
      ? await User.findById(userId)
      : await User.findOne({ email });

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.role !== 'staff' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized for POS access' });
    }
    if (user.isActive === false) return res.status(403).json({ error: 'Account is inactive' });

    // PIN takes priority if provided and user has one set; fall back to password
    let isMatch = false;
    if (pin && user.pin) {
      isMatch = await bcrypt.compare(pin, user.pin);
    } else {
      isMatch = await bcrypt.compare(credential, user.password);
    }
    if (!isMatch) return res.status(400).json({ error: 'Incorrect PIN' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, permissions: user.permissions || [] },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/staff/:id/pin — admin sets a staff member's PIN
exports.setStaffPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,8}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN must be 4–8 digits' });
    }
    const hashed = await bcrypt.hash(String(pin), 10);
    const user = await User.findByIdAndUpdate(req.params.id, { pin: hashed }, { new: true }).select('-password -pin');
    if (!user) return res.status(404).json({ error: 'Staff not found' });
    res.json({ message: 'PIN updated', staff: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/products
exports.getPosProducts = async (req, res) => {
  try {
    const { search, category, favorites, barcode } = req.query;
    const filter = { status: 'published' };

    // Search by name, barcode, or SKU
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { 'variants.sku': { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by barcode specifically
    if (barcode) {
      filter.$or = [
        { barcode: barcode },
        { 'variants.sku': barcode },
      ];
    }

    if (category) filter.category = category;

    // Filter favorites only
    if (favorites === 'true') {
      filter.isFavorite = true;
    }

    const products = await Product.find(filter)
      .select('name slug category images variants tags featured barcode isFavorite ageRestricted minStock')
      .sort({ isFavorite: -1, name: 1 })
      .lean();

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/pos/products/:id/favorite - toggle favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.isFavorite = !product.isFavorite;
    await product.save();

    res.json({ isFavorite: product.isFavorite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/sales
exports.createSale = async (req, res) => {
  const deductedItems = []; // track for rollback

  try {
    const {
      items,
      discount = 0,
      discountType = 'percent',
      paymentMethod = 'cash',
      splitPayments,
      amountPaid = 0,
      customerName,
      customerPhone,
      customerId,
      loyaltyPointsToRedeem = 0,
      ageVerified = false,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // ── Phase 1: Build & validate sale items ──────────────────
    const saleItems = [];
    for (const item of items) {
      if (!item.productId) return res.status(400).json({ error: 'productId is required for each item' });
      if (!item.quantity || item.quantity < 1) return res.status(400).json({ error: 'quantity must be at least 1' });

      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });

      const vi = item.variantIndex ?? 0;
      const variant = product.variants[vi];
      if (!variant) return res.status(400).json({ error: `Invalid variant index ${vi} for "${product.name}"` });

      const currentStock = variant.stock ?? 0;
      if (currentStock < item.quantity) {
        const varLabel = [variant.size, variant.color].filter(Boolean).join(' ');
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}"${varLabel ? ` (${varLabel})` : ''}. Available: ${currentStock}, requested: ${item.quantity}`,
        });
      }

      const label = [variant.size, variant.color].filter(Boolean).join(' / ');
      // Accept custom price from POS (e.g. cashier override); fall back to variant price
      const unitPrice = (item.customPrice != null && item.customPrice > 0) ? item.customPrice : variant.price;

      saleItems.push({
        product: product._id,
        productName: product.name,
        variantIndex: vi,
        variantLabel: label,
        quantity: item.quantity,
        price: unitPrice,
        costPrice: variant.costPrice || 0,
        total: unitPrice * item.quantity,
      });
    }

    // ── Phase 2: Atomically deduct stock for each item ────────
    // Uses $inc with a guard so we can't go negative even under concurrent load
    for (const item of saleItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          [`variants.${item.variantIndex}.stock`]: { $gte: item.quantity },
        },
        {
          $inc: { [`variants.${item.variantIndex}.stock`]: -item.quantity },
        },
        { new: true }
      );

      if (!updated) {
        // Another concurrent sale depleted the stock between validation and now — roll back
        for (const done of deductedItems) {
          await Product.findOneAndUpdate(
            { _id: done.product },
            { $inc: { [`variants.${done.variantIndex}.stock`]: done.quantity } }
          );
        }
        return res.status(409).json({
          error: `Stock just ran out for "${item.productName}"${item.variantLabel ? ` (${item.variantLabel})` : ''}. Please refresh and try again.`,
        });
      }

      const newVariantStock = updated.variants[item.variantIndex].stock;
      const previousStock = newVariantStock + item.quantity;

      deductedItems.push({ product: item.product, variantIndex: item.variantIndex, quantity: item.quantity });

      // Inventory record
      await Inventory.create({
        product: item.product,
        variantIndex: item.variantIndex,
        type: 'out',
        quantity: item.quantity,
        previousStock,
        newStock: newVariantStock,
        referenceType: 'sale',
        notes: `POS sale (pending receipt)`,
        performedBy: req.user.id,
      });
    }

    // ── Phase 3: Create sale record ───────────────────────────
    const subtotal = saleItems.reduce((s, i) => s + i.total, 0);
    let discountAmount = 0;
    if (discount > 0) {
      discountAmount = discountType === 'percent'
        ? Math.round((subtotal * discount) / 100 * 100) / 100
        : discount;
    }

    // Handle loyalty points redemption (100 points = ₦1)
    let loyaltyDiscount = 0;
    if (loyaltyPointsToRedeem > 0 && customerPhone) {
      const customer = await Customer.findOne({ phone: customerPhone });
      if (customer && customer.loyaltyPoints >= loyaltyPointsToRedeem) {
        loyaltyDiscount = loyaltyPointsToRedeem / 100;
        customer.loyaltyPoints -= loyaltyPointsToRedeem;
        customer.pointsRedeemed += loyaltyPointsToRedeem;
        await customer.save();
      }
    }

    const total = Math.max(0, subtotal - discountAmount - loyaltyDiscount);

    // Handle split payments
    let finalAmountPaid = total;
    let finalChange = 0;
    let finalPaymentMethod = paymentMethod;

    if (paymentMethod === 'split' && splitPayments && splitPayments.length > 0) {
      const totalPaid = splitPayments.reduce((s, p) => s + p.amount, 0);
      finalAmountPaid = totalPaid;
      finalChange = Math.max(0, totalPaid - total);
    } else if (paymentMethod === 'cash') {
      finalAmountPaid = amountPaid;
      finalChange = Math.max(0, amountPaid - total);
    }

    const sale = new Sale({
      items: saleItems,
      subtotal,
      discount,
      discountType,
      discountAmount,
      total,
      paymentMethod: finalPaymentMethod,
      splitPayments: paymentMethod === 'split' ? splitPayments : undefined,
      amountPaid: finalAmountPaid,
      change: finalChange,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      ageVerified,
      ageVerifiedAt: ageVerified ? new Date() : undefined,
      notes: notes || undefined,
      cashier: req.user.id,
      cashierName: req.user.name,
      register: req.body.registerId || undefined,
    });
    await sale.save();

    // Track loyalty points if customer provided
    if (customerPhone) {
      await trackSale(sale);
    }

    // Back-fill receipt number on inventory records
    await Inventory.updateMany(
      { reference: { $exists: false }, notes: 'POS sale (pending receipt)', performedBy: req.user.id,
        product: { $in: saleItems.map(i => i.product) }, referenceType: 'sale',
        createdAt: { $gte: new Date(Date.now() - 10000) } },
      { $set: { reference: sale._id.toString(), notes: `POS Sale ${sale.receiptNumber}` } }
    );

    const populated = await Sale.findById(sale._id)
      .populate('cashier', 'name email')
      .populate('items.product', 'name images');

    res.status(201).json(populated);
  } catch (err) {
    // Attempt rollback if stock was already deducted but sale failed
    for (const done of deductedItems) {
      await Product.findOneAndUpdate(
        { _id: done.product },
        { $inc: { [`variants.${done.variantIndex}.stock`]: done.quantity } }
      ).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/sales
exports.getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, date, status, cashierId, search, registerId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {};
    // Staff can only see their own sales; admin sees all (or filtered by cashierId)
    if (req.user.role === 'staff') filter.cashier = req.user.id;
    else if (cashierId) filter.cashier = cashierId;
    if (status) filter.status = status;
    if (registerId) filter.register = registerId;
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { cashierName: { $regex: search, $options: 'i' } },
      ];
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('cashier', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Sale.countDocuments(filter),
    ]);

    res.json({ sales, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/sales/summary
exports.getSalesSummary = async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const filter = { createdAt: { $gte: start, $lte: end }, status: 'completed' };
    if (req.user.role === 'staff') filter.cashier = req.user.id;

    const sales = await Sale.find(filter).lean();

    // Revenue includes refund negatives for accurate net revenue
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    // Count only original sales (not refund records)
    const totalCount = sales.filter(s => s.type !== 'refund').length;
    const totalRefunds = sales.filter(s => s.type === 'refund').length;
    // Net items: original qty sold minus returned qty
    const soldItems = sales.filter(s => s.type !== 'refund')
      .reduce((s, sale) => s + sale.items.reduce((ss, i) => ss + i.quantity, 0), 0);
    const returnedItems = sales.filter(s => s.type === 'refund')
      .reduce((s, sale) => s + sale.items.reduce((ss, i) => ss + i.quantity, 0), 0);
    const totalItems = Math.max(0, soldItems - returnedItems);
    const byMethod = { cash: 0, card: 0, transfer: 0 };
    for (const sale of sales) {
      // sum all (incl. refund negatives) per payment method for net cash position
      byMethod[sale.paymentMethod] = (byMethod[sale.paymentMethod] || 0) + sale.total;
    }

    res.json({ totalRevenue, totalCount, totalRefunds, totalItems, byMethod, date: today.toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/sales/:id
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name email')
      .populate('items.product', 'name images');
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/sales/:id/void
exports.voidSale = async (req, res) => {
  try {
    const { reason } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status === 'voided') return res.status(400).json({ error: 'Sale already voided' });

    sale.status = 'voided';
    sale.voidedAt = new Date();
    sale.voidReason = reason || 'Voided by staff';
    await sale.save();

    // Restore stock
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      const variant = product.variants[item.variantIndex];
      if (!variant) continue;
      const previousStock = variant.stock ?? 0;
      const newStock = previousStock + item.quantity;
      product.variants[item.variantIndex].stock = newStock;
      product.markModified('variants');
      await product.save();

      await Inventory.create({
        product: item.product,
        variantIndex: item.variantIndex,
        type: 'return',
        quantity: item.quantity,
        previousStock,
        newStock,
        reference: sale._id.toString(),
        referenceType: 'return',
        notes: `Voided POS Sale ${sale.receiptNumber}: ${reason || ''}`,
        performedBy: req.user.id,
      });
    }

    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Staff management (admin only) ──────────────────────────────

// GET /api/admin/staff/:id
exports.getStaffById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role !== 'staff') return res.status(404).json({ error: 'Staff not found' });

    // Aggregate sales stats for this staff
    const [allTime, today] = await Promise.all([
      Sale.aggregate([
        { $match: { cashier: user._id, status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalSales: { $sum: 1 }, totalItems: { $sum: { $sum: '$items.quantity' } } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            cashier: user._id,
            status: 'completed',
            createdAt: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              $lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalSales: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      staff: user,
      stats: {
        allTime: allTime[0] || { totalRevenue: 0, totalSales: 0, totalItems: 0 },
        today: today[0] || { totalRevenue: 0, totalSales: 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/staff
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/staff
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: 'staff' });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/staff/:id
exports.updateStaff = async (req, res) => {
  try {
    const { name, email, isActive, password } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (password) update.password = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Staff not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/staff/:id
exports.deleteStaff = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/sales/:id/refund  — partial or full item-level refund
exports.refundSaleItems = async (req, res) => {
  try {
    const { items, reason } = req.body;
    // items: [{ saleItemIndex: number, quantity: number }]
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items specified for refund' });

    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status === 'voided') return res.status(400).json({ error: 'Sale already voided' });
    if (sale.type === 'refund') return res.status(400).json({ error: 'Cannot refund a refund record' });

    // Validate each refund item
    for (const ri of items) {
      const saleItem = sale.items[ri.saleItemIndex];
      if (!saleItem) return res.status(400).json({ error: `Invalid item index ${ri.saleItemIndex}` });
      const maxRefundable = saleItem.quantity - (saleItem.refundedQty || 0);
      if (ri.quantity < 1 || ri.quantity > maxRefundable) {
        return res.status(400).json({
          error: `Cannot refund ${ri.quantity} of "${saleItem.productName}" — only ${maxRefundable} available`,
        });
      }
    }

    // ── Phase 1: Restore stock + inventory records ────────────
    for (const ri of items) {
      const saleItem = sale.items[ri.saleItemIndex];
      const product = await Product.findById(saleItem.product);
      if (product && product.variants[saleItem.variantIndex]) {
        const previousStock = product.variants[saleItem.variantIndex].stock ?? 0;
        const newStock = previousStock + ri.quantity;
        product.variants[saleItem.variantIndex].stock = newStock;
        product.markModified('variants');
        await product.save();

        await Inventory.create({
          product: saleItem.product,
          variantIndex: saleItem.variantIndex,
          type: 'return',
          quantity: ri.quantity,
          previousStock,
          newStock,
          reference: sale._id.toString(),
          referenceType: 'return',
          notes: `Refund from POS Sale ${sale.receiptNumber}${reason ? ': ' + reason : ''}`,
          performedBy: req.user.id,
        });
      }

      sale.items[ri.saleItemIndex].refundedQty = (sale.items[ri.saleItemIndex].refundedQty || 0) + ri.quantity;
    }

    // ── Phase 2: If all items fully refunded → void the original sale ──
    const allRefunded = sale.items.every(item => (item.refundedQty || 0) >= item.quantity);
    if (allRefunded) {
      sale.status = 'voided';
      sale.voidedAt = new Date();
      sale.voidReason = reason || 'Fully refunded';
    }

    sale.markModified('items');
    await sale.save();

    // ── Phase 3: Create a refund sale record (negative amounts) ──
    // The discount on the original is proportional: refund = item price × (total/subtotal) ratio
    const discountRatio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;

    const refundSaleItems = items.map(ri => {
      const saleItem = sale.items[ri.saleItemIndex];
      const unitPrice = Math.abs(saleItem.price);                     // original price per unit
      const effectivePrice = Math.round(unitPrice * discountRatio * 100) / 100; // after discount
      return {
        product: saleItem.product,
        productName: saleItem.productName,
        variantIndex: saleItem.variantIndex,
        variantLabel: saleItem.variantLabel,
        quantity: ri.quantity,
        price: -effectivePrice,                                        // negative
        costPrice: saleItem.costPrice || 0,
        total: -Math.round(effectivePrice * ri.quantity * 100) / 100, // negative
        refundedQty: 0,
      };
    });

    const refundTotal = refundSaleItems.reduce((s, i) => s + i.total, 0); // negative

    const refundSale = new Sale({
      type: 'refund',
      originalSale: sale._id,
      items: refundSaleItems,
      subtotal: refundTotal,
      discount: 0,
      discountType: 'fixed',
      discountAmount: 0,
      total: refundTotal,
      paymentMethod: sale.paymentMethod,
      amountPaid: refundTotal, // negative = money returned to customer
      change: 0,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      notes: reason ? `Refund: ${reason}` : `Return from ${sale.receiptNumber}`,
      cashier: req.user.id,
      cashierName: req.user.name,
      register: sale.register,
      status: 'completed',
    });

    await refundSale.save();

    // Populate and return both records
    const [updatedOriginal, populatedRefund] = await Promise.all([
      Sale.findById(sale._id).populate('cashier', 'name email').populate('items.product', 'name images'),
      Sale.findById(refundSale._id).populate('cashier', 'name email').populate('items.product', 'name images'),
    ]);

    res.json({ original: updatedOriginal, refund: populatedRefund });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Register / Session ─────────────────────────────────────────

// GET /api/pos/register/sessions
exports.getRegisterSessions = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    // Admin and staff can see all sessions
    const filter = {};

    const sessions = await Register.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // For open sessions, compute live totals from sales
    const enriched = await Promise.all(sessions.map(async session => {
      if (session.status !== 'open') return session;
      const sales = await Sale.find({ register: session._id, status: 'completed' }).lean();
      session.liveTotalSales = sales.filter(s => s.type !== 'refund').length;
      session.liveTotalRevenue = sales.reduce((s, x) => s + x.total, 0);
      session.liveRefunds = sales.filter(s => s.type === 'refund').length;
      return session;
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/register/open
exports.openRegister = async (req, res) => {
  try {
    // Only one open register allowed at a time (global, not per user)
    const existing = await Register.findOne({ status: 'open' });
    if (existing) return res.json(existing);

    const { openingBalance = 0 } = req.body;
    const register = await Register.create({
      cashier: req.user.id,
      cashierName: req.user.name,
      openingBalance,
    });
    res.status(201).json(register);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/register/current
exports.getCurrentRegister = async (req, res) => {
  try {
    // Get any open register (admin/staff can access the open session)
    const register = await Register.findOne({ status: 'open' }).sort({ createdAt: -1 });
    if (!register) return res.json(null);
    res.json(register);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/register/cash  (cash in or out)
exports.recordCashMovement = async (req, res) => {
  try {
    const { registerId, type, amount, reason } = req.body;
    if (!registerId) return res.status(400).json({ error: 'registerId is required' });
    if (!['in', 'out'].includes(type)) return res.status(400).json({ error: 'type must be in or out' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    const register = await Register.findById(registerId);
    if (!register || register.status !== 'open') return res.status(400).json({ error: 'Register not found or already closed' });

    const movement = await CashMovement.create({
      register: registerId,
      type,
      amount,
      reason,
      performedBy: req.user.id,
      performedByName: req.user.name,
    });
    res.status(201).json(movement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/register/:id/report  — session summary for closing
exports.getRegisterReport = async (req, res) => {
  try {
    const register = await Register.findById(req.params.id);
    if (!register) return res.status(404).json({ error: 'Register not found' });

    const [sales, movements] = await Promise.all([
      Sale.find({ register: register._id, status: 'completed' })
        .populate('cashier', 'name email')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .lean(),
      CashMovement.find({ register: register._id }).sort({ createdAt: 1 }).lean(),
    ]);

    const originalSales = sales.filter(s => s.type !== 'refund');
    const refundSales   = sales.filter(s => s.type === 'refund');

    const totalRevenue  = sales.reduce((s, x) => s + x.total, 0);  // net
    const totalCash     = sales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
    const totalCard     = sales.filter(s => s.paymentMethod === 'card').reduce((s, x) => s + x.total, 0);
    const totalTransfer = sales.filter(s => s.paymentMethod === 'transfer').reduce((s, x) => s + x.total, 0);
    const totalCashIn   = movements.filter(m => m.type === 'in').reduce((s, x) => s + x.amount, 0);
    const totalCashOut  = movements.filter(m => m.type === 'out').reduce((s, x) => s + x.amount, 0);
    const expectedCash  = register.openingBalance + totalCash + totalCashIn - totalCashOut;

    // Net items: original qty - returned qty
    const soldItems     = originalSales.reduce((s, x) => s + x.items.reduce((ss, i) => ss + i.quantity, 0), 0);
    const returnedItems = refundSales.reduce((s, x) => s + x.items.reduce((ss, i) => ss + i.quantity, 0), 0);
    const totalItems    = Math.max(0, soldItems - returnedItems);

    res.json({
      register,
      totalSales: originalSales.length,
      totalRefunds: refundSales.length,
      totalRevenue,
      totalItems,
      totalCash,
      totalCard,
      totalTransfer,
      totalCashIn,
      totalCashOut,
      expectedCash,
      movements,
      sales,   // all (sales + refunds), sorted newest first, populated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/register/close
exports.closeRegister = async (req, res) => {
  try {
    const { registerId, closingBalance, notes } = req.body;
    if (!registerId) return res.status(400).json({ error: 'registerId is required' });

    const register = await Register.findById(registerId);
    if (!register || register.status !== 'open') return res.status(400).json({ error: 'Register not found or already closed' });

    // Compute session totals
    const [sales, movements] = await Promise.all([
      Sale.find({ register: register._id, status: 'completed' }).lean(),
      CashMovement.find({ register: register._id }).lean(),
    ]);

    const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
    const totalCash = sales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
    const totalCard = sales.filter(s => s.paymentMethod === 'card').reduce((s, x) => s + x.total, 0);
    const totalTransfer = sales.filter(s => s.paymentMethod === 'transfer').reduce((s, x) => s + x.total, 0);
    const totalCashIn = movements.filter(m => m.type === 'in').reduce((s, x) => s + x.amount, 0);
    const totalCashOut = movements.filter(m => m.type === 'out').reduce((s, x) => s + x.amount, 0);
    const expectedCash = register.openingBalance + totalCash + totalCashIn - totalCashOut;
    const countedCash = closingBalance ?? expectedCash;

    register.status = 'closed';
    register.closedAt = new Date();
    register.closingBalance = countedCash;
    register.expectedCash = expectedCash;
    register.difference = countedCash - register.openingBalance;
    register.totalSales = sales.length;
    register.totalRevenue = totalRevenue;
    register.totalCash = totalCash;
    register.totalCard = totalCard;
    register.totalTransfer = totalTransfer;
    register.totalCashIn = totalCashIn;
    register.totalCashOut = totalCashOut;
    register.notes = notes || undefined;
    await register.save();

    res.json({ register, expectedCash, difference: register.difference });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/products/:id/sales-stats
exports.getProductSalesStats = async (req, res) => {
  try {
    const { id } = req.params;

    const sales = await Sale.find({ 'items.product': id }).lean();

    let totalSold = 0;
    let totalReturned = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    const variantMap = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        if (String(item.product) !== String(id)) continue;
        const vi = item.variantIndex ?? 0;
        if (!variantMap[vi]) variantMap[vi] = { sold: 0, returned: 0, revenue: 0 };

        if (sale.type === 'refund') {
          totalReturned += item.quantity;
          variantMap[vi].returned += item.quantity;
          totalRevenue += item.total; // negative
        } else if (sale.status !== 'voided') {
          totalSold += item.quantity;
          variantMap[vi].sold += item.quantity;
          variantMap[vi].revenue += item.total;
          totalRevenue += item.total;
          totalCost += (item.costPrice || 0) * item.quantity;
        }
      }
    }

    const netSold = Math.max(0, totalSold - totalReturned);
    const grossProfit = totalRevenue - totalCost;

    res.json({ totalSold, totalReturned, netSold, totalRevenue, totalCost, grossProfit, byVariant: variantMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Offline Mode ────────────────────────────────────────────────

// POST /api/pos/offline/queue - Queue sale for later sync
exports.queueOfflineSale = async (req, res) => {
  try {
    const { items, subtotal, discount, discountType, discountAmount, total, paymentMethod, amountPaid, change, customerName, customerPhone, notes, deviceId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const offlineSale = await OfflineSale.create({
      items,
      subtotal,
      discount,
      discountType,
      discountAmount,
      total,
      paymentMethod,
      amountPaid,
      change,
      customerName,
      customerPhone,
      notes,
      cashierId: req.user.id,
      cashierName: req.user.name,
      deviceId,
      status: 'pending',
    });

    res.status(201).json({ queued: true, offlineSaleId: offlineSale._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pos/offline/queue - Get queued offline sales for this device/cashier
exports.getOfflineQueue = async (req, res) => {
  try {
    const { deviceId } = req.query;
    const filter = { status: 'pending' };
    if (deviceId) filter.deviceId = deviceId;
    if (req.user.role === 'staff') filter.cashierId = req.user.id;

    const queue = await OfflineSale.find(filter).sort({ createdAt: 1 });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pos/offline/sync - Sync all queued sales
exports.syncOfflineSales = async (req, res) => {
  try {
    const { deviceId } = req.body;

    const pendingSales = await OfflineSale.find({
      status: 'pending',
      ...(deviceId ? { deviceId } : {}),
      ...(req.user.role === 'staff' ? { cashierId: req.user.id } : {}),
    });

    const synced = [];
    const failed = [];

    for (const offlineSale of pendingSales) {
      try {
        // Process each queued sale like a normal sale
        const saleItems = [];
        let hasError = false;

        for (const item of offlineSale.items) {
          const product = await Product.findById(item.productId);
          if (!product) {
            hasError = true;
            offlineSale.error = `Product not found: ${item.productId}`;
            continue;
          }

          const vi = item.variantIndex ?? 0;
          const variant = product.variants[vi];
          if (!variant) {
            hasError = true;
            offlineSale.error = `Invalid variant: ${vi}`;
            continue;
          }

          const currentStock = variant.stock ?? 0;
          if (currentStock < item.quantity) {
            hasError = true;
            offlineSale.error = `Insufficient stock`;
            continue;
          }

          // Deduct stock
          product.variants[vi].stock = currentStock - item.quantity;
          await product.save();

          saleItems.push({
            product: product._id,
            productName: product.name,
            variantIndex: vi,
            variantLabel: [variant.size, variant.color].filter(Boolean).join(' / '),
            quantity: item.quantity,
            price: item.price,
            costPrice: variant.costPrice || 0,
            total: item.total,
          });
        }

        if (hasError) {
          offlineSale.status = 'failed';
          await offlineSale.save();
          failed.push(offlineSale._id);
          continue;
        }

        // Create actual sale
        const sale = new Sale({
          items: saleItems,
          subtotal: offlineSale.subtotal,
          discount: offlineSale.discount,
          discountType: offlineSale.discountType,
          discountAmount: offlineSale.discountAmount,
          total: offlineSale.total,
          paymentMethod: offlineSale.paymentMethod,
          amountPaid: offlineSale.amountPaid,
          change: offlineSale.change,
          customerName: offlineSale.customerName,
          customerPhone: offlineSale.customerPhone,
          notes: offlineSale.notes,
          cashier: offlineSale.cashierId,
          cashierName: offlineSale.cashierName,
          status: 'completed',
        });

        await sale.save();

        // Track loyalty
        if (offlineSale.customerPhone) {
          await trackSale(sale);
        }

        offlineSale.status = 'synced';
        offlineSale.syncedAt = new Date();
        await offlineSale.save();

        synced.push({ offlineId: offlineSale._id, saleId: sale._id });
      } catch (err) {
        offlineSale.error = err.message;
        offlineSale.status = 'failed';
        await offlineSale.save();
        failed.push(offlineSale._id);
      }
    }

    res.json({ synced, failed, total: pendingSales.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/pos/offline/queue/:id - Remove from queue without syncing
exports.deleteOfflineSale = async (req, res) => {
  try {
    const sale = await OfflineSale.findOne({
      _id: req.params.id,
      status: 'pending',
    });
    if (!sale) return res.status(404).json({ error: 'Queued sale not found' });

    await sale.deleteOne();
    res.json({ message: 'Removed from queue' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
