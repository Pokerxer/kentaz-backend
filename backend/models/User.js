const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin', 'therapist', 'staff'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  pin: { type: String }, // optional 4-digit PIN for quick POS login
  avatar: { type: String },
  addresses: [{
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Nigeria' },
    postalCode: String,
    isDefault: { type: Boolean, default: false }
  }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
