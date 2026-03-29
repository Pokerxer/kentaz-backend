const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const path = require('path');
const { auth, adminOnly } = require('../middleware/auth');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|webp|gif/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed'));
  },
});

// POST /api/admin/upload  — upload a single image, returns { url, publicId }
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const result = await uploadImage(req.file.path, 'kentaz/products');
    res.json({ url: result.url, publicId: result.publicId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/upload  — delete image by publicId
router.delete('/', auth, adminOnly, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ error: 'publicId required' });
    await deleteImage(publicId);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
