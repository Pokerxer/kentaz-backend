const Customer = require('../models/Customer');
const User = require('../models/User');
const Sale = require('../models/Sale');

// Points per Naira spent
const POINTS_PER_NAIRA = 1;
const POINTS_REDEMPTION_RATE = 100; // 100 points = ₦1 discount

// GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ lastVisit: -1 }).skip(skip).limit(parseInt(limit)),
      Customer.countDocuments(filter),
    ]);

    res.json({ customers, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/customers/:id
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Get recent purchases
    const sales = await Sale.find({ customer: customer._id, status: 'completed' })
      .populate('cashier', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ customer, recentSales: sales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, notes, tags } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    // Check if phone already exists
    const existing = await Customer.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Customer with this phone already exists' });

    const customer = await Customer.create({ name, email, phone, notes, tags });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, notes, tags } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, notes, tags },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/customers/lookup/:phone
exports.lookupByPhone = async (req, res) => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Get purchase history
    const sales = await Sale.find({ customer: customer._id, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ customer, recentSales: sales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/customers/:id/points/redeem
exports.redeemPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (!points || points < 1) return res.status(400).json({ error: 'Invalid points amount' });
    if (customer.loyaltyPoints < points) return res.status(400).json({ error: 'Insufficient points' });

    const discountValue = points / POINTS_REDEMPTION_RATE;

    customer.loyaltyPoints -= points;
    customer.pointsRedeemed += points;
    await customer.save();

    res.json({
      pointsRedeemed: points,
      discountValue,
      remainingPoints: customer.loyaltyPoints,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/customers/track - track a sale for loyalty points
exports.trackSale = async (sale) => {
  try {
    if (!sale.customerPhone) return;

    let customer = await Customer.findOne({ phone: sale.customerPhone });

    // If no customer record, create one
    if (!customer) {
      customer = await Customer.create({
        name: sale.customerName || 'Unknown',
        phone: sale.customerPhone,
      });
    }

    // Calculate points earned (1 point per Naira spent)
    const pointsEarned = Math.floor(sale.total);

    customer.totalPurchases += 1;
    customer.totalSpent += sale.total;
    customer.loyaltyPoints += pointsEarned;
    customer.visits += 1;
    customer.lastVisit = new Date();
    await customer.save();

    // Update sale with customer ref and points
    sale.customer = customer._id;
    sale.loyaltyPointsEarned = pointsEarned;
    await sale.save();

    return customer;
  } catch (err) {
    console.error('Error tracking loyalty:', err.message);
  }
};

// GET /api/customers/:id/history
exports.getPurchaseHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      Sale.find({ customer: req.params.id, status: 'completed' })
        .populate('cashier', 'name')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Sale.countDocuments({ customer: req.params.id, status: 'completed' }),
    ]);

    res.json({ sales, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;