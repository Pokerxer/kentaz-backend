const mongoose = require('mongoose');
const { allocateUnused, usedElsewhere } = require('../utils/variantSku');

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
// Deliberately not declared unique here. The uniqueness constraint is real and
// wanted, but building it is a one-way door: if the catalogue already holds a
// duplicate, an autoIndex build fails at boot and the failure surfaces as a
// stray log line rather than something anyone acts on. So it is created — once,
// after the duplicates are cleared — by scripts/enforceVariantSkuUniqueness.js,
// which reports before it enforces. Once that index exists this declaration
// does not fight it: same key, and Mongo keeps the stricter definition.
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
//
// Duplicates *across* products are rejected rather than reassigned. Within one
// product a repeated code is plainly an accident of cloning, and the second
// copy can safely be renumbered. Across products it is not ours to resolve:
// one of the two is a real code off a real box, tags may already be stuck on
// stock, and silently renumbering whichever happened to be saved second would
// orphan them. So the save fails and names the offending code.
//
// This check is not the last line of defence — two concurrent saves can both
// read clear and then both write. The unique index on variants.sku is what
// closes that race; see scripts/enforceVariantSkuUniqueness.js. This exists so
// the ordinary case fails with a sentence staff can act on instead of a driver
// error about a duplicate key.
productSchema.pre('save', async function assignVariantSkus() {
  const Model = this.constructor;
  const kept = new Set();
  const needsSku = [];

  for (const variant of this.variants || []) {
    const sku = (variant.sku || '').trim();
    if (sku && !kept.has(sku)) {
      variant.sku = sku;
      kept.add(sku);
    } else {
      needsSku.push(variant);
    }
  }

  if (kept.size > 0) {
    const clashes = await usedElsewhere(Model, [...kept], this._id);
    if (clashes.length > 0) {
      throw new Error(
        `SKU ${clashes.join(', ')} ${clashes.length === 1 ? 'is' : 'are'} already in use by another ` +
        'product. A SKU is the barcode, so it can only name one variant in the shop.',
      );
    }
  }

  if (needsSku.length === 0) return;

  const codes = await allocateUnused(Model, needsSku.length);
  needsSku.forEach((variant, i) => { variant.sku = codes[i]; });
});

module.exports = mongoose.model('Product', productSchema);
