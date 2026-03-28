const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  type: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, default: '' },
  orderId: { type: String, default: null },
  performedBy: { type: String, default: 'system' }, // 'admin' | 'customer' | 'pos' | 'system'
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const giftCardSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  initialBalance: { type: Number, required: true, min: 0 },
  balance: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  expiryDate: { type: Date, default: null },

  // Recipient info
  recipientName: { type: String, default: '' },
  recipientEmail: { type: String, default: '' },
  note: { type: String, default: '' },

  // Purchaser info
  purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  purchaserName: { type: String, default: '' },
  purchaserEmail: { type: String, default: '' },

  usageHistory: [usageSchema],
}, { timestamps: true });

// Virtual: status
giftCardSchema.virtual('status').get(function () {
  if (!this.isActive) return 'inactive';
  if (this.expiryDate && new Date() > new Date(this.expiryDate)) return 'expired';
  if (this.balance === 0) return 'exhausted';
  return 'active';
});

giftCardSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('GiftCard', giftCardSchema);
