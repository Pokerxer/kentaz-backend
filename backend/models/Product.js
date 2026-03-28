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
  }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
