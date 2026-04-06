const mongoose = require('mongoose');
const { Schema } = mongoose;

const saleItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantIndex: { type: Number, default: 0 },
  variantLabel: { type: String, default: '' },
  // positive for sales, positive for refunds too (price/total carry the sign)
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },      // negative for refund records
  costPrice: { type: Number, default: 0 },
  total: { type: Number, required: true },       // negative for refund records
  refundedQty: { type: Number, default: 0 },    // only used on original sale items
});

const saleSchema = new Schema({
  receiptNumber: { type: String, unique: true },
  // 'sale' = normal POS sale, 'refund' = return/refund record
  type: { type: String, enum: ['sale', 'refund'], default: 'sale' },
  // for refund records, points back to the original sale
  originalSale: { type: Schema.Types.ObjectId, ref: 'Sale' },
  items: {
    type: [saleItemSchema],
    validate: {
      validator: function(v) { return Array.isArray(v) && v.length > 0; },
      message: 'At least one item required',
    },
  },
  subtotal: { type: Number, required: true },     // negative for refunds
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  discountAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },         // negative for refunds
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'split'], default: 'cash' },
  // For split payments: [{ method: 'cash'|'card'|'transfer', amount: number }]
  splitPayments: [{
    method: { type: String, enum: ['cash', 'card', 'transfer'] },
    amount: { type: Number, required: true }
  }],
  amountPaid: { type: Number, default: 0 },        // negative for refunds (money returned)
  change: { type: Number, default: 0 },
  // Customer reference (for loyalty points)
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerPhone: { type: String },
  loyaltyPointsEarned: { type: Number, default: 0 },
  loyaltyPointsRedeemed: { type: Number, default: 0 },
  // Age verification for restricted items
  ageVerified: { type: Boolean, default: false },
  ageVerifiedAt: Date,
  notes: { type: String },
  cashier: { type: Schema.Types.ObjectId, ref: 'User' },
  cashierName: { type: String },
  register: { type: Schema.Types.ObjectId, ref: 'Register' },
  status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
  voidedAt: { type: Date },
  voidReason: { type: String },
  // Receipt delivery
  receiptSent: { type: Boolean, default: false },
  receiptSentAt: Date,
  receiptEmail: String,
}, { timestamps: true });

saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const count = await this.constructor.countDocuments();
    const d = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const prefix = this.type === 'refund' ? 'RTN' : 'RCP';
    this.receiptNumber = `${prefix}-${ds}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

saleSchema.index({ cashier: 1, createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 });
saleSchema.index({ type: 1, createdAt: -1 });
saleSchema.index({ originalSale: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ customer: 1, createdAt: -1 });
saleSchema.index({ receiptNumber: 1 });
saleSchema.index({ customerPhone: 1 });

module.exports = mongoose.model('Sale', saleSchema);
