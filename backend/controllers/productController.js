const Product = require('../models/Product');
const Review = require('../models/Review');
const { v4: uuidv4 } = require('uuid');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
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
      handle: (cat._id || 'other').toLowerCase().replace(/\s+/g, '-'),
      count: cat.count,
      image: categoryImages[cat._id] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
      description: categoryDescriptions[cat._id] || 'Explore our collection'
    }));
    
    res.json(result);
  } catch (err) {
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

    const products = await Product.find(query)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({ products, count: products.length, offset: parseInt(offset), total });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const product = new Product(req.body);
    if (!product.slug) {
      product.slug = product.name.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 8);
    }
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
