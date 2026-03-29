const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBooking,
  getAdminBookings,
  updateBookingStatus,
  initializeBookingPayment,
  getAvailableSlots,
  cancelBooking,
  getTherapists,
} = require('../controllers/bookingController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', auth, createBooking);
router.get('/', auth, getBookings);
router.get('/slots', auth, getAvailableSlots);
router.get('/therapists', auth, getTherapists);
router.get('/:id', auth, getBooking);
router.post('/:id/pay', auth, initializeBookingPayment);
router.post('/:id/cancel', auth, cancelBooking);

router.get('/admin/bookings', auth, adminOnly, getAdminBookings);
router.put('/:id/status', auth, adminOnly, updateBookingStatus);

module.exports = router;
