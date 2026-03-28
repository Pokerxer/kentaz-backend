const mongoose = require('mongoose');
const { Schema } = mongoose;

const registerSchema = new Schema({
  cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName: { type: String, required: true },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number },
  expectedCash: { type: Number },
  difference: { type: Number },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  // Totals snapshot at close
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCash: { type: Number, default: 0 },
  totalCard: { type: Number, default: 0 },
  totalTransfer: { type: Number, default: 0 },
  totalCashIn: { type: Number, default: 0 },
  totalCashOut: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true });

registerSchema.index({ cashier: 1, status: 1 });
registerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Register', registerSchema);
