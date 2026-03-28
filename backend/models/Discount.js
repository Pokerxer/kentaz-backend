const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  value: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0 },
  // For percentage discounts: cap the max discount amount (null = uncapped)
  maxDiscount: { type: Number, default: null },
  applicableTo: {
    type: String,
    enum: ['all', 'categories', 'products'],
    default: 'all',
  },
  categories: [{ type: String }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  // Total usage limit (null = unlimited)
  usageLimit: { type: Number, default: null },
  usageCount: { type: Number, default: 0 },
  // Per-customer limit (null = unlimited)
  perCustomerLimit: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
