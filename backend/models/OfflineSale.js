const mongoose = require('mongoose');

const offlineSaleSchema = new mongoose.Schema({
  items: {
    type: [{
      productId: String,
      variantIndex: Number,
      quantity: Number,
      price: Number,
      total: Number,
    }],
    required: true,
  },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  discountAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'split'], default: 'cash' },
  amountPaid: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  customerName: String,
  customerPhone: String,
  notes: String,
  cashierId: { type: String, required: true },
  cashierName: String,
  registerId: String,
  deviceId: String,
  status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  syncedAt: Date,
  error: String,
}, { timestamps: true });

offlineSaleSchema.index({ status: 1, createdAt: 1 });
offlineSaleSchema.index({ deviceId: 1, createdAt: 1 });

module.exports = mongoose.model('OfflineSale', offlineSaleSchema);