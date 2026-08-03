const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  // Unit price actually charged, after any flash-sale markdown.
  price: Number,
  // List price before the markdown — equal to `price` when nothing was on sale.
  // Kept so an order still shows what the customer saved once the promotion ends.
  originalUnitPrice: Number,
  lineTotal: Number,
  // Which promotion produced this line's markdown, if any.
  appliedDiscount: {
    discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
    code: String,
    source: { type: String, enum: ['discount', 'compareAtPrice'] },
  },
  quantity: { type: Number, required: true },
  variant: {
    size: String,
    color: String,
    sku: String
  }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [orderItemSchema],
  // Every figure below is recomputed server-side at order creation from the
  // product catalogue and the active discounts — never taken from the client.
  subtotal: Number,
  // Total saved through automatic flash-sale markdowns on the lines above.
  itemDiscountTotal: { type: Number, default: 0 },
  // Order-level promo code, separate from the per-line markdowns.
  discount: {
    discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
    code: String,
    amount: Number,
  },
  shippingCost: Number,
  tax: Number,
  deliveryMethod: String,
  total: { type: Number, required: true },
  // Set when the amount Korapay captured is less than the recomputed total —
  // the order is held for review rather than silently accepted or discarded.
  paymentMismatch: {
    expected: Number,
    paid: Number,
    at: Date,
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,      // from checkout form (street address line)
    street: String,       // legacy alias
    city: String,
    state: String,
    country: String,
    postalCode: String,
    deliveryMethod: String,
  },
  korapayRef: String,
  korapayStatus: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
