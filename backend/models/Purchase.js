const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantIndex: { type: Number, default: 0 },
  variantLabel: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true },
});

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantIndex: { type: Number, default: 0 },
  variantLabel: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true },
  totalCost: { type: Number, required: true },
});

const purchaseReturnSchema = new mongoose.Schema({
  items: [returnItemSchema],
  totalCost: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['defective', 'wrong_item', 'overstock', 'quality_issue', 'supplier_error', 'other'],
    required: true,
  },
  notes: { type: String, trim: true },
  returnedAt: { type: Date, default: Date.now },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const purchaseSchema = new mongoose.Schema({
  supplier: { type: String, required: true, trim: true },
  reference: { type: String, trim: true },
  purchaseDate: { type: Date, default: Date.now },
  items: {
    type: [purchaseItemSchema],
    validate: {
      validator: function (v) { return Array.isArray(v) && v.length > 0; },
      message: 'At least one item is required',
    },
  },
  totalCost: { type: Number, required: true },
  notes: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'received', 'partially_returned', 'returned', 'cancelled'],
    default: 'pending',
  },
  receivedAt: Date,
  returns: { type: [purchaseReturnSchema], default: [] },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseSchema.index({ status: 1, createdAt: -1 });
purchaseSchema.index({ supplier: 'text', reference: 'text' });

module.exports = mongoose.model('Purchase', purchaseSchema);
