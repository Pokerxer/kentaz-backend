const mongoose = require('mongoose');
const { Schema } = mongoose;

const bundleItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const productBundleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  items: { type: [bundleItemSchema], required: true, validate: v => v.length >= 2 },
  bundlePrice: { type: Number, required: true },
  compareAtPrice: Number, // Sum of individual prices
  discount: { type: Number, default: 0 }, // percent
  minQuantity: { type: Number, default: 1 }, // Buy at least X sets
  maxQuantity: { type: Number },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  startDate: Date,
  endDate: Date,
}, { timestamps: true });

productBundleSchema.index({ name: 'text', description: 'text' });
productBundleSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('ProductBundle', productBundleSchema);