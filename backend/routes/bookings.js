const express = require('express');
const router = express.Router();
const { createBooking, getBookings, getBooking, getAdminBookings, updateBookingStatus } = require('../controllers/bookingController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', auth, createBooking);
router.get('/', auth, getBookings);
router.get('/:id', auth, getBooking);

router.get('/admin/bookings', auth, adminOnly, getAdminBookings);
router.put('/:id/status', auth, adminOnly, updateBookingStatus);

module.exports = router;
