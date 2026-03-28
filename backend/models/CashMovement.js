const mongoose = require('mongoose');
const { Schema } = mongoose;

const cashMovementSchema = new Schema({
  register: { type: Schema.Types.ObjectId, ref: 'Register', required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  reason: { type: String, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String },
}, { timestamps: true });

cashMovementSchema.index({ register: 1, createdAt: -1 });

module.exports = mongoose.model('CashMovement', cashMovementSchema);
