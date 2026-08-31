const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

const { fromSequence, isGenerated, PREFIX, MAX_SEQUENCE } = require('../utils/variantSku');

// SKUs shaped like the ones already in the catalogue: 12 numeric digits from 219.
const EXISTING = '219218111005';
const OTHER = '219221111044';
// The lowest code anywhere in the catalogue. The generated band stops below it.
const LOWEST_SUPPLIER = '219101111071';

test('generated SKUs match the catalogue shape and are recognisable', () => {
  for (const seq of [1, 2, 42, 999, 12345678, MAX_SEQUENCE]) {
    const sku = fromSequence(seq);
    assert.strictEqual(sku.length, 12, `${sku} should be 12 digits like the existing SKUs`);
    assert.ok(/^\d{12}$/.test(sku), `${sku} should be numeric`);
    assert.ok(sku.startsWith('219'), `${sku} should read as a catalogue SKU`);
    assert.ok(sku.startsWith(PREFIX), `${sku} should start with ${PREFIX}`);
    assert.ok(isGenerated(sku));
  }
});

test('the generated band sits below every supplier code', () => {
  // Generated codes look like catalogue codes on the shelf — that is the point
  // — but they occupy 219000000001..219099999999, and the lowest code the shop
  // has ever been sent is higher than that. So the two ranges cannot meet.
  assert.ok(fromSequence(MAX_SEQUENCE) < LOWEST_SUPPLIER,
    'the top of the generated band must fall below the lowest supplier code');
  assert.ok(!isGenerated(LOWEST_SUPPLIER));
  assert.ok(!isGenerated(EXISTING));
  assert.ok(!isGenerated('219136411102'));
  assert.ok(!isGenerated('000741'));
  assert.ok(!isGenerated(''));
  assert.ok(!isGenerated('2190'));
  assert.ok(!isGenerated('2190000000123'));  // one digit too long
});

test('fromSequence is stable and collision-free', () => {
  assert.strictEqual(fromSequence(42), fromSequence(42));
  const seen = new Set();
  for (let seq = 1; seq <= 2000; seq++) seen.add(fromSequence(seq));
  assert.strictEqual(seen.size, 2000, 'every sequence must yield a distinct SKU');
});

test('fromSequence refuses out-of-range input rather than wrapping', () => {
  // Silently wrapping would hand out a SKU already stuck on other stock, and
  // running past MAX_SEQUENCE would walk into the supplier range.
  for (const bad of [0, -1, 1.5, NaN, MAX_SEQUENCE + 1]) {
    assert.throws(() => fromSequence(bad), /out of range/);
  }
});

/**
 * The pre-save hook from models/Product, loaded against a stubbed Counter.
 *
 * No database is involved: the hook walks `this.variants` and asks
 * `this.constructor` what the rest of the catalogue holds, so calling it with a
 * stub exercises its logic faithfully and keeps the test fast and offline. The
 * stub records every $inc so the tests can assert that a product with twelve
 * new variants costs one increment, not twelve.
 */
function loadHook() {
  const calls = [];
  let seq = 0;

  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request.endsWith('models/Counter')) {
      return {
        findOneAndUpdate: async (_filter, update) => {
          calls.push(update.$inc.seq);
          seq += update.$inc.seq;
          return { seq };
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const bust = () => {
    for (const key of Object.keys(require.cache)) {
      if (key.includes('utils/variantSku') || key.includes('models/Product')) delete require.cache[key];
    }
  };
  bust();

  // Mongoose registers its own save hooks (timestamps, validation) through the
  // same method and with varying arity, so forward every argument untouched
  // and pick ours out by name.
  const mongoose = require('mongoose');
  let hook;
  const originalPre = mongoose.Schema.prototype.pre;
  mongoose.Schema.prototype.pre = function patched(...args) {
    const fn = args.find(a => typeof a === 'function' && a.name === 'assignVariantSkus');
    if (fn) hook = fn;
    return originalPre.apply(this, args);
  };

  try {
    delete mongoose.models.Product;
    require('../models/Product');
  } finally {
    mongoose.Schema.prototype.pre = originalPre;
  }

  assert.ok(hook, 'expected models/Product to register a pre-save hook');
  return { hook, calls, restore: () => { Module._load = originalLoad; bust(); } };
}

/**
 * A product document as the hook sees it.
 *
 * `catalogue` is what *other* products hold. The hook reaches for
 * `this.constructor` to ask, so a bare object literal would hand it `Object`;
 * the stub answers the one query the hook makes. Every call is recorded so a
 * test can assert the catalogue is not queried when there is nothing to check.
 */
function makeProduct(variants, { catalogue = [], _id } = {}) {
  const queries = [];
  return {
    _id,
    variants,
    queries,
    constructor: {
      distinct: async (field, filter) => {
        queries.push(filter);
        return [...catalogue];
      },
    },
  };
}

test('assigns a SKU to every variant that lacks one', async () => {
  const { hook, restore } = loadHook();
  try {
    const product = makeProduct([{ size: 'S' }, { size: 'M' }, { size: 'L' }]);
    await hook.call(product);

    for (const variant of product.variants) {
      assert.ok(isGenerated(variant.sku), `${variant.sku} should be a generated SKU`);
    }
    assert.strictEqual(new Set(product.variants.map(v => v.sku)).size, 3);
  } finally {
    restore();
  }
});

test('never overwrites a SKU that is already there', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    // These are real codes off real products. Rewriting one would orphan every
    // tag already stuck on stock.
    const product = makeProduct([
      { size: 'PINK', sku: EXISTING },
      { size: 'BLACK' },
      { size: 'PINK/WHITE', sku: OTHER },
    ]);
    await hook.call(product);

    assert.strictEqual(product.variants[0].sku, EXISTING);
    assert.strictEqual(product.variants[2].sku, OTHER);
    assert.ok(isGenerated(product.variants[1].sku));
    assert.deepStrictEqual(calls, [1], 'only the blank variant should be allocated');
  } finally {
    restore();
  }
});

