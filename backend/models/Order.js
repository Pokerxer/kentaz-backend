const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  quantity: { type: Number, required: true },
  variant: {
    size: String,
    color: String
  }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [orderItemSchema],
  total: { type: Number, required: true },
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
  paystackRef: String,
  paystackStatus: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
