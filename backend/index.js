require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const storeProductRoutes = require('./routes/storeProducts');
const adminProductRoutes = require('./routes/adminProducts');
const orderRoutes = require('./routes/orders');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlist');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const categoryRoutes = require('./routes/categories');
const inventoryRoutes = require('./routes/inventory');
const purchaseRoutes = require('./routes/purchases');
const posRoutes = require('./routes/pos');
const staffRoutes = require('./routes/staff');
const discountRoutes = require('./routes/discounts');
const giftCardRoutes = require('./routes/giftCards');
const shippingRoutes = require('./routes/shipping');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/upload');

const Product = require('./models/Product');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:7002',
    /^https:\/\/kentaz-.*\.vercel\.app$/,
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 9000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kentaz';

const mongoOptions = {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
};

console.log('MONGO_URI:', MONGO_URI ? MONGO_URI.replace(/:[^:]+@/, ':****@') : 'not set');

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/store/products', storeProductRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/store/orders', orderRoutes);
app.use('/api/store/bookings', bookingRoutes);
app.use('/api/store/reviews', reviewRoutes);
app.use('/api/store/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/purchases', purchaseRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/admin/staff', staffRoutes);
app.use('/api/admin/discounts', discountRoutes);
app.use('/api/admin/gift-cards', giftCardRoutes);
app.use('/api/admin/shipping', shippingRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin/upload', uploadRoutes);

app.post('/api/seed/products', async (req, res) => {
  try {
    const products = req.body.products;
    const created = [];
    for (const product of products) {
      const createdProduct = await Product.create(product);
      created.push(createdProduct);
    }
    res.json({ message: `Created ${created.length} products`, products: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/seed/admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      name: name || 'Admin',
      email: email || 'admin@kentaz.com',
      password: hashedPassword,
      role: 'admin'
    });
    
    await admin.save();
    res.json({ message: 'Admin user created', user: { name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/store/regions', (req, res) => {
  res.json({
    regions: [{ id: 'reg_ngn', name: 'Nigeria', currency_code: 'NGN', tax_rate: 7.5 }]
  });
});

app.get('/api/store/shipping-options', (req, res) => {
  res.json({
    shipping_options: [
      { id: 'ship_standard', name: 'Standard Shipping', price: 2500 },
      { id: 'ship_express', name: 'Express Shipping', price: 5000 }
    ]
  });
});

app.post('/api/seed', async (req, res) => {
  try {
    const products = [
      {
        name: 'Executive Slim Fit Navy Blazer',
        slug: 'executive-slim-fit-navy-blazer',
        description: 'Premium Italian wool blend blazer with modern slim fit silhouette. Features horn buttons, functional sleeves, and interior silk lining. Perfect for boardroom meetings and formal occasions.',
        category: 'Male Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600' },
          { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600' }
        ],
        variants: [
          { size: '38', color: 'Navy', price: 85000, stock: 5 },
          { size: '40', color: 'Navy', price: 85000, stock: 8 },
          { size: '42', color: 'Navy', price: 85000, stock: 6 },
          { size: '44', color: 'Charcoal', price: 85000, stock: 4 }
        ],
        tags: ['bestseller', 'executive'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.7, count: 34 }
      },
      {
        name: 'Premium Pima Cotton Dress Shirt',
        slug: 'premium-pima-cotton-dress-shirt',
        description: 'Luxuriously soft Peruvian Pima cotton dress shirt with French cuffs. Mother of pearl buttons, collar stays included. A wardrobe essential for the discerning gentleman.',
        category: 'Male Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600' },
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600' }
        ],
        variants: [
          { size: '14', color: 'White', price: 28500, stock: 15 },
          { size: '15', color: 'White', price: 28500, stock: 20 },
          { size: '16', color: 'Light Blue', price: 28500, stock: 18 },
          { size: '17', color: 'Pink', price: 28500, stock: 12 }
        ],
        tags: ['bestseller'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.6, count: 52 }
      },
      {
        name: 'Handcrafted Italian Leather Belt',
        slug: 'handcrafted-italian-leather-belt',
        description: 'Full-grain Italian leather belt with brushed silver buckle. Vegetable tanned for durability and supple feel. An essential accessory for any formal or casual ensemble.',
        category: 'Accessories',
        images: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600' }
        ],
        variants: [
          { size: '32', color: 'Black', price: 12500, stock: 25 },
          { size: '34', color: 'Black', price: 12500, stock: 30 },
          { size: '36', color: 'Brown', price: 12500, stock: 28 },
          { size: '38', color: 'Tan', price: 12500, stock: 20 }
        ],
        tags: [],
        featured: false,
        status: 'published',
        ratings: { avg: 4.4, count: 41 }
      },
      {
        name: 'Classic Wayfarer Sunglasses',
        slug: 'classic-wayfarer-sunglasses',
        description: 'Timeless wayfarer design with polarized UV400 lenses. Lightweight acetate frame with metal hinges. Provides 100% UVA/UVB protection while making a style statement.',
        category: 'Accessories',
        images: [
          { url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600' },
          { url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600' }
        ],
        variants: [
          { size: 'One Size', color: 'Black', price: 18500, stock: 35 },
          { size: 'One Size', color: 'Tortoise', price: 18500, stock: 22 },
          { size: 'One Size', color: 'Navy', price: 18500, stock: 18 }
        ],
        tags: ['featured'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.5, count: 67 }
      },
      {
        name: 'Silk Knit Tie - Royal Burgundy',
        slug: 'silk-knit-tie-royal-burgundy',
        description: 'Handrolled silk knit tie with subtle texture. Royal burgundy color adds sophistication to any suit. Dry clean only for lasting elegance.',
        category: 'Accessories',
        images: [
          { url: 'https://images.unsplash.com/photo-1519262074530-b0d1a10c9d2d?w=600' }
        ],
        variants: [
          { size: 'One Size', color: 'Burgundy', price: 9500, stock: 40 },
          { size: 'One Size', color: 'Navy', price: 9500, stock: 35 },
          { size: 'One Size', color: 'Forest Green', price: 9500, stock: 28 }
        ],
        tags: [],
        featured: false,
        status: 'published',
        ratings: { avg: 4.3, count: 23 }
      },
      {
        name: 'Premium Cashmere Overcoat',
        slug: 'premium-cashmere-overcoat',
        description: 'Double-breasted pure cashmere overcoat with horn buttons. Relaxed fit with storm flap for ultimate warmth. The pinnacle of luxury outerwear for the modern gentleman.',
        category: 'Male Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1544923246-77307dd628b0?w=600' }
        ],
        variants: [
          { size: 'S', color: 'Camel', price: 185000, stock: 3 },
          { size: 'M', color: 'Camel', price: 185000, stock: 5 },
          { size: 'L', color: 'Charcoal', price: 185000, stock: 4 }
        ],
        tags: ['luxury', 'featured'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.9, count: 18 }
      },
      {
        name: 'Beaded crystal evening clutch',
        slug: 'beaded-crystal-evening-clutch',
        description: 'Stunning hand-beaded evening clutch with crystal embellishments. Magnetic snap closure with silk lining. Interior pocket for essentials. Your perfect gala companion.',
        category: 'Bags & Purses',
        images: [
          { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97b5b0?w=600' },
          { url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600' }
        ],
        variants: [
          { size: 'One Size', color: 'Silver', price: 28000, stock: 12 },
          { size: 'One Size', color: 'Gold', price: 28000, stock: 15 },
          { size: 'One Size', color: 'Rose Gold', price: 28000, stock: 10 }
        ],
        tags: ['featured', 'evening'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.6, count: 29 }
      },
      {
        name: 'Quilted Leather Crossbody Bag',
        slug: 'quilted-leather-crossbody-bag',
        description: 'Elegant quilted lambskin leather crossbody with adjustable strap. Gold-tone hardware and signature interlocking lock. Spacious interior with card slots.',
        category: 'Bags & Purses',
        images: [
          { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600' }
        ],
        variants: [
          { size: 'One Size', color: 'Black', price: 65000, stock: 8 },
          { size: 'One Size', color: 'Burgundy', price: 65000, stock: 6 },
          { size: 'One Size', color: 'Blush', price: 65000, stock: 7 }
        ],
        tags: ['bestseller'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.7, count: 43 }
      },
      {
        name: 'Structured Leather Tote - Executive',
        slug: 'structured-leather-tote-executive',
        description: 'Professional structured tote in pebbled calfskin leather. Fits 15" laptop with additional compartments for documents. Brass feet protect the base.',
        category: 'Bags & Purses',
        images: [
          { url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600' }
        ],
        variants: [
          { size: 'One Size', color: 'Black', price: 78000, stock: 10 },
          { size: 'One Size', color: 'Cognac', price: 78000, stock: 8 }
        ],
        tags: ['executive'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.5, count: 31 }
      },
      {
        name: 'Peruvian Virgin Hair Bundle - Body Wave',
        slug: 'peruvian-virgin-hair-bundle-body-wave',
        description: '100% unprocessed Peruvian virgin human hair. Beautiful natural body wave pattern with minimal shedding. Can be dyed, bleached, and heat styled. 3-4 bundles recommended for full install.',
        category: 'Luxury Hair',
        images: [
          { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600' },
          { url: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=600' }
        ],
        variants: [
          { size: '10 inch', color: '1B Natural Black', price: 28000, stock: 25 },
          { size: '12 inch', color: '1B Natural Black', price: 32000, stock: 30 },
          { size: '14 inch', color: 'Body Wave', price: 36000, stock: 22 },
          { size: '16 inch', color: 'Body Wave', price: 42000, stock: 18 },
          { size: '18 inch', color: 'Body Wave', price: 48000, stock: 15 }
        ],
        tags: ['bestseller', 'virgin-hair'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.8, count: 89 }
      },
      {
        name: 'Brazilian Loose Wave Closure',
        slug: 'brazilian-loose-wave-closure',
        description: 'Premium Brazilian loose wave closure with 4x4 lace base. Hand-tied baby hairs for natural hairline. Swiss lace construction breathable and undetectable.',
        category: 'Luxury Hair',
        images: [
          { url: 'https://images.unsplash.com/photo-1588558990294-8fec9499b51c?w=600' }
        ],
        variants: [
          { size: '12x6', color: 'Natural Black', price: 22000, stock: 35 },
          { size: '13x6', color: 'Natural Black', price: 25000, stock: 28 },
          { size: '12x6', color: '613 Blonde', price: 28000, stock: 15 }
        ],
        tags: ['bestseller'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.6, count: 54 }
      },
      {
        name: 'Malaysian Straight Hair - 3 Bundle Set',
        slug: 'malaysian-straight-hair-3-bundle-set',
        description: 'Luxurious Malaysian remy hair with natural straight texture. High luster with medium thickness. Seamless blending with African American textures. Pre-washed and aligned.',
        category: 'Luxury Hair',
        images: [
          { url: 'https://images.unsplash.com/photo-1599689018034-48e2ead82951?w=600' }
        ],
        variants: [
          { size: '10+12+14 inch', color: 'Jet Black', price: 75000, stock: 12 },
          { size: '12+14+16 inch', color: 'Jet Black', price: 95000, stock: 15 },
          { size: '14+16+18 inch', color: 'Jet Black', price: 115000, stock: 10 }
        ],
        tags: ['bundle-deal'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.7, count: 38 }
      },
      {
        name: 'Gold Plated Initial Necklace',
        slug: 'gold-plated-initial-necklace',
        description: 'Elegant 18k gold plated initial pendant on delicate chain. Handcrafted with cubic zirconia accents. Adjustable length 16-18 inches. Perfect personalized gift.',
        category: 'Gift Items',
        images: [
          { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600' }
        ],
        variants: [
          { size: 'One Size', color: 'Gold', price: 8500, stock: 50 },
          { size: 'One Size', color: 'Rose Gold', price: 8500, stock: 45 }
        ],
        tags: ['gift', 'personalized'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.4, count: 76 }
      },
      {
        name: 'Luxury Candle Gift Set - African Violet',
        slug: 'luxury-candle-gift-set-african-violet',
        description: 'Exquisite hand-poured soy wax candle set in African violet scent. Notes of jasmine, violet leaves, and white musk. Presented in elegant gift box with gold ribbon.',
        category: 'Gift Items',
        images: [
          { url: 'https://images.unsplash.com/photo-1602607730398-1d5d1c16e99c?w=600' }
        ],
        variants: [
          { size: '3 Candle Set', color: 'African Violet', price: 22000, stock: 30 },
          { size: 'Single Candle', color: 'African Violet', price: 8500, stock: 45 }
        ],
        tags: ['gift', 'featured'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.5, count: 34 }
      },
      {
        name: 'Crystal Champagne Flutes Set of 4',
        slug: 'crystal-champagne-flutes-set-4',
        description: 'Lead-free crystal champagne flutes with intricate crystal stem design. 6oz capacity perfect for celebrations. Dishwasher safe. Presented in signature gift box.',
        category: 'Gift Items',
        images: [
          { url: 'https://images.unsplash.com/photo-1543005623-a128da4f02ae?w=600' }
        ],
        variants: [
          { size: 'Set of 2', color: 'Clear', price: 18000, stock: 20 },
          { size: 'Set of 4', color: 'Clear', price: 32000, stock: 25 },
          { size: 'Set of 6', color: 'Gold Trim', price: 55000, stock: 12 }
        ],
        tags: ['gift', 'celebration'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.6, count: 28 }
      },
      {
        name: 'Elegant Leather Watch Box',
        slug: 'elegant-leather-watch-box',
        description: 'Premium vegan leather watch box with glass top display. Holds 6 watches with pillow cushions. Suede lining protects timepieces. Key lock for security.',
        category: 'Gift Items',
        images: [
          { url: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=600' }
        ],
        variants: [
          { size: '4 Watch', color: 'Black', price: 28000, stock: 15 },
          { size: '6 Watch', color: 'Brown', price: 38000, stock: 12 },
          { size: '8 Watch', color: 'Black', price: 48000, stock: 8 }
        ],
        tags: ['gift', 'luxury'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.7, count: 21 }
      },
      {
        name: 'Signature Oud Luxury Perfume',
        slug: 'signature-oud-luxury-perfume',
        description: 'Rich and captivating fragrance with precious oud wood, amber, and vanilla notes. Long-lasting 12+ hour sillage. Elegant glass bottle with gold atomizer.',
        category: 'Perfumes',
        images: [
          { url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600' },
          { url: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600' }
        ],
        variants: [
          { size: '50ml', color: 'Default', price: 35000, stock: 25 },
          { size: '100ml', color: 'Default', price: 58000, stock: 18 }
        ],
        tags: ['bestseller', 'luxury', 'oud'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.8, count: 92 }
      },
      {
        name: 'Fresh Floral Eau de Parfum',
        slug: 'fresh-floral-eau-de-parfum',
        description: 'Light and refreshing fragrance with bergamot, peony, and white cedar notes. Perfect for daytime wear. Clean aquatic base with lasting projection.',
        category: 'Perfumes',
        images: [
          { url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600' }
        ],
        variants: [
          { size: '30ml', color: 'Default', price: 18000, stock: 40 },
          { size: '50ml', color: 'Default', price: 28000, stock: 35 },
          { size: '100ml', color: 'Default', price: 42000, stock: 20 }
        ],
        tags: ['floral', 'fresh'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.4, count: 58 }
      },
      {
        name: 'Vanilla Musk Body Mist Set',
        slug: 'vanilla-musk-body-mist-set',
        description: 'Seductive vanilla musk body mist collection. Fine mist for full body coverage. 3-piece set includes original, intensive, and pear fusion variants.',
        category: 'Perfumes',
        images: [
          { url: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600' }
        ],
        variants: [
          { size: '3 Piece Set', color: 'Default', price: 12000, stock: 50 },
          { size: 'Single Bottle', color: 'Original Vanilla', price: 5500, stock: 60 }
        ],
        tags: ['body-mist', 'gift-set'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.3, count: 44 }
      },
      {
        name: 'Premium Glow Serum Kit',
        slug: 'premium-glow-serum-kit',
        description: 'Complete brightening serum routine with vitamin C, niacinamide, and retinol. Addresses dark spots, uneven tone, and dullness. Visible results in 2 weeks.',
        category: 'Skincare',
        images: [
          { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600' },
          { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600' }
        ],
        variants: [
          { size: 'Starter Kit', color: 'Default', price: 22000, stock: 30 },
          { size: 'Pro Kit', color: 'Default', price: 38000, stock: 20 }
        ],
        tags: ['bestseller', 'skincare'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.6, count: 67 }
      },
      {
        name: 'Luxury Night Cream - Retinol & Gold',
        slug: 'luxury-night-cream-retinol-gold',
        description: 'Intensive overnight moisturizer with 2.5% retinol and 24k gold particles. Reduces fine lines and firms skin while you sleep. Wake up to radiant, youthful glow.',
        category: 'Skincare',
        images: [
          { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600' }
        ],
        variants: [
          { size: '50ml', color: 'Default', price: 28000, stock: 25 },
          { size: '100ml', color: 'Default', price: 48000, stock: 15 }
        ],
        tags: ['luxury', 'anti-aging'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.7, count: 48 }
      },
      {
        name: 'Hydrating Sheet Mask Box - 10 Pack',
        slug: 'hydrating-sheet-mask-box-10-pack',
        description: 'Intensive hydration sheet mask collection with hyaluronic acid and aloe vera. Cotton sheet conforms to skin for maximum essence absorption. Spa-quality treatment at home.',
        category: 'Skincare',
        images: [
          { url: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600' }
        ],
        variants: [
          { size: '10 Pack', color: 'Default', price: 15000, stock: 55 },
          { size: '5 Pack', color: 'Default', price: 8500, stock: 70 }
        ],
        tags: ['mask', 'hydration'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.4, count: 112 }
      },
      {
        name: 'Kids Designer Party Dress - Princess',
        slug: 'kids-designer-party-dress-princess',
        description: 'Stunning tulle princess dress with sequin bodice and flower embellishments. Petticoat underskirt for full volume. Perfect for birthdays and special occasions.',
        category: 'Kiddies Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600' }
        ],
        variants: [
          { size: '2-3 Years', color: 'Pink', price: 18500, stock: 8 },
          { size: '4-5 Years', color: 'Pink', price: 18500, stock: 10 },
          { size: '6-7 Years', color: 'Lavender', price: 18500, stock: 7 },
          { size: '8-9 Years', color: 'White', price: 18500, stock: 5 }
        ],
        tags: ['party', 'featured'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.8, count: 34 }
      },
      {
        name: 'Boys Smart Casual Polo Set',
        slug: 'boys-smart-casual-polo-set',
        description: 'Premium cotton polo shirt with matching shorts set. Breathable pique fabric perfect for active kids. Machine washable for easy care.',
        category: 'Kiddies Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600' }
        ],
        variants: [
          { size: '3-4 Years', color: 'Navy', price: 9500, stock: 15 },
          { size: '5-6 Years', color: 'White', price: 9500, stock: 18 },
          { size: '7-8 Years', color: 'Red', price: 9500, stock: 12 },
          { size: '9-10 Years', color: 'Navy', price: 9500, stock: 10 }
        ],
        tags: ['everyday'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.5, count: 28 }
      },
      {
        name: 'Baby Luxe Christening Gown Set',
        slug: 'baby-luxe-christening-gown-set',
        description: 'Heirloom quality christening gown in ivory silk with hand embroidery. Includes matching bonnet and booties. Presented in keepsake box.',
        category: 'Kiddies Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600' }
        ],
        variants: [
          { size: '0-3 Months', color: 'Ivory', price: 35000, stock: 5 },
          { size: '3-6 Months', color: 'Ivory', price: 35000, stock: 6 },
          { size: '6-12 Months', color: 'White', price: 35000, stock: 4 }
        ],
        tags: ['luxury', 'special-occasion'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.9, count: 12 }
      },
      {
        name: 'Silk Wrap Midi Skirt',
        slug: 'silk-wrap-midi-skirt',
        description: 'Elegant 100% mulberry silk wrap skirt with adjustable tie. Fluid draping flatters all body types. Versatile day-to-night piece.',
        category: 'Female Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600' }
        ],
        variants: [
          { size: 'XS', color: 'Ivory', price: 32000, stock: 8 },
          { size: 'S', color: 'Blush', price: 32000, stock: 12 },
          { size: 'M', color: 'Navy', price: 32000, stock: 10 },
          { size: 'L', color: 'Emerald', price: 32000, stock: 7 }
        ],
        tags: ['silk', 'bestseller'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.6, count: 39 }
      },
      {
        name: 'Embellished Cocktail Dress',
        slug: 'embellished-cocktail-dress',
        description: 'Show-stopping knee-length cocktail dress with hand-sewn beadwork and sequin detailing. Sweetheart neckline with illusion back. Fully lined.',
        category: 'Female Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600' },
          { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600' }
        ],
        variants: [
          { size: 'XS', color: 'Black/Gold', price: 58000, stock: 4 },
          { size: 'S', color: 'Navy/Silver', price: 58000, stock: 6 },
          { size: 'M', color: 'Burgundy', price: 58000, stock: 5 }
        ],
        tags: ['cocktail', 'featured', 'evening'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.8, count: 23 }
      },
      {
        name: 'Wide Leg Linen Trousers',
        slug: 'wide-leg-linen-trousers',
        description: 'Relaxed fit wide leg trousers in premium European linen. High-waisted with pleated front. Perfect for summer styling with sandals or heels.',
        category: 'Female Fashion',
        images: [
          { url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600' }
        ],
        variants: [
          { size: 'XS', color: 'White', price: 22000, stock: 15 },
          { size: 'S', color: 'Sand', price: 22000, stock: 18 },
          { size: 'M', color: 'Olive', price: 22000, stock: 14 },
          { size: 'L', color: 'Black', price: 22000, stock: 12 }
        ],
        tags: ['linen', 'summer'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.4, count: 45 }
      },
      {
        name: 'Designer Stiletto Heels - Strappy',
        slug: 'designer-stiletto-heels-strappy',
        description: 'Elegant strappy stiletto heels in genuine Italian leather. 4-inch heel with cushioned insole. Gold-tone hardware and adjustable ankle strap.',
        category: 'Shoes',
        images: [
          { url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600' }
        ],
        variants: [
          { size: '36', color: 'Nude', price: 45000, stock: 6 },
          { size: '37', color: 'Nude', price: 45000, stock: 10 },
          { size: '38', color: 'Black', price: 45000, stock: 12 },
          { size: '39', color: 'Black', price: 45000, stock: 8 },
          { size: '40', color: 'Red', price: 48000, stock: 5 }
        ],
        tags: ['heels', 'evening', 'featured'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.7, count: 36 }
      },
      {
        name: 'Leather Loafers - Classic Penny',
        slug: 'leather-loafers-classic-penny',
        description: 'Timeless penny loafer in supple calfskin leather. Goodyear welted construction for durability. Flexible leather sole with rubber heel.',
        category: 'Shoes',
        images: [
          { url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600' }
        ],
        variants: [
          { size: '38', color: 'Cognac', price: 35000, stock: 8 },
          { size: '39', color: 'Cognac', price: 35000, stock: 12 },
          { size: '40', color: 'Black', price: 35000, stock: 15 },
          { size: '42', color: 'Black', price: 35000, stock: 10 }
        ],
        tags: ['casual', 'classic'],
        featured: false,
        status: 'published',
        ratings: { avg: 4.5, count: 52 }
      },
      {
        name: 'Ankle Boots - Block Heel Suede',
        slug: 'ankle-boots-block-heel-suede',
        description: 'Chic suede ankle boots with comfortable 2.5-inch block heel. Side zip closure and Almond toe shape. Perfect transition boot for autumn.',
        category: 'Shoes',
        images: [
          { url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600' }
        ],
        variants: [
          { size: '36', color: 'Taupe', price: 38000, stock: 7 },
          { size: '37', color: 'Taupe', price: 38000, stock: 10 },
          { size: '38', color: 'Black', price: 38000, stock: 12 },
          { size: '39', color: 'Black', price: 38000, stock: 9 },
          { size: '40', color: 'Burgundy', price: 38000, stock: 6 }
        ],
        tags: ['boots', 'fall', 'bestseller'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.6, count: 41 }
      },
      {
        name: 'White Sneakers - Minimalist Leather',
        slug: 'white-sneakers-minimalist-leather',
        description: 'Clean minimalist leather sneakers in pure white. cushioned memory foam insole for all-day comfort. Ultra-lightweight construction.',
        category: 'Shoes',
        images: [
          { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600' }
        ],
        variants: [
          { size: '36', color: 'White', price: 25000, stock: 15 },
          { size: '38', color: 'White', price: 25000, stock: 20 },
          { size: '40', color: 'White', price: 25000, stock: 18 },
          { size: '42', color: 'White', price: 25000, stock: 14 }
        ],
        tags: ['sneakers', 'casual', 'bestseller'],
        featured: true,
        status: 'published',
        ratings: { avg: 4.5, count: 78 }
      }
    ];

    await Product.deleteMany({});
    await Product.insertMany(products);
    res.json({ message: 'Database seeded with sample products' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Kentaz Backend API', 
    version: '1.0.0',
    endpoints: [
      '/api/store/products',
      '/api/store/categories',
      '/api/auth',
      '/api/store/orders',
      '/api/store/bookings',
      '/api/payments'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Kentaz Backend API running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
