const express = require('express');
const router = express.Router();
const { auth, adminOnly, posAccess } = require('../middleware/auth');
const {
  getBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
  validateBundle,
} = require('../controllers/bundleController');

router.get('/', auth, posAccess, getBundles);
router.get('/:id', auth, posAccess, getBundle);
router.post('/validate', auth, posAccess, validateBundle);
router.post('/', auth, adminOnly, createBundle);
router.put('/:id', auth, adminOnly, updateBundle);
router.delete('/:id', auth, adminOnly, deleteBundle);

module.exports = router;