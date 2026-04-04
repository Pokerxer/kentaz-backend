const Sale = require('../models/Sale');
const { sendEmail } = require('../utils/email');

function getReceiptHtml(sale, options = {}) {
  const { printMode = false } = options;

  const itemsList = sale.items
    .map(item => {
      const lineTotal = item.total > 0 ? item.total : -item.total;
      return `
        <tr>
          <td style="padding: 2px 0;">
            <strong style="font-size: 11px;">${item.productName}</strong>
            ${item.variantLabel ? `<br><span style="font-size: 9px;">${item.variantLabel}</span>` : ''}
            <br><span style="font-size: 9px;">${item.quantity} x ${item.price}</span>
          </td>
          <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 600;">${lineTotal}</td>
        </tr>
      `;
    })
    .join('');

  const paymentLines = sale.paymentMethod === 'split' && sale.splitPayments
    ? sale.splitPayments.map(p => `<tr><td style="padding: 1px 0; font-size: 10px; text-transform: capitalize;">${p.method}</td><td style="padding: 1px 0; text-align: right; font-size: 10px;">${p.amount}</td></tr>`).join('')
    : `<tr><td style="padding: 1px 0; font-size: 10px; text-transform: capitalize;">${sale.paymentMethod}</td><td style="padding: 1px 0; text-align: right; font-size: 10px;">${sale.amountPaid}</td></tr>`;

  const date = new Date(sale.createdAt);
  const dateStr = date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${sale.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; background: #fff; padding: 5px; font-size: 12px; line-height: 1.3; }
        .receipt { max-width: 280px; margin: 0 auto; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .border-top { border-top: 1px dashed #000; }
        .border-bottom { border-bottom: 1px dashed #000; }
        .border-double { border-top: 3px double #000; border-bottom: 3px double #000; padding: 5px 0; }
        .header { padding: 8px 0; }
        .header h1 { font-size: 18px; letter-spacing: 2px; }
        .header .tagline { font-size: 9px; }
        .info { padding: 5px 0; font-size: 10px; }
        .info-row { display: flex; justify-content: space-between; padding: 1px 0; }
        .items { padding: 5px 0; }
        .items table { width: 100%; }
        .totals { padding: 5px 0; }
        .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
        .totals-row.discount { color: #c00; }
        .totals-row.total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px; }
        .payment { padding: 5px 0; font-size: 11px; }
        .payment h4 { font-size: 9px; text-transform: uppercase; margin-bottom: 3px; }
        .payment-row { display: flex; justify-content: space-between; padding: 1px 0; }
        .payment-row.change { font-weight: bold; padding: 3px 0; margin-top: 3px; }
        .customer { padding: 5px 0; font-size: 10px; }
        .footer { padding: 8px 0; font-size: 9px; }
        .barcode { padding: 5px 0; }
        @media print {
          body { padding: 0; }
          @page { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header center border-double">
          <h1>KENTAZ</h1>
          <p class="tagline">Style & Elegance</p>
        </div>

        <div class="info border-bottom">
          <div class="info-row">
            <span class="bold">${sale.receiptNumber}</span>
            <span>${dateStr} ${timeStr}</span>
          </div>
        </div>
        ${sale.cashierName ? `<div class="info center" style="font-size: 10px;">Cashier: ${sale.cashierName}</div>` : ''}

        <div class="items border-bottom">
          <table>${itemsList}</table>
        </div>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${sale.subtotal}</span>
          </div>
          ${sale.discountAmount > 0 ? `
            <div class="totals-row discount">
              <span>Discount (${sale.discountType === 'percent' ? sale.discount + '%' : 'fixed'})</span>
              <span>-${sale.discountAmount}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>TOTAL</span>
            <span>${sale.total}</span>
          </div>
        </div>

        <div class="payment border-top border-bottom">
          <h4>Payment</h4>
          <table>${paymentLines}</table>
          ${sale.change > 0 ? `
            <div class="payment-row change">
              <span>Change</span>
              <span>${sale.change}</span>
            </div>
          ` : ''}
        </div>

        ${sale.customerName ? `
          <div class="customer">
            <div class="bold">Customer: ${sale.customerName}</div>
            ${sale.customerPhone ? `<div>${sale.customerPhone}</div>` : ''}
            ${sale.loyaltyPointsEarned > 0 ? `<div>+${sale.loyaltyPointsEarned} Points</div>` : ''}
          </div>
        ` : ''}

        <div class="footer center border-top">
          <p>Thank you for shopping with us!</p>
          <p>www.kentaz.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// GET /api/receipts - search receipts
exports.searchReceipts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { status: 'completed' };

    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('cashier', 'name')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Sale.countDocuments(filter),
    ]);

    res.json({ sales, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/receipts/:id
exports.getReceipt = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name')
      .populate('items.product', 'name images');

    if (!sale) return res.status(404).json({ error: 'Receipt not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/receipts/:id/send - email receipt
exports.sendReceipt = async (req, res) => {
  try {
    const { email } = req.body;
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name')
      .populate('items.product', 'name');

    if (!sale) return res.status(404).json({ error: 'Receipt not found' });

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const html = getReceiptHtml(sale);
    await sendEmail(email, `Receipt ${sale.receiptNumber}`, html);

    sale.receiptSent = true;
    sale.receiptSentAt = new Date();
    sale.receiptEmail = email;
    await sale.save();

    res.json({ success: true, message: 'Receipt sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/receipts/:id/pdf - generate receipt (returns HTML for printing)
exports.getReceiptPrint = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name')
      .populate('items.product', 'name');

    if (!sale) return res.status(404).json({ error: 'Receipt not found' });

    const html = getReceiptHtml(sale);
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;