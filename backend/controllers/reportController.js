const Sale = require('../models/Sale');
const Register = require('../models/Register');
const User = require('../models/User');

// GET /api/reports/x - Mid-day sales summary
exports.getXReport = async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const filter = { createdAt: { $gte: start, $lte: end }, status: 'completed' };
    if (req.user.role === 'staff') filter.cashier = req.user.id;

    const sales = await Sale.find(filter).lean();

    const originalSales = sales.filter(s => s.type !== 'refund');
    const refundSales = sales.filter(s => s.type === 'refund');

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalSales = originalSales.length;
    const totalRefunds = refundSales.length;

    const byMethod = { cash: 0, card: 0, transfer: 0, split: 0 };
    for (const sale of sales) {
      if (sale.paymentMethod === 'split' && sale.splitPayments) {
        for (const sp of sale.splitPayments) {
          byMethod[sp.method] = (byMethod[sp.method] || 0) + sp.amount;
        }
      } else {
        byMethod[sale.paymentMethod] = (byMethod[sale.paymentMethod] || 0) + sale.total;
      }
    }

    res.json({
      type: 'X-Report',
      generatedAt: new Date().toISOString(),
      period: { start: start.toISOString(), end: end.toISOString() },
      totalRevenue,
      totalSales,
      totalRefunds,
      byMethod,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/z - End-of-day closing report
exports.getZReport = async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const filter = { createdAt: { $gte: start, $lte: end }, status: 'completed' };
    if (req.user.role === 'staff') filter.cashier = req.user.id;

    const [sales, register] = await Promise.all([
      Sale.find(filter).lean(),
      Register.findOne({ cashier: req.user.id, status: 'open' }).sort({ createdAt: -1 }),
    ]);

    const originalSales = sales.filter(s => s.type !== 'refund');
    const refundSales = sales.filter(s => s.type === 'refund');

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalSales = originalSales.length;
    const totalRefunds = refundSales.length;
    const totalItems = originalSales.reduce((s, sale) => s + sale.items.reduce((ss, i) => ss + i.quantity, 0), 0);

    const byMethod = { cash: 0, card: 0, transfer: 0 };
    for (const sale of sales) {
      if (sale.paymentMethod === 'split' && sale.splitPayments) {
        for (const sp of sale.splitPayments) {
          byMethod[sp.method] = (byMethod[sp.method] || 0) + sp.amount;
        }
      } else {
        byMethod[sale.paymentMethod] = (byMethod[sale.paymentMethod] || 0) + sale.total;
      }
    }

    // Calculate expected cash if register is open
    let expectedCash = null;
    if (register) {
      const cashSales = byMethod.cash;
      expectedCash = register.openingBalance + cashSales;
    }

    res.json({
      type: 'Z-Report',
      generatedAt: new Date().toISOString(),
      date: today.toISOString().split('T')[0],
      totalRevenue,
      totalSales,
      totalRefunds,
      totalItems,
      byMethod,
      register: register ? { openingBalance: register.openingBalance, expectedCash } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/hourly - Hourly sales breakdown
exports.getHourlySales = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

    const filter = { createdAt: { $gte: start, $lte: end }, status: 'completed' };
    if (req.user.role === 'staff') filter.cashier = req.user.id;

    const sales = await Sale.find(filter).lean();

    // Group by hour
    const hourly = {};
    for (let h = 0; h < 24; h++) {
      hourly[h] = { count: 0, revenue: 0, items: 0 };
    }

    for (const sale of sales) {
      if (sale.type === 'refund') continue;
      const hour = new Date(sale.createdAt).getHours();
      hourly[hour].count += 1;
      hourly[hour].revenue += sale.total;
      hourly[hour].items += sale.items.reduce((s, i) => s + i.quantity, 0);
    }

    // Format for response
    const result = Object.entries(hourly).map(([hour, data]) => ({
      hour: parseInt(hour),
      label: `${hour}:00`,
      ...data,
    }));

    res.json({ date: targetDate.toISOString().split('T')[0], hourly: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/staff - Staff performance
exports.getStaffPerformance = async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;

    const filter = { status: 'completed', type: 'sale' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Aggregate by cashier
    const staffStats = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$cashier',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
    ]);

    // Populate staff names
    const cashierIds = staffStats.map(s => s._id).filter(Boolean);
    const staffMembers = await User.find({ _id: { $in: cashierIds } }).select('name').lean();

    const staffMap = {};
    for (const staff of staffMembers) {
      staffMap[staff._id.toString()] = staff.name;
    }

    const result = staffStats.map(stat => ({
      cashierId: stat._id,
      cashierName: staffMap[stat._id?.toString()] || 'Unknown',
      totalSales: stat.totalSales,
      totalRevenue: stat.totalRevenue,
      totalItems: stat.totalItems,
    }));

    res.json({ staff: result, period: { startDate, endDate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/summary - Overall summary
exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { status: 'completed', type: 'sale' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [sales, counts] = await Promise.all([
      Sale.find(filter).lean(),
      Sale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalSales: { $sum: 1 },
            totalItems: { $sum: { $sum: '$items.quantity' } },
          },
        },
      ]),
    ]);

    const summary = counts[0] || { totalRevenue: 0, totalSales: 0, totalItems: 0 };

    // Top selling products
    const productSales = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productName;
        if (!productSales[key]) productSales[key] = { quantity: 0, revenue: 0 };
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.total;
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({ summary, topProducts, period: { startDate, endDate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;