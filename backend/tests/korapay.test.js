const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isTransientError,
  classifyChargeFailure,
  isChargePaid,
  chargeAmountPaid,
  amountLimitError,
  MAX_CHARGE_NGN,
} = require('../utils/korapay');

// Shapes copied from real Korapay responses (values synthetic).
const httpError = (status, body) => ({ response: { status, data: body } });
const networkError = (code) => ({ code, message: 'socket hang up' });

// ── Retry classification ────────────────────────────────────────
// The gateway's edge answers 502/AA029 for good requests often enough that a
// single attempt is not a fair test of whether a payment exists.

test('5xx and rate limits are worth retrying', () => {
  assert.equal(isTransientError(httpError(500, { code: 'AA029' })), true);
  assert.equal(isTransientError(httpError(502, {})), true);
  assert.equal(isTransientError(httpError(503, {})), true);
  assert.equal(isTransientError(httpError(429, {})), true);
});

test('no response at all is worth retrying', () => {
  assert.equal(isTransientError(networkError('ECONNRESET')), true);
  assert.equal(isTransientError(networkError('ETIMEDOUT')), true);
});

test("4xx is the gateway's considered answer — do not retry", () => {
  assert.equal(isTransientError(httpError(404, { code: 'AA026' })), false);
  assert.equal(isTransientError(httpError(401, {})), false);
  assert.equal(isTransientError(httpError(409, { code: 'AA021' })), false);
});

// ── Definitive vs unreachable ───────────────────────────────────
// This is the line that decides whether a shopper's money can go missing.

test('unknown reference is definitive — safe to refuse the order', () => {
  const failure = classifyChargeFailure(
    httpError(404, { code: 'AA026', message: 'Charge not found' })
  );
  assert.equal(failure.definitive, true);
  assert.equal(failure.code, 'AA026');
});

test('gateway outage is NOT definitive — the order must still be recorded', () => {
  assert.equal(classifyChargeFailure(httpError(502, {})).definitive, false);
  assert.equal(classifyChargeFailure(httpError(500, { code: 'AA029' })).definitive, false);
  assert.equal(classifyChargeFailure(networkError('ECONNRESET')).definitive, false);
  assert.equal(classifyChargeFailure(httpError(429, {})).definitive, false);
});

// ── Paid detection ──────────────────────────────────────────────
// `processing` means two opposite things; amount_paid is what separates them.

test('success is paid', () => {
  assert.equal(isChargePaid({ status: 'success', amount_paid: '5000.00' }), true);
});

test('processing with money captured is paid (settling transfer)', () => {
  assert.equal(isChargePaid({ status: 'processing', amount_paid: '5000.00' }), true);
});

test('processing with nothing captured is not paid (initialised, abandoned)', () => {
  assert.equal(isChargePaid({ status: 'processing', amount_paid: '0.00' }), false);
});

test('failed and expired are not paid', () => {
  assert.equal(isChargePaid({ status: 'failed', amount_paid: '0.00' }), false);
  assert.equal(isChargePaid({ status: 'expired' }), false);
  assert.equal(isChargePaid({}), false);
});

test('amount paid prefers amount_paid over the requested amount', () => {
  assert.equal(chargeAmountPaid({ amount: '5000.00', amount_paid: '4500.00' }), 4500);
  assert.equal(chargeAmountPaid({ amount: '5000.00' }), 5000);
  assert.equal(chargeAmountPaid({}), null);
});

// ── Amount limits ───────────────────────────────────────────────
// The merchant account caps every channel at NGN 200,000 (AA021).

test('amounts within the account limits are accepted', () => {
  assert.equal(amountLimitError(100), null);
  assert.equal(amountLimitError(50000), null);
  assert.equal(amountLimitError(MAX_CHARGE_NGN), null);
});

test('amounts over the ceiling are refused with the ceiling named', () => {
  const message = amountLimitError(MAX_CHARGE_NGN + 1);
  assert.ok(message, 'expected a rejection message');
  assert.match(message, /200,000/);
});

test('sub-minimum and nonsense amounts are refused', () => {
  assert.match(amountLimitError(50), /minimum/i);
  assert.match(amountLimitError(0), /minimum/i);
  assert.match(amountLimitError(NaN), /minimum/i);
  assert.match(amountLimitError(undefined), /minimum/i);
});
