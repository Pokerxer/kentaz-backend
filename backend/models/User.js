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
  // Therapist-specific profile fields
  specialization: { type: String },
  bio: { type: String },
  yearsExp: { type: Number },
  approachTags: [{ type: String }],
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
  // Loyalty program (for customers)
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  dateOfBirth: Date,
  lastLogin: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
