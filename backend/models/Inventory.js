const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantIndex: {
    type: Number,
    default: -1
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'return', 'damage', 'initial'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    ref: String
  },
  referenceType: {
    type: String,
    enum: ['order', 'restock', 'adjustment', 'return', 'damage', 'initial', 'sale'],
    default: 'adjustment'
  },
  notes: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

inventorySchema.index({ product: 1, createdAt: -1 });
inventorySchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Inventory', inventorySchema);
