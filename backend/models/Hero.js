const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String },
  image: { type: String, required: true },
  imageAlt: { type: String },
  ctaText: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/products' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

heroSchema.index({ order: 1 });

module.exports = mongoose.model('Hero', heroSchema);
