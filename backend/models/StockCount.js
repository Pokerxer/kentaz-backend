const mongoose = require('mongoose');

const stockCountItemSchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:   { type: String },
  variantIndex:  { type: Number, required: true },
  variantLabel:  { type: String },        // e.g. "M / Black"
  expectedStock: { type: Number, required: true },
  countedStock:  { type: Number, required: true },
  variance:      { type: Number, required: true },
  notes:         { type: String },
}, { _id: false });

const stockCountSchema = new mongoose.Schema({
  countedAt:   { type: Date, default: Date.now },
  countedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items:       [stockCountItemSchema],
  summary: {
    totalProducts:   { type: Number, default: 0 },
    totalVariants:   { type: Number, default: 0 },
    discrepancies:   { type: Number, default: 0 },
    totalVariance:   { type: Number, default: 0 },  // sum of |variance| across all items
  },
  notes: { type: String },
}, { timestamps: true });

stockCountSchema.index({ countedAt: -1 });

module.exports = mongoose.model('StockCount', stockCountSchema);
