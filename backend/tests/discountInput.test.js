const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeProductPrices } = require('../utils/discountInput');

// Hand-priced products are stored alongside the selection they belong to, so
// the two can drift apart if the form sends a price for a product that is no
// longer picked. These cases pin down how that is reconciled on save.

test('keeps a price for a selected product', () => {
  assert.deepEqual(
    sanitizeProductPrices([{ product: 'p1', price: 12500 }], ['p1']),
    [{ product: 'p1', price: 12500 }]
  );
});

test('drops a price for a product no longer selected', () => {
  // Otherwise unselecting a product leaves a stale price behind that silently
  // comes back into force the next time it is picked.
  assert.deepEqual(sanitizeProductPrices([{ product: 'p2', price: 500 }], ['p1']), []);
});

test('keeps one entry per product when ids are duplicated', () => {
  assert.deepEqual(
    sanitizeProductPrices([{ product: 'p1', price: 9000 }, { product: 'p1', price: 12500 }], ['p1']),
    [{ product: 'p1', price: 12500 }]
  );
});

test('rejects prices that are not a usable number', () => {
  // Number(null), Number('') and Number([]) are all 0, so a blank price must be
  // rejected outright — storing it as 0 would give the product away.
  const entries = [
    { product: 'p1', price: 'not a price' },
    { product: 'p1', price: null },
    { product: 'p1', price: undefined },
    { product: 'p1', price: '' },
    { product: 'p1', price: '   ' },
    { product: 'p1', price: [] },
    { product: 'p1', price: -100 },
    { product: 'p1' },
  ];
  for (const entry of entries) {
    assert.deepEqual(sanitizeProductPrices([entry], ['p1']), [], `accepted ${JSON.stringify(entry)}`);
  }
});

test('a zero price is kept — a giveaway is a real decision', () => {
  assert.deepEqual(
    sanitizeProductPrices([{ product: 'p1', price: 0 }], ['p1']),
    [{ product: 'p1', price: 0 }]
  );
});

test('rounds fractional prices to whole naira', () => {
  assert.deepEqual(
    sanitizeProductPrices([{ product: 'p1', price: 12499.6 }], ['p1']),
    [{ product: 'p1', price: 12500 }]
  );
});

test('accepts populated documents on either side', () => {
  assert.deepEqual(
    sanitizeProductPrices([{ product: { _id: 'p1' }, price: 12500 }], [{ _id: 'p1' }]),
    [{ product: 'p1', price: 12500 }]
  );
});

test('missing or malformed input yields no prices', () => {
  assert.deepEqual(sanitizeProductPrices(undefined, ['p1']), []);
  assert.deepEqual(sanitizeProductPrices(null, ['p1']), []);
  assert.deepEqual(sanitizeProductPrices('nonsense', ['p1']), []);
  assert.deepEqual(sanitizeProductPrices([null, undefined], ['p1']), []);
  assert.deepEqual(sanitizeProductPrices([{ product: 'p1', price: 12500 }], undefined), []);
});
