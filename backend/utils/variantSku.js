const Counter = require('../models/Counter');

// Numeric SKUs for variants that arrive without one.
//
// The SKU *is* the barcode here: it is what gets printed on the tag, what the
// scanner reads back, and what the POS matches on. So a generated one has to
// look like the ones already in the catalogue — 12 numeric digits — and it has
// to be impossible to confuse with them.
//
// Hence the leading 9. Existing SKUs are 12-digit numbers beginning 2 (plus one
// legacy 6-digit code); nothing starts with 9, so the generated range can never
// collide with a code someone typed in from a physical product.
//
//   9 + 00000000042
//   ^   ^^^^^^^^^^^
//   |   11-digit sequence
//   generated-here marker
const PREFIX = '9';
const SEQUENCE_DIGITS = 11;
const SEQUENCE_NAME = 'variantSku';

// Reaching this would need a hundred billion variants, but a SKU that silently
// wrapped and duplicated an existing one would be far worse than a loud
// failure — two variants answering to one scan is the thing we are preventing.
const MAX_SEQUENCE = 10 ** SEQUENCE_DIGITS - 1;

/** True if a string is one of the SKUs this module generates. */
function isGenerated(sku) {
  return typeof sku === 'string' && new RegExp(`^${PREFIX}\\d{${SEQUENCE_DIGITS}}$`).test(sku);
}

/** Turn a sequence number into a complete SKU. */
function fromSequence(seq) {
  if (!Number.isInteger(seq) || seq < 1 || seq > MAX_SEQUENCE) {
    throw new Error(`SKU sequence out of range: ${seq}`);
  }
  return PREFIX + String(seq).padStart(SEQUENCE_DIGITS, '0');
}

/**
 * Reserve `count` SKUs in a single atomic increment.
 *
 * Taking the whole block at once means a 12-variant product costs one round
 * trip instead of twelve, and — more importantly — two concurrent saves can
 * never be handed overlapping numbers.
 *
 * Gaps are expected and harmless: a save that fails after allocating simply
 * burns its block. The numbers carry no meaning beyond identity.
 */
async function allocate(count) {
  if (!Number.isInteger(count) || count < 1) return [];

  const counter = await Counter.findOneAndUpdate(
    { _id: SEQUENCE_NAME },
    { $inc: { seq: count } },
    { new: true, upsert: true },
  );

  const last = counter.seq;
  const codes = [];
  for (let seq = last - count + 1; seq <= last; seq++) codes.push(fromSequence(seq));
  return codes;
}

module.exports = { allocate, fromSequence, isGenerated, PREFIX, MAX_SEQUENCE };
