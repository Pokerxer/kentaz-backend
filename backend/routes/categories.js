const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    
    // Get product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat.name });
        return {
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          count
        };
      })
    );
    
    // Add uncategorized products
    const uncategorizedCount = await Product.countDocuments({ category: { $exists: false } });
    
    res.json([...categoriesWithCounts, { 
      name: 'Other', 
      slug: 'other', 
      description: 'Uncategorized products',
      count: uncategorizedCount 
    }]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all categories (including inactive)
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat.name });
        return {
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          isActive: cat.isActive,
          sortOrder: cat.sortOrder,
          count
        };
      })
    );
    
    res.json(categoriesWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create category
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, image, isActive, sortOrder } = req.body;
    
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    const category = new Category({
      name,
      slug,
      description,
      image,
      isActive: isActive !== false,
      sortOrder: sortOrder || 0
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update category
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, image, isActive, sortOrder } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Update slug if name changed
    if (name && name !== category.name) {
      category.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete category
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Move products to "Other" category
    await Product.updateMany(
      { category: category.name },
      { category: 'Other' }
    );
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
