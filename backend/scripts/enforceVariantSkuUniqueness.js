/**
 * Make "one SKU, one variant" a rule the database keeps, not a habit the
 * application has.
 *
 * The pre-save hook in models/Product.js rejects a SKU another product already
 * holds, but it cannot be the guarantee: two saves can both read clear and then
 * both write. Only a unique index closes that window — and a duplicate barcode
 * is not a cosmetic problem, it is a scan at the till ringing up the wrong item.
 *
 * Reports first, enforces second, because building the index is a one-way door:
 * if duplicates exist the build fails, and it should fail here where someone is
 * reading the output rather than at boot where it becomes a log line.
 *
 *   node scripts/enforceVariantSkuUniqueness.js                # report only
 *   node scripts/enforceVariantSkuUniqueness.js --create-index # report, then enforce
 *
 * If it reports duplicates, clear them first:
 *
 *   node scripts/backfillVariantSkus.js --dry-run   # see what it would change
 *   node scripts/backfillVariantSkus.js             # renumber the copies
 *
 * Idempotent: a second run with --create-index finds the index already there
 * and does nothing.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const CREATE_INDEX = process.argv.includes('--create-index');

const INDEX_KEY = { 'variants.sku': 1 };
const INDEX_NAME = 'variants.sku_1';

/**
 * Every SKU held by more than one variant, anywhere in the catalogue.
 *
 * Grouped in the database rather than in memory: the catalogue is a thousand
 * products today, but a script that only works while the data is small is a
 * script that fails the first time it matters.
 */
async function findDuplicates() {
  return Product.aggregate([
    { $unwind: '$variants' },
    { $match: { 'variants.sku': { $type: 'string', $ne: '' } } },
    {
      $group: {
        _id: '$variants.sku',
        count: { $sum: 1 },
        products: { $push: { id: '$_id', name: '$name' } },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
}

/**
 * Variants with no SKU at all.
 *
 * These matter because the index is multikey: a product whose variant array has
 * a missing sku contributes a null key, and two such products collide on it.
 * The index cannot be built until every variant has a code — which is exactly
 * what backfillVariantSkus.js is for.
 */
async function countBlanks() {
  const [row] = await Product.aggregate([
    { $unwind: '$variants' },
    {
      $match: {
        $or: [
          { 'variants.sku': { $exists: false } },
          { 'variants.sku': null },
          { 'variants.sku': '' },
        ],
      },
    },
    { $count: 'blanks' },
  ]);
  return row ? row.blanks : 0;
}

async function existingIndex() {
  const indexes = await Product.collection.indexes();
  return indexes.find(i => i.name === INDEX_NAME || JSON.stringify(i.key) === JSON.stringify(INDEX_KEY));
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI / MONGO_URI is not set');

  await mongoose.connect(uri);
  console.log('Connected');

  const [duplicates, blanks, index] = await Promise.all([
    findDuplicates(),
    countBlanks(),
    existingIndex(),
  ]);

  if (index && index.unique) {
    console.log('The unique index on variants.sku already exists — nothing to do.');
    return;
  }

  console.log(`${duplicates.length} SKU${duplicates.length === 1 ? '' : 's'} used by more than one variant`);
  for (const dupe of duplicates.slice(0, 20)) {
    const where = dupe.products.map(p => p.name).join(', ');
    console.log(`  ${dupe._id} × ${dupe.count} — ${where}`);
  }
  if (duplicates.length > 20) console.log(`  ...and ${duplicates.length - 20} more`);

  if (blanks > 0) {
    console.log(`${blanks} variant${blanks === 1 ? ' has' : 's have'} no SKU at all`);
  }

  const blockers = duplicates.length + blanks;
  if (blockers > 0) {
    console.log('\nClear these before enforcing:');
    console.log('  node scripts/backfillVariantSkus.js --dry-run');
    console.log('  node scripts/backfillVariantSkus.js');
    // A non-zero exit so this can gate a deploy step rather than only inform a
    // human who happens to be watching.
    process.exitCode = 1;
    return;
  }

  console.log('No duplicates, no blanks — safe to enforce.');

  if (!CREATE_INDEX) {
    console.log('Re-run with --create-index to build the unique index.');
    return;
  }

  // Drop the plain index first: Mongo refuses to create a second index on the
  // same key, and the existing non-unique one is what would be in the way.
  if (index) {
    console.log(`Dropping the existing non-unique ${index.name}`);
    await Product.collection.dropIndex(index.name);
  }

  await Product.collection.createIndex(INDEX_KEY, { unique: true, name: INDEX_NAME });
  console.log(`Created unique index ${INDEX_NAME}. A duplicate SKU is now impossible to write.`);
}

main()
  .catch(err => { console.error('Failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
