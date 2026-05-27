const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Product = require('../models/Product');

const ATLAS_URI =
  'mongodb+srv://jrwaldehzx:NWXdpyCMP7yB7a4N@cluster0.ukrr40p.mongodb.net/kentaz?retryWrites=true&w=majority';

const EXCEL_PATH = process.argv[2] || '/Users/mac/Downloads/kentaz_1-500__split_.xlsx';

// Map Excel "Top Category" -> DB category name
const CATEGORY_MAP = {
  'FEMALE WEARS':            'Female Fashion',
  'GIFT ITEMS / ACCESSORIES':'Gift Items',
  'PERFUMES':                'Perfumes',
  'KIDS OUTFIT MALE':        'Kiddies Fashion',
  'KIDS OUTFIT FEMALE':      'Kiddies Fashion',
  'SHOES':                   'Shoes',
  'SKIN CARE':               'Skincare',
  'HUMAN HAIR':              'Luxury Human Hair',
  'JEWELRY':                 'Accessories',
  'ACCESORIES':              'Accessories',
  'MENS WEAR':               'Male Fashion',
  'U.S WEARS':               'Male Fashion',
  'TIES':                    'Accessories',
  'BRIEFS':                  'Male Fashion',
  'MALE SHOES':              'Shoes',
  'CHILDREN':                'Kiddies Fashion',
};

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uniqueSlug(base, usedSlugs) {
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i++}`;
  }
  usedSlugs.add(slug);
  return slug;
}

async function run() {
  console.log('Reading Excel file...');
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`  ${rows.length} rows found\n`);

  // Group rows by product name
  const byName = new Map();
  for (const row of rows) {
    const name = (row['name'] || row['Item Description'] || '').trim();
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(row);
  }
  console.log(`  ${byName.size} unique products\n`);

  console.log('Connecting to Atlas...');
  await mongoose.connect(ATLAS_URI);
  console.log('Connected.\n');

  const usedSlugs = new Set();
  // Seed with existing slugs so we don't collide
  const existing = await Product.find({}, 'slug').lean();
  for (const p of existing) usedSlugs.add(p.slug);

  const products = [];
  let skipped = 0;

  for (const [name, rows] of byName) {
    const firstRow = rows[0];
    const excelCat = (firstRow['Top Category'] || firstRow['category'] || '').trim().toUpperCase();
    const category = CATEGORY_MAP[excelCat];

    if (!category) {
      console.warn(`  SKIP (unknown category "${excelCat}"): ${name}`);
      skipped++;
      continue;
    }

    const slug = uniqueSlug(slugify(name), usedSlugs);

    // Build variants — one per Excel row
    const variants = rows.map(row => ({
      size:      row['size']  ? String(row['size']).trim()  : undefined,
      color:     row['color'] ? String(row['color']).trim() : undefined,
      price:     Number(row['price'])      || 0,
      costPrice: Number(row['cost_price']) || 0,
      stock:     Math.round(Number(row['stock'] ?? row['Quick Qty']) || 0),
      sku:       row['sku'] ? String(row['sku']).trim() : undefined,
    }));

    // Use the first variant's sku as barcode
    const barcode = variants[0]?.sku || undefined;

    // Use "Item Description" as description if distinct from name
    const itemDesc = (firstRow['Item Description'] || '').trim();
    const description = itemDesc && itemDesc.toUpperCase() !== name.toUpperCase()
      ? itemDesc
      : undefined;

    products.push({
      name,
      slug,
      description,
      category,
      variants,
      barcode,
      status: 'published',
      isFavorite: false,
      featured: false,
      minStock: 5,
      images: [],
      tags: [],
    });
  }

  console.log(`Inserting ${products.length} products (${skipped} skipped)...`);

  const result = await Product.insertMany(products, { ordered: false });
  console.log(`\nInserted: ${result.length} products`);
  if (skipped) console.log(`Skipped:  ${skipped} (unknown category)`);

  // Summary by category
  const summary = {};
  for (const p of result) {
    summary[p.category] = (summary[p.category] || 0) + 1;
  }
  console.log('\nBy category:');
  for (const [cat, count] of Object.entries(summary).sort()) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