test('does nothing when every variant already has a SKU', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    await hook.call(makeProduct([{ sku: EXISTING }, { sku: OTHER }]));
    assert.deepStrictEqual(calls, [], 'the counter should not be touched');
  } finally {
    restore();
  }
});

test('takes the whole block in one increment', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    const product = makeProduct(Array.from({ length: 12 }, (_, i) => ({ size: String(i) })));
    await hook.call(product);
    assert.deepStrictEqual(calls, [12], 'twelve variants should cost one $inc of 12');
  } finally {
    restore();
  }
});

test('reassigns a duplicated SKU', async () => {
  const { hook, restore } = loadHook();
  try {
    // What "duplicate variant" produces if the clone keeps its source's SKU:
    // two sizes answering to one scan.
    const product = makeProduct([
      { size: 'S', sku: EXISTING },
      { size: 'M', sku: EXISTING },
    ]);
    await hook.call(product);

    assert.strictEqual(product.variants[0].sku, EXISTING, 'the original keeps its code');
    assert.notStrictEqual(product.variants[1].sku, EXISTING, 'the copy must get a new one');
    assert.ok(isGenerated(product.variants[1].sku));
  } finally {
    restore();
  }
});

test('refuses a SKU another product already holds', async () => {
  const { hook, restore } = loadHook();
  try {
    // Within one product a repeat is a cloning accident and the copy is
    // renumbered. Across products it is a genuine conflict: one of the two is a
    // real code off a real box, and picking a winner here would orphan whatever
    // tags are already on the shelf.
    const product = makeProduct([{ size: 'S', sku: EXISTING }], { catalogue: [EXISTING] });
    await assert.rejects(
      () => hook.call(product),
      err => err.message.includes(EXISTING) && /another product/.test(err.message),
      'the error must name the offending code',
    );
  } finally {
    restore();
  }
});

test('excludes the product itself, so re-saving is not a conflict', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    const product = makeProduct([{ size: 'S', sku: EXISTING }], { _id: 'p1' });
    await hook.call(product);

    assert.strictEqual(product.variants[0].sku, EXISTING);
    assert.deepStrictEqual(calls, []);
    assert.deepStrictEqual(
      product.queries[0]._id, { $ne: 'p1' },
      'the lookup must exclude the document being saved',
    );
  } finally {
    restore();
  }
});

test('skips a generated code the catalogue already holds', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    // The generated band sits below the supplier range today, but that is an
    // observation about current data, not a law. If the sequence ever lands on
    // a code in use, it must burn the number rather than issue it twice.
    const first = fromSequence(1);
    const product = makeProduct([{ size: 'S' }], { catalogue: [first] });
    await hook.call(product);

    assert.notStrictEqual(product.variants[0].sku, first, 'the taken code must not be issued');
    assert.strictEqual(product.variants[0].sku, fromSequence(2));
    assert.deepStrictEqual(calls, [1, 1], 'the collided number is burnt, not reused');
  } finally {
    restore();
  }
});

test('does not query the catalogue when there is nothing to check', async () => {
  const { hook, restore } = loadHook();
  try {
    const product = makeProduct([]);
    await hook.call(product);
    assert.deepStrictEqual(product.queries, [], 'an empty product should cost no lookup');
  } finally {
    restore();
  }
});

test('treats a whitespace-only SKU as blank', async () => {
  const { hook, restore } = loadHook();
  try {
    const product = makeProduct([{ size: 'S', sku: '   ' }]);
    await hook.call(product);
    assert.ok(isGenerated(product.variants[0].sku));
  } finally {
    restore();
  }
});

test('trims a SKU it keeps', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    const product = makeProduct([{ size: 'S', sku: `  ${EXISTING}  ` }]);
    await hook.call(product);
    assert.strictEqual(product.variants[0].sku, EXISTING);
    assert.deepStrictEqual(calls, []);
  } finally {
    restore();
  }
});

test('handles a product with no variants', async () => {
  const { hook, calls, restore } = loadHook();
  try {
    await hook.call(makeProduct([]));
    await hook.call(makeProduct(undefined));
    assert.deepStrictEqual(calls, []);
  } finally {
    restore();
  }
});
