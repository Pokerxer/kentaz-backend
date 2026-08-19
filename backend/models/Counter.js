const mongoose = require('mongoose');

// Named, monotonic sequences.
//
// One document per sequence. The only supported operation is an atomic $inc,
// which is what makes it safe to hand out barcode numbers from concurrent
// requests without two products ever receiving the same code.
const counterSchema = new mongoose.Schema({
  _id: { type: String },              // sequence name, e.g. 'variantBarcode'
  seq: { type: Number, default: 0 },  // highest number handed out so far
}, { versionKey: false });

module.exports = mongoose.model('Counter', counterSchema);
