const mongoose = require('mongoose');

const availabilitySettingsSchema = new mongoose.Schema({
  serviceType: { type: String, enum: ['therapy', 'podcast'], required: true, unique: true },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun … 6=Sat
  timeSlots: { type: [String], default: [] },
  slotDuration: { type: Number, default: 60 },
  blockedDates: [
    {
      date: { type: Date, required: true },
      reason: { type: String, default: '' },
    },
  ],
  blockedSlots: [
    {
      date: { type: Date, required: true },
      time: { type: String, required: true },
      reason: { type: String, default: '' },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('AvailabilitySettings', availabilitySettingsSchema);
