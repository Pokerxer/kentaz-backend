/**
 * One-shot import: kentaz2001-2500 Excel → MongoDB
 * Groups rows by product name, creates multi-variant products.
 * Safe to re-run: skips products that already exist by name.
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');

const MONGO_URI = 'mongodb+srv://jrwaldehzx:NWXdpyCMP7yB7a4N@cluster0.ukrr40p.mongodb.net/kentaz?retryWrites=true&w=majority';
const FILE = '/Users/mac/Downloads/kentaz1-500__1___split_.xlsx';

const variantSchema = new mongoose.Schema({
  size: String, color: String,
  price: Number, costPrice: Number,
  markup: { type: Number, default: 0 },
  useMarkup: { type: Boolean, default: false },
  stock: { type: Number, default: 0 },
  sku: String,
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: String, slug: String,
  description: { type: String, default: '' },
  category: String,
  status: { type: String, default: 'published' },
  featured: { type: Boolean, default: false },
  images: [{ url: String }],
  variants: [variantSchema],
  tags: [String],
  ratings: { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
}, { timestamps: true });

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

  // ── Read & group Excel rows by product name ──────────────────────────────
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const grouped = new Map();
  for (const row of raw) {
    const name = String(row['name'] || '').trim();
    if (!name) continue;

    const key = name.toUpperCase();
    if (!grouped.has(key)) {
      grouped.set(key, { name, category: String(row['category'] || '').trim(), variants: [] });
    }

    const price     = parseFloat(row['price']) || 0;
    const costPrice = parseFloat(row['cost_price']) || price;
    if (price <= 0) continue;

    grouped.get(key).variants.push({
      sku:       String(row['sku'] || '').trim(),
      color:     String(row['color'] || '').trim(),
      size:      String(row['size'] || '').trim(),
      stock:     parseInt(row['stock']) || 0,
      price,
      costPrice,
    });
  }

  console.log(`Excel: ${grouped.size} distinct products across ${raw.length} rows\n`);

  // ── Import ───────────────────────────────────────────────────────────────
  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (const [, data] of grouped) {
    try {
      const existing = await Product.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(data.name)}$`, 'i') },
      });

      if (existing) {
        // Merge: add Excel variants whose SKU isn't already in the DB
        const existingSkus = new Set(
          (existing.variants || []).map(v => v.sku).filter(Boolean)
        );
        const toAdd = data.variants.filter(v => v.sku && !existingSkus.has(v.sku));

        if (toAdd.length > 0) {
          existing.variants = [...(existing.variants || []), ...toAdd];
          await existing.save();
          console.log(`  MERGED   ${data.name}  (+${toAdd.length} variant${toAdd.length !== 1 ? 's' : ''})`);
          updated++;
        } else {
          console.log(`  SKIP     ${data.name} (all SKUs already present)`);
          skipped++;
        }
        continue;
      }

      // Ensure unique slug
      const baseSlug = slugify(data.name);
      const conflict = await Product.findOne({ slug: baseSlug });
      const slug = conflict ? `${baseSlug}-${Date.now()}` : baseSlug;

      await Product.create({
        name: data.name,
        slug,
        category: data.category,
        status: 'published',
        variants: data.variants,
        images: [],
        tags: [],
      });
      console.log(`  CREATED  ${data.name}  (${data.variants.length} variant${data.variants.length !== 1 ? 's' : ''})`);
      created++;
    } catch (err) {
      console.error(`  ERROR    ${data.name} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Created : ${created}`);
  console.log(`Updated : ${updated}`);
  console.log(`Skipped : ${skipped}`);
  console.log(`Errors  : ${errors}`);
  console.log(`─────────────────────────────────────────`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
