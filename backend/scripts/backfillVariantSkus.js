/**
 * Give every existing variant a SKU.
 *
 * The SKU is the barcode — it is what the tag prints and the scanner reads —
 * so a variant without one cannot be tagged at all.
 *
 * New and edited products get theirs from the pre-save hook in
 * models/Product.js. This covers everything that predates the hook, plus rows
 * created by scripts/importProducts.js, which uses insertMany and so bypasses
 * save middleware.
 *
 * Existing SKUs are never touched: whatever is already there is a real code
 * off a real product, and rewriting one would orphan every tag already stuck
 * on stock. Only blanks and duplicates are filled.
 *
 * Idempotent — a second run assigns nothing. Safe to rerun after any import.
 *
 *   node scripts/backfillVariantSkus.js           # assign
 *   node scripts/backfillVariantSkus.js --dry-run # report only
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { allocate } = require('../utils/variantSku');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI / MONGO_URI is not set');

  await mongoose.connect(uri);
  console.log(`Connected${DRY_RUN ? ' (dry run — nothing will be written)' : ''}`);

  const products = await Product.find({}, 'name variants').lean();

  // One pass to find the gaps, one allocation for all of them, one update per
  // affected product. Duplicates are tracked across the whole catalogue, not
  // just within a product, because a SKU has to identify one variant shop-wide.
  const seen = new Set();
  const gaps = [];

  for (const product of products) {
    (product.variants || []).forEach((variant, index) => {
      const sku = (variant.sku || '').trim();
      if (sku && !seen.has(sku)) { seen.add(sku); return; }
      gaps.push({ productId: product._id, name: product.name, index, had: sku || null });
    });
  }

  const scanned = products.reduce((n, p) => n + (p.variants || []).length, 0);
  console.log(`${products.length} products, ${scanned} variants, ${seen.size} already have a unique SKU`);

  if (gaps.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const dupes = gaps.filter(g => g.had);
  console.log(`${gaps.length} variants need a SKU (${gaps.length - dupes.length} blank, ${dupes.length} duplicated)`);
  for (const gap of dupes.slice(0, 10)) {
    console.log(`  duplicate "${gap.had}" on ${gap.name} [variant ${gap.index}]`);
  }
  if (dupes.length > 10) console.log(`  ...and ${dupes.length - 10} more`);

  if (DRY_RUN) {
    console.log('Dry run — no changes written.');
    return;
  }

  const codes = await allocate(gaps.length);

  const byProduct = new Map();
  gaps.forEach((gap, i) => {
    const key = String(gap.productId);
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push({ index: gap.index, sku: codes[i] });
  });

  let updated = 0;
  for (const [productId, assignments] of byProduct) {
    const $set = {};
    for (const { index, sku } of assignments) $set[`variants.${index}.sku`] = sku;
    // updateOne rather than save(): the pre-save hook would re-walk variants we
    // have already decided about, and we want exactly these writes.
    await Product.updateOne({ _id: productId }, { $set });
    updated++;
  }

  console.log(`Assigned ${gaps.length} SKUs across ${updated} products.`);
}

main()
  .catch(err => { console.error('Backfill failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
