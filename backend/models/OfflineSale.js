const mongoose = require('mongoose');

/**
 * A sale rung up with no connection, waiting to be banked.
 *
 * The money on this document is what the TILL calculated and printed on the
 * customer's receipt. It is not authoritative: `syncOfflineSales` re-prices
 * every line from the database before creating the real Sale, because a price
 * that arrives from a client is a request, not a fact. Where the two disagree
 * the sale banks the server's figure and sets `priceMismatch`, so someone can
 * reconcile the drawer against the printed slip.
 */
const offlineSaleSchema = new mongoose.Schema({
  items: {
    type: [{
      productId: String,
      variantIndex: Number,
      quantity: Number,
      price: Number,
      total: Number,
      // A price the cashier typed. Kept so the override survives the queue and
      // is re-authorised on sync rather than silently applied.
      customPrice: { type: Number, default: null },
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
  // The total the till printed, kept when the server re-priced to something
  // else. Null once they agree — there is nothing to reconcile.
  clientTotal: { type: Number, default: null },
  priceMismatch: { type: Boolean, default: false },
}, { timestamps: true });

offlineSaleSchema.index({ status: 1, createdAt: 1 });
offlineSaleSchema.index({ deviceId: 1, createdAt: 1 });

module.exports = mongoose.model('OfflineSale', offlineSaleSchema);