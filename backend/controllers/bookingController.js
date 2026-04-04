const axios = require('axios');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');

exports.createBooking = async (req, res) => {
  try {
    const { serviceType, therapistId, date, timeSlot, duration, amount, notes, sessionType, intake } = req.body;
    const booking = new Booking({
      user: req.user.id,
      serviceType,
      therapistId,
      date,
      timeSlot,
      duration,
      amount,
      notes,
      sessionType: sessionType || 'in-person',
      intake: intake || undefined,
    });
    await booking.save();
    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('therapistId', 'name avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('therapistId', 'name avatar')
      .sort({ date: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id })
      .populate('user', 'name email')
      .populate('therapistId', 'name avatar');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('therapistId', 'name avatar')
      .sort({ date: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('user', 'name email')
      .populate('therapistId', 'name avatar');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Initialize payment for a booking
exports.initializeBookingPayment = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Booking is already paid' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is cancelled' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reference = `KTB-${booking._id}-${Date.now()}`;
    const amountInKobo = Math.round(booking.amount * 100);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: amountInKobo,
        reference,
        metadata: {
          bookingId: booking._id.toString(),
          type: 'booking',
        },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );

    const { authorization_url, access_code } = response.data.data;
    booking.paystackRef = reference;
    await booking.save();

    res.json({ authorizationUrl: authorization_url, accessCode: access_code, reference });
  } catch (err) {
    console.error('Booking payment init error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || 'Payment initialization failed' });
  }
};

// Get available time slots for a given date and service type
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, serviceType } = req.query;
    if (!date || !serviceType) {
      return res.status(400).json({ error: 'date and serviceType are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      serviceType,
      status: { $ne: 'cancelled' },
    }).select('timeSlot');

    const bookedSlots = existingBookings.map(b => b.timeSlot);

    const allSlots = serviceType === 'therapy'
      ? ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
      : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const available = allSlots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot),
    }));

    res.json(available);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get therapists by service type
exports.getTherapists = async (req, res) => {
  try {
    const { serviceType } = req.query;
    const query = { role: 'therapist', isActive: true };
    if (serviceType === 'therapy') {
      // All active therapists serve therapy
    }
    const therapists = await User.find(query)
      .select('name avatar role specialization bio yearsExp approachTags')
      .sort({ name: 1 })
      .lean();
    res.json(therapists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const bookingDate = new Date(booking.date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < 24 && booking.paymentStatus === 'paid') {
      return res.status(400).json({
        error: 'Cancellations less than 24 hours before the session are non-refundable. Contact support for special circumstances.'
      });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.id;
    await booking.save();

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
