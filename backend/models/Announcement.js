const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  type:      { type: String, enum: ['info', 'warning', 'success', 'promo'], default: 'info' },
  active:    { type: Boolean, default: true },
  startsAt:  { type: Date },
  endsAt:    { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
