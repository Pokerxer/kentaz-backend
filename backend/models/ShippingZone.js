const mongoose = require('mongoose');

const methodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  minDays: { type: Number, default: 1 },
  maxDays: { type: Number, default: 3 },
  // Order total threshold for free shipping on this method (null = never free)
  freeThreshold: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
}, { _id: true });

const shippingZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  // Regions covered — state names or keywords (e.g. "Lagos", "Abuja", "FCT")
  regions: [{ type: String }],
  methods: [methodSchema],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ShippingZone', shippingZoneSchema);
