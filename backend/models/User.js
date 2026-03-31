const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin', 'therapist', 'staff'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  phone: { type: String },
  pin: { type: String },
  avatar: { type: String },
  // Route permissions - stores which routes the user can access
  // If null/empty, uses role-based defaults
  permissions: {
    type: [String],
    default: []
  },
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
