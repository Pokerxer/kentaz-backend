require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// All 22 categories derived from the products collection, with descriptions and sort order.
const categories = [
  // ── Core fashion ────────────────────────────────────────────────────────
  { name: 'Female Fashion',   description: 'Curated womenswear including gowns, tops, skirts, suits, jeans, and everything in between for the modern woman.',                 sortOrder: 1 },
  { name: 'Mens Wear',        description: 'Premium menswear collection covering shirts, trousers, suits, outerwear, and accessories for the discerning gentleman.',          sortOrder: 2 },
  { name: 'Male Fashion',     description: 'Stylish casual and contemporary fashion pieces for men — from graphic tees to smart-casual separates.',                           sortOrder: 3 },
  { name: 'Turkey Wears',     description: 'Exquisite Turkish-crafted fashion including gowns, abayas, suits, kaftans, bodycons, and co-ord sets for women.',                sortOrder: 4 },
  { name: 'U.S Wears',        description: 'American-style womenswear and menswear — gowns, tops, jeans, skirts, blazers, and more from US fashion labels.',                 sortOrder: 5 },
  { name: 'China Wears',      description: 'Sophisticated Chinese-made blazers, pant suits, and leather jackets offering polished, corporate-ready looks.',                   sortOrder: 6 },
  { name: 'Abayas',           description: 'Elegant and modest abayas in a range of styles — Chinese stoned, embellished, 2-piece sets, Tony full abayas, and everyday cuts.', sortOrder: 7 },
  { name: 'Sport Wear',       description: 'High-performance activewear sets including jackets, leggings, palazzo sets, and jumpsuits for the active woman.',                 sortOrder: 8 },

  // ── Kids ────────────────────────────────────────────────────────────────
  { name: 'Children',         description: 'Beautifully crafted clothing and accessories for children — suits, gowns, shoes, leggings, and more for little ones.',            sortOrder: 9 },
  { name: 'Kiddies Fashion',  description: 'Playful and stylish fashion for kids featuring designer-inspired gowns, shoes, and everyday wear.',                                sortOrder: 10 },

  // ── Shoes & Bags ────────────────────────────────────────────────────────
  { name: 'Shoes',            description: 'A wide selection of heels, flats, sneakers, boots, sandals, slippers, and luxury designer shoes for men and women.',              sortOrder: 11 },
  { name: 'Bags',             description: 'Chic handbags, purses, sling bags, bridal clutches, and designer bags from Capone, Steve Madden, Aldo, and more.',               sortOrder: 12 },
  { name: 'Bags & Purses',    description: 'A curated selection of statement purses and everyday bags for the fashion-forward woman.',                                         sortOrder: 13 },

  // ── Accessories & Jewelry ───────────────────────────────────────────────
  { name: 'Accessories',      description: 'Finishing touches for every look — earrings, belts, key holders, bangles, brooches, phone cases, hand fans, and caps.',          sortOrder: 14 },
  { name: 'Jewelry',          description: 'Stunning zircona rings, bangles, necklaces, brooches, and full jewelry sets in gold, silver, and mixed metals.',                  sortOrder: 15 },

  // ── Beauty & Hair ───────────────────────────────────────────────────────
  { name: 'Beauty & Skincare', description: 'Premium skincare, body creams, cleansers, serums, scrubs, soaps, and beauty tools for a radiant, healthy complexion.',          sortOrder: 16 },
  { name: 'Skincare',          description: 'Targeted skincare solutions — KOEC serums, face sprays, vitamin C gels, and specialized treatments for glowing skin.',           sortOrder: 17 },
  { name: 'Human Hair',        description: 'Premium 100% human hair extensions from the Kentaz collection — soft, natural-looking, and long-lasting.',                       sortOrder: 18 },
  { name: 'Luxury Hair',       description: 'Exclusive luxury human hair pieces and wigs for flawless, high-end hairstyles.',                                                  sortOrder: 19 },

  // ── Perfumes ────────────────────────────────────────────────────────────
  { name: 'Perfumes',         description: 'An exquisite fragrance collection featuring niche, designer, and luxury scents for men, women, and unisex wear.',                 sortOrder: 20 },

  // ── Gifts ───────────────────────────────────────────────────────────────
  { name: 'Gift Items',       description: 'Thoughtful gifts and novelties — designer socks gift boxes, chocolate, key holders, flasks, mugs, and celebration sets.',        sortOrder: 21 },

  // ── Adult Toys ──────────────────────────────────────────────────────────
  { name: 'Adult Toys',       description: 'Premium adult pleasure products made with body-safe materials. Age-restricted — available to customers 18 and above only.',       sortOrder: 22 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let created = 0, skipped = 0, updated = 0;

  for (const cat of categories) {
    const slug = slugify(cat.name);
    const existing = await Category.findOne({ $or: [{ name: cat.name }, { slug }] });

    if (existing) {
      // Update sortOrder and description if stale
      await Category.updateOne({ _id: existing._id }, {
        $set: { description: cat.description, sortOrder: cat.sortOrder }
      });
      console.log(`  UPDATE: ${cat.name}`);
      updated++;
    } else {
      await Category.create({ name: cat.name, slug, description: cat.description, sortOrder: cat.sortOrder, isActive: true });
      console.log(`  CREATE: ${cat.name}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
