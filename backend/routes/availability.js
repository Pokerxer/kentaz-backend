const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  blockDate,
  unblockDate,
  blockSlot,
  unblockSlot,
  getCalendar,
} = require('../controllers/availabilityController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/:serviceType', auth, adminOnly, getSettings);
router.put('/:serviceType', auth, adminOnly, updateSettings);
router.get('/:serviceType/calendar', auth, adminOnly, getCalendar);
router.post('/:serviceType/block-date', auth, adminOnly, blockDate);
router.delete('/:serviceType/block-date', auth, adminOnly, unblockDate);
router.post('/:serviceType/block-slot', auth, adminOnly, blockSlot);
router.delete('/:serviceType/block-slot', auth, adminOnly, unblockSlot);

module.exports = router;
