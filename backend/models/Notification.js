const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['order', 'low_stock', 'out_of_stock', 'customer', 'booking', 'system'],
    required: true,
  },
  title:   { type: String, required: true },
  message: { type: String, default: '' },
  link:    { type: String, default: '' },
  ref:     { type: String },         // deduplication key
  isRead:  { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ ref: 1 }, { unique: true, sparse: true });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
