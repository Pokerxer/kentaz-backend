const mongoose = require('mongoose');

// Singleton — only one document ever exists
const shippingSettingsSchema = new mongoose.Schema({
  enableShipping: { type: Boolean, default: true },
  defaultProcessingDays: { type: Number, default: 1 },
  checkoutNote: { type: String, default: '' },
  allowPickup: { type: Boolean, default: false },
  pickupAddress: { type: String, default: '' },
  pickupNote: { type: String, default: '' },
  pickupPrice: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ShippingSettings', shippingSettingsSchema);
