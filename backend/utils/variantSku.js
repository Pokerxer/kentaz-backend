const Counter = require('../models/Counter');

// Numeric SKUs for variants that arrive without one.
//
// The SKU *is* the barcode here: it is what gets printed on the tag, what the
// scanner reads back, and what the POS matches on. So a generated one has to
// look like the ones already in the catalogue — 12 numeric digits opening 219,
// e.g. 219136411102 — and it has to be impossible to confuse with them.
//
// Both at once, via the range rather than the shape:
//
//   2190 + 00000042
//   ^^^^   ^^^^^^^^
//   |      8-digit sequence
//   every supplier code sits above this band
//
// Every code in the catalogue is 219101111071 or higher (1,086 of them, checked
// against the seed and import scripts; the two outliers, 241… and 638…, are
// higher still). Nothing starts 2190. So the whole generated band —
// 219000000001 through 219099999999, a hundred million codes — lies below the
// supplier range and cannot meet it, while still reading as an ordinary
// catalogue SKU on the shelf.
//
// That disjointness is a convenience, not the guarantee. The guarantee is that
// no two variants anywhere share a SKU, and it is enforced twice: by
// allocateUnused/usedElsewhere below, and by the unique index on variants.sku
// (see scripts/enforceVariantSkuUniqueness.js), which is what closes the race
// between two concurrent saves.
const PREFIX = '2190';
const SEQUENCE_DIGITS = 8;
const SEQUENCE_NAME = 'variantSku';

// Reaching this would need a hundred million variants, but a SKU that silently
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

/**
 * Which of `skus` some *other* product already holds.
 *
 * A SKU names one variant shop-wide, not one variant within its product, so a
 * code held elsewhere is a collision even when the document under save looks
 * perfectly consistent on its own. Returns them so the caller can name the
 * offender rather than reporting a bare failure.
 *
 * `selfId` is excluded so re-saving a product does not report it against
 * itself.
 */
async function usedElsewhere(Model, skus, selfId) {
  const wanted = [...new Set(skus.filter(Boolean))];
  if (wanted.length === 0) return [];

  const filter = { 'variants.sku': { $in: wanted } };
  if (selfId) filter._id = { $ne: selfId };

  // distinct returns every SKU on every matching product, including ones we did
  // not ask about, so intersect rather than trusting the result wholesale.
  const held = new Set(await Model.distinct('variants.sku', filter));
  return wanted.filter(sku => held.has(sku));
}

// The generated band cannot overlap the supplier range today, but "cannot"
// rests on an observation about the current catalogue, and a supplier is free
// to issue a 2190 code tomorrow. So allocation checks rather than assumes; the
// check is one indexed query per round and almost always returns nothing.
const MAX_ALLOCATION_ROUNDS = 5;

/**
 * Reserve `count` SKUs that no product is already using.
 *
 * Burnt numbers are the intended cost of a collision: re-using the sequence
 * value would mean handing the same number out twice.
 */
async function allocateUnused(Model, count) {
  if (!Number.isInteger(count) || count < 1) return [];

  const codes = [];
  for (let round = 0; round < MAX_ALLOCATION_ROUNDS && codes.length < count; round++) {
    const batch = await allocate(count - codes.length);
    const taken = await usedElsewhere(Model, batch, null);
    codes.push(...(taken.length === 0 ? batch : batch.filter(c => !taken.includes(c))));
  }

  if (codes.length < count) {
    // Five rounds of collisions means the sequence has walked into occupied
    // range. Failing loudly beats issuing a duplicate barcode.
    throw new Error(
      `Could not reserve ${count} unused SKU${count === 1 ? '' : 's'} after ${MAX_ALLOCATION_ROUNDS} attempts — ` +
      'the generated range appears to overlap codes already in the catalogue',
    );
  }

  return codes;
}

module.exports = {
  allocate,
  allocateUnused,
  usedElsewhere,
  fromSequence,
  isGenerated,
  PREFIX,
  MAX_SEQUENCE,
};
