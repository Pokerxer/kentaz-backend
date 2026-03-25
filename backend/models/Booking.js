const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceType: { type: String, enum: ['therapy', 'podcast'], required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  duration: { type: Number, default: 60 },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paystackRef: String,
  amount: { type: Number, required: true },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
