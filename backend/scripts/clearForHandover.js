/**
 * Database clear script for handover.
 *
 * KEEPS: admin users, settings, shipping config, availability settings, categories
 * CLEARS: products, inventory, sales, orders, purchases, customers, staff,
 *         gift cards, discounts, bookings, announcements, reviews, notifications,
 *         registers, cash movements, stock counts, offline sales, product bundles, heroes
 */

const mongoose = require('mongoose');

const ATLAS_URI =
  'mongodb+srv://jrwaldehzx:NWXdpyCMP7yB7a4N@cluster0.ukrr40p.mongodb.net/kentaz?retryWrites=true&w=majority';

async function run() {
  console.log('Connecting to Atlas...');
  await mongoose.connect(ATLAS_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  // Collections to clear entirely
  const toClear = [
    'products',
    'productbundles',
    'inventories',
    'purchases',
    'sales',
    'offlinesales',
    'orders',
    'customers',
    'giftcards',
    'discounts',
    'bookings',
    'announcements',
    'reviews',
    'notifications',
    'registers',
    'cashmovements',
    'stockcounts',
    'heroes',
  ];

  for (const col of toClear) {
    const result = await db.collection(col).deleteMany({});
    console.log(`  ${col}: deleted ${result.deletedCount} documents`);
  }

  // Remove non-admin users (customers, staff, therapists)
  const usersResult = await db
    .collection('users')
    .deleteMany({ role: { $ne: 'admin' } });
  console.log(`  users (non-admin): deleted ${usersResult.deletedCount} documents`);

  // Verify admin users remain
  const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
  console.log(`\nAdmin users remaining: ${adminCount}`);

  // Report what was kept
  const kept = ['categories', 'settings', 'shippingsettings', 'shippingzones', 'availabilitysettings'];
  console.log('\nPreserved collections:');
  for (const col of kept) {
    const count = await db.collection(col).countDocuments();
    console.log(`  ${col}: ${count} documents`);
  }

  console.log('\nDone. Database is ready for handover.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
