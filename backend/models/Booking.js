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
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'failed', 'refunded'],
    default: 'unpaid'
  },
  amount: { type: Number, required: true },
  notes: String,
  // Therapy intake questionnaire answers
  intake: {
    reason: String,          // e.g. 'anxiety', 'depression', 'relationships', 'trauma', 'grief', 'other'
    firstTime: Boolean,
    approach: String,        // e.g. 'cbt', 'talk', 'holistic', 'no_preference'
  },
  sessionType: {
    type: String,
    enum: ['in-person', 'online'],
    default: 'in-person'
  },
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
