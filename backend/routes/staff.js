const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const { getStaff, getStaffById, createStaff, updateStaff, deleteStaff, setStaffPin } = require('../controllers/posController');

router.get('/', auth, adminOnly, getStaff);
router.post('/', auth, adminOnly, createStaff);
router.get('/:id', auth, adminOnly, getStaffById);
router.put('/:id', auth, adminOnly, updateStaff);
router.put('/:id/pin', auth, adminOnly, setStaffPin);
router.delete('/:id', auth, adminOnly, deleteStaff);

module.exports = router;
