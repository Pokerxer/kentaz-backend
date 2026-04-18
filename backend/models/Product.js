const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: String,
  color: String,
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  markup: { type: Number, default: 0 },
  useMarkup: { type: Boolean, default: false },
  compareAtPrice: Number,
  stock: { type: Number, default: 0 },
  sku: String
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  category: { type: String, required: true },
  subcategory: { type: String },
  images: [{
    url: String,
    publicId: String
  }],
  variants: [variantSchema],
  tags: [String],
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  ratings: {
    avg: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  // POS-specific fields
  barcode: String,
  isFavorite: { type: Boolean, default: false },
  minStock: { type: Number, default: 5 }, // Low stock threshold
  ageRestricted: { type: Boolean, default: false },
  ageVerificationRequired: { type: Boolean, default: false },
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ barcode: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ isFavorite: 1, status: 1 });

module.exports = mongoose.model('Product', productSchema);
