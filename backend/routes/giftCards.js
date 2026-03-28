const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const GiftCard = require('../models/GiftCard');

// ── Code generator ──────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (ambiguous)
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KENT-${seg()}-${seg()}`;
}

// ── Admin: List all gift cards ──────────────────────────────────
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      const regex = { $regex: search.toUpperCase(), $options: 'i' };
      filter.$or = [{ code: regex }, { recipientName: regex }, { recipientEmail: regex }, { purchaserName: regex }];
    }

    const cards = await GiftCard.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await GiftCard.countDocuments(filter);

    // Apply status filter after fetch (status is a virtual)
    const filtered = status && status !== 'all'
      ? cards.filter(c => c.status === status)
      : cards;

    // Aggregate stats
    const all = await GiftCard.find({});
    const stats = {
      total: all.length,
      active: all.filter(c => c.status === 'active').length,
      totalIssued: all.reduce((s, c) => s + c.initialBalance, 0),
      totalRedeemed: all.reduce((s, c) => s + (c.initialBalance - c.balance), 0),
      totalRemaining: all.reduce((s, c) => s + c.balance, 0),
    };

    res.json({ cards: filtered, total, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Get one ──────────────────────────────────────────────
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const card = await GiftCard.findById(req.params.id).populate('purchasedBy', 'name email');
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Create ───────────────────────────────────────────────
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      code, initialBalance,
      recipientName, recipientEmail, note,
      purchaserName, purchaserEmail,
      expiryDate, isActive,
    } = req.body;

    if (!initialBalance || initialBalance <= 0) {
      return res.status(400).json({ error: 'initialBalance must be greater than 0' });
    }

    const finalCode = (code || '').toUpperCase().trim() || generateCode();

    const existing = await GiftCard.findOne({ code: finalCode });
    if (existing) return res.status(400).json({ error: 'Gift card code already exists' });

    const card = new GiftCard({
      code: finalCode,
      initialBalance,
      balance: initialBalance,
      recipientName: recipientName || '',
      recipientEmail: recipientEmail || '',
      note: note || '',
      purchaserName: purchaserName || '',
      purchaserEmail: purchaserEmail || '',
      expiryDate: expiryDate || null,
      isActive: isActive !== false,
      usageHistory: [{
        type: 'credit',
        amount: initialBalance,
        balanceAfter: initialBalance,
        description: 'Initial issue',
        performedBy: 'admin',
      }],
    });

    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Update ───────────────────────────────────────────────
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const card = await GiftCard.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Gift card not found' });

    const fields = ['recipientName', 'recipientEmail', 'note', 'purchaserName', 'purchaserEmail', 'expiryDate', 'isActive'];
    fields.forEach(f => { if (req.body[f] !== undefined) card[f] = req.body[f]; });

    // Allow balance adjustment
    if (req.body.balance !== undefined && req.body.balance !== card.balance) {
      const diff = req.body.balance - card.balance;
      card.usageHistory.push({
        type: diff > 0 ? 'credit' : 'debit',
        amount: Math.abs(diff),
        balanceAfter: req.body.balance,
        description: req.body.adjustmentReason || 'Admin adjustment',
        performedBy: 'admin',
      });
      card.balance = req.body.balance;
    }

    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Delete ───────────────────────────────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const card = await GiftCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    res.json({ message: 'Gift card deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: Validate a gift card code ──────────────────────────
router.post('/validate', async (req, res) => {
  try {
    const { code, amount = 0 } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
    if (!card) return res.json({ valid: false, error: 'Invalid gift card code' });
    if (!card.isActive) return res.json({ valid: false, error: 'This gift card is inactive' });
    if (card.expiryDate && new Date() > new Date(card.expiryDate)) {
      return res.json({ valid: false, error: 'This gift card has expired' });
    }
    if (card.balance <= 0) return res.json({ valid: false, error: 'This gift card has no remaining balance' });

    const usable = Math.min(card.balance, amount || card.balance);

    res.json({
      valid: true,
      card: { _id: card._id, code: card.code, balance: card.balance },
      usableAmount: usable,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Debit (use) a gift card ─────────────────────────────────────
router.post('/:id/debit', auth, async (req, res) => {
  try {
    const { amount, description, orderId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const card = await GiftCard.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    if (!card.isActive) return res.status(400).json({ error: 'Gift card is inactive' });
    if (card.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    card.balance -= amount;
    card.usageHistory.push({
      type: 'debit',
      amount,
      balanceAfter: card.balance,
      description: description || 'Redemption',
      orderId: orderId || null,
      performedBy: req.user?.role || 'system',
    });

    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Credit (top-up) a gift card ─────────────────────────────────
router.post('/:id/credit', auth, adminOnly, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const card = await GiftCard.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Gift card not found' });

    card.balance += amount;
    card.usageHistory.push({
      type: 'credit',
      amount,
      balanceAfter: card.balance,
      description: description || 'Top-up',
      performedBy: 'admin',
    });

    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate a unique code (utility) ───────────────────────────
router.get('/generate-code', auth, adminOnly, async (req, res) => {
  let code, exists;
  do {
    code = generateCode();
    exists = await GiftCard.findOne({ code });
  } while (exists);
  res.json({ code });
});

module.exports = router;
