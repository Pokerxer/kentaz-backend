const mongoose = require('mongoose');
const { allocate } = require('../utils/variantSku');

const variantSchema = new mongoose.Schema({
  size: String,
  color: String,
  colorHex: String,
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  markup: { type: Number, default: 0 },
  useMarkup: { type: Boolean, default: false },
  compareAtPrice: Number,
  stock: { type: Number, default: 0 },
  // Doubles as the barcode: this is what gets printed on the tag and what the
  // scanner reads back. Filled in by the pre-save hook when left blank.
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

// Every variant leaves here with a SKU.
//
// The SKU is the barcode: it is printed on the tag, read back by the scanner,
// and matched by the POS. A variant without one cannot be tagged at all, so
// this fills the gaps rather than leaving them to be discovered at the counter.
//
// This hook — rather than the create/update controllers — is the assignment
// point because every product write in the API ends in .save(), so there is no
// path that can produce an untaggable variant and no per-caller wiring to keep
// in step. (scripts/importProducts.js uses insertMany, which bypasses save
// middleware; scripts/backfillVariantSkus.js covers those rows.)
//
// Duplicates are reassigned as well as blanks: the admin's "duplicate variant"
// button shallow-clones a variant, which would otherwise carry the original's
// SKU onto a different size or colour — two variants answering to one scan,
// exactly the failure a barcode exists to prevent.
productSchema.pre('save', async function assignVariantSkus() {
  const seen = new Set();
  const needsSku = [];

  for (const variant of this.variants || []) {
    const sku = (variant.sku || '').trim();
    if (sku && !seen.has(sku)) {
      variant.sku = sku;
      seen.add(sku);
    } else {
      needsSku.push(variant);
    }
  }

  if (needsSku.length === 0) return;

  const codes = await allocate(needsSku.length);
  needsSku.forEach((variant, i) => { variant.sku = codes[i]; });
});

module.exports = mongoose.model('Product', productSchema);
