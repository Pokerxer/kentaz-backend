const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, total, paystackRef } = req.body;
    const order = new Order({
      user: req.user.id,
      items,
      shippingAddress,
      total,
      paystackRef,
      paystackStatus: 'pending',
    });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user.id };

    const order = await Order.findOne(filter)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images slug category');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const User = require('../models/User');
      const users = await User.find({
        $or: [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const userIds = users.map(u => u._id);
      const orClauses = [{ user: { $in: userIds } }];
      if (/^[a-f\d]{24}$/i.test(search)) orClauses.push({ _id: search });
      filter.$or = orClauses;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total, statusCounts] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]),
    ]);

    const statusMap = {};
    let totalRevenue = 0;
    for (const s of statusCounts) {
      statusMap[s._id] = { count: s.count, revenue: s.revenue };
      if (s._id !== 'cancelled') totalRevenue += s.revenue;
    }

    res.json({ orders, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), statusCounts: statusMap, totalRevenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images slug category');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
