const Product = require('../models/Product');
const Review = require('../models/Review');
const { v4: uuidv4 } = require('uuid');
const { uploadImage, deleteImage, deleteImages, getOptimizedUrl } = require('../utils/cloudinary');
const multer = require('multer');
const path = require('path');
const os = require('os');

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

exports.upload = upload;

exports.getCategories = async (req, res) => {
  try {
    // Aggregate by category, get count and a sample product image per category
    const categories = await Product.aggregate([
      { $match: { 'images.0': { $exists: true } } },
      { $group: {
          _id: '$category',
          count: { $sum: 1 },
          sampleImage: { $first: { $arrayElemAt: ['$images.url', 0] } }
      }},
      { $sort: { count: -1 } }
    ]);

    const categoryImages = {
      'Male Fashion': 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600',
      'Female Fashion': 'https://images.unsplash.com/photo-1485968579169-a6e9dc7d3a84?w=600',
      'Kiddies Fashion': 'https://images.unsplash.com/photo-1519234935892-7cb5d9e5b2e7?w=600',
      'Skincare': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
      'Luxury Hair': 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600',
      'Bags & Purses': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
      'Shoes': 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600',
      'Accessories': 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600',
      'Perfumes': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600',
      'Gift Items': 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600'
    };

    const categoryDescriptions = {
      'Male Fashion': 'Premium suits, casuals, and accessories for the modern gentleman',
      'Female Fashion': 'Elegant dresses, gowns, and contemporary styles for her',
      'Kiddies Fashion': 'Adorable outfits for your little ones',
      'Skincare': 'Luxury skincare and beauty products for radiant skin',
      'Luxury Hair': 'Premium virgin hair extensions and luxury wigs',
      'Bags & Purses': 'Designer bags and statement pieces',
      'Shoes': 'Handcrafted footwear for every occasion',
      'Accessories': 'Watches, jewelry, and premium accessories',
      'Perfumes': 'Signature fragrances that leave a lasting impression',
      'Gift Items': 'Perfect gifts for every occasion'
    };

    const result = categories.map(cat => ({
      name: cat._id || 'Other',
      // handle matches exact category name so frontend filtering works
      handle: cat._id || 'Other',
      count: cat.count,
      // prefer a real product image, fall back to curated Unsplash
      image: cat.sampleImage || categoryImages[cat._id] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
      description: categoryDescriptions[cat._id] || 'Explore our collection'
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTrendingProducts = async (req, res) => {
  try {
    const Sale = require('../models/Sale');
    const limit = parseInt(req.query.limit) || 8;

    // Aggregate top-sold products from completed sales
    const trending = await Sale.aggregate([
      { $match: { type: 'sale', status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$product', { totalSold: '$totalSold' }] } } }
    ]);

    if (trending.length >= 4) {
      return res.json({ products: trending, total: trending.length, source: 'sales' });
    }

    // Fallback: featured products
    let products = await Product.find({ featured: true }).sort({ createdAt: -1 }).limit(limit).lean();
    if (products.length < 4) {
      products = await Product.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    }
    res.json({ products: products.map(p => ({ ...p, totalSold: 0 })), total: products.length, source: 'fallback' });
  } catch (err) {
    console.error('getTrendingProducts error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { limit = 20, offset = 0, q, category, featured } = req.query;
    let query = {};

    if (q) {
      query.$text = { $search: q };
    }
    if (category) {
      query.category = category;
    }
    if (featured === 'true') {
      query.featured = true;
    }

    const limitNum = parseInt(limit) || 20;
    const offsetNum = parseInt(offset) || 0;

    const products = await Product.find(query)
      .skip(offsetNum)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Product.countDocuments(query);

    res.json({ products, count: products.length, offset: offsetNum, total });
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const reviews = await Review.find({ product: product._id }).populate('user', 'name');
    res.json({ product, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadImage(file.path));
      const uploadedImages = await Promise.all(uploadPromises);
      productData.images = uploadedImages.map(img => ({
        url: img.url,
        publicId: img.publicId,
      }));
    }
    
    if (!productData.slug) {
      productData.slug = productData.name.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 8);
    }
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const productData = { ...req.body };
    
    if (req.files && req.files.length > 0) {
      if (product.images && product.images.length > 0) {
        const publicIds = product.images
          .filter(img => img.publicId)
          .map(img => img.publicId);
        if (publicIds.length > 0) {
          await deleteImages(publicIds);
        }
      }
      
      const uploadPromises = req.files.map(file => uploadImage(file.path));
      const uploadedImages = await Promise.all(uploadPromises);
      productData.images = uploadedImages.map(img => ({
        url: img.url,
        publicId: img.publicId,
      }));
    }
    
    Object.assign(product, productData);
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.images && product.images.length > 0) {
      const publicIds = product.images
        .filter(img => img.publicId)
        .map(img => img.publicId);
      if (publicIds.length > 0) {
        await deleteImages(publicIds);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, category } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// POST /api/admin/products/import - Bulk import products
exports.importProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products to import' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      // Validation
      if (!p.name || !p.name.trim()) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Missing product name`);
        continue;
      }
      if (!p.category || !p.category.trim()) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Missing category`);
        continue;
      }
      if (!p.price || isNaN(parseFloat(p.price))) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Invalid or missing price`);
        continue;
      }

      const price = parseFloat(p.price);
      const stock = p.stock ? parseInt(p.stock) : 0;
      const costPrice = p.cost_price ? parseFloat(p.cost_price) : price * 0.6;

      // Build variants
      const variants = [];
      if (p.size || p.color) {
        variants.push({
          size: p.size || 'Default',
          color: p.color || 'Default',
          price,
          costPrice,
          stock,
          sku: p.sku || '',
        });
      } else {
        // Default variant
        variants.push({
          size: 'Default',
          color: 'Default',
          price,
          costPrice,
          stock,
          sku: p.sku || '',
        });
      }

      // Check for duplicate
      const existing = await Product.findOne({ name: { $regex: new RegExp(`^${p.name}$`, 'i') } });
      if (existing) {
        // Update existing
        existing.description = p.description || existing.description;
        existing.category = p.category || existing.category;
        existing.variants = variants;
        if (p.image_url) existing.images = [{ url: p.image_url }];
        existing.status = p.status === 'draft' ? 'draft' : 'published';
        await existing.save();
        results.success++;
      } else {
        // Create new
        await Product.create({
          name: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          description: p.description || '',
          category: p.category,
          status: p.status === 'draft' ? 'draft' : 'published',
          images: p.image_url ? [{ url: p.image_url }] : [],
          variants,
          tags: p.tags ? p.tags.split(';').map(t => t.trim()) : [],
        });
        results.success++;
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/products/parse-csv - Parse CSV for preview
exports.parseCSV = async (req, res) => {
  try {
    const { csv } = req.body;

    if (!csv) {
      return res.status(400).json({ error: 'CSV content is required' });
    }

    const products = parseCSV(csv);
    res.json({ products, count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
