// utils/korapay.js
//
// One place for talking to Korapay, because the two things that go wrong in
// production are both about *how* the call fails rather than what it returns:
//
//   1. Korapay's edge intermittently answers 5xx (Cloudflare 502 / AA029
//      "internal server error") for perfectly good requests. Every call site
//      used to do a bare axios request with no retry, so a blip during
//      checkout stranded a real payment.
//   2. "Korapay was unreachable" and "Korapay says this charge is not
//      successful" used to land in the same catch block. They need opposite
//      handling: the first must never lose a payment, the second must never
//      create an order.
//
// classifyChargeFailure() draws that line, and requestWithRetry() removes most
// of the blips before anyone has to.

const axios = require('axios');

const KORAPAY_BASE_URL = 'https://api.korapay.com/merchant/api/v1';

// Korapay's per-transaction ceiling is set per merchant account. For this
// account every enabled channel (card, bank_transfer, pay_with_bank) is capped
// at NGN 200,000 — raising it is a Korapay support request, not a code change.
// Kept here so the API layer and the storefront quote the same number.
const MAX_CHARGE_NGN = Number(process.env.KORAPAY_MAX_CHARGE_NGN || 200000);

const RETRY_ATTEMPTS = Number(process.env.KORAPAY_RETRY_ATTEMPTS || 3);
const RETRY_BASE_DELAY_MS = Number(process.env.KORAPAY_RETRY_BASE_DELAY_MS || 400);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSecretKey = () => process.env.KORAPAY_SECRET_KEY;

/**
 * True when an error is worth trying again: no response at all (DNS, socket,
 * timeout) or a 5xx/429 from Korapay's edge. A 4xx is Korapay's considered
 * answer and repeating it just wastes the shopper's time.
 */
function isTransientError(error) {
  const status = error.response?.status;
  if (status === undefined) return true; // network / timeout / aborted
  return status >= 500 || status === 429;
}

/**
 * axios with backoff on transient failures. Throws the last error if every
 * attempt fails, so callers still see a normal axios error.
 */
async function requestWithRetry(config, { attempts = RETRY_ATTEMPTS } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await axios({
        timeout: 25000,
        ...config,
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          'Content-Type': 'application/json',
          ...config.headers,
        },
      });
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientError(error)) throw error;
      const status = error.response?.status || error.code || 'network error';
      console.warn(
        `[korapay] ${config.method || 'get'} ${config.url} failed (${status}) — retry ${attempt}/${attempts - 1}`
      );
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

/** POST /charges/initialize */
function initializeCharge(payload) {
  return requestWithRetry({
    method: 'post',
    url: `${KORAPAY_BASE_URL}/charges/initialize`,
    data: payload,
  });
}

/**
 * GET /charges/:reference
 * @returns {Promise<object>} the `data` object Korapay returns for the charge.
 */
async function fetchCharge(reference) {
  const response = await requestWithRetry({
    method: 'get',
    url: `${KORAPAY_BASE_URL}/charges/${encodeURIComponent(reference)}`,
  });
  return response.data.data;
}

/**
 * Decide what a failed verification means.
 *
 * `definitive: true`  — Korapay answered and the answer is no (unknown
 *   reference, bad key, malformed request). Safe to reject the order: no money
 *   moved, or none we can see.
 * `definitive: false` — we never got an answer (network, timeout, 5xx). The
 *   shopper may well have paid, so the caller must record the order rather than
 *   turn them away, and let the webhook or a later re-check settle it.
 */
function classifyChargeFailure(error) {
  const status = error.response?.status;
  const body = error.response?.data;
  return {
    definitive: status !== undefined && status < 500 && status !== 429,
    status: status || null,
    code: body?.code || error.code || null,
    message: body?.message || error.message || 'Korapay request failed',
  };
}

/**
 * Has money actually been captured for this charge?
 *
 * A charge sits at `processing` in two very different situations: it was
 * initialised and never paid (amount_paid 0.00), or it was paid and is still
 * settling — common on bank transfers. Treating both as "not paid" turns a
 * settling transfer into a lost order, so the amount is what we go by.
 */
function isChargePaid(txn = {}) {
  if (txn.status === 'success') return true;
  const paid = Number(txn.amount_paid);
  return txn.status === 'processing' && Number.isFinite(paid) && paid > 0;
}

/** Amount actually captured, in naira. Null when Korapay didn't say. */
function chargeAmountPaid(txn = {}) {
  const paid = Number(txn.amount_paid ?? txn.amount);
  return Number.isFinite(paid) ? paid : null;
}

/**
 * Human-readable reason a charge cannot be created for this amount, or null if
 * it is fine. Mirrors Korapay's AA021 rejection but catches it before the
 * shopper is bounced out of a payment modal with a raw gateway error.
 */
function amountLimitError(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 100) {
    return 'The minimum online payment is ₦100.';
  }
  if (value > MAX_CHARGE_NGN) {
    return (
      `This total (₦${Math.round(value).toLocaleString()}) is above the ₦${MAX_CHARGE_NGN.toLocaleString()} ` +
      `per-transaction limit for online payments. Please split it into smaller payments or contact us to complete this order.`
    );
  }
  return null;
}

module.exports = {
  KORAPAY_BASE_URL,
  MAX_CHARGE_NGN,
  requestWithRetry,
  initializeCharge,
  fetchCharge,
  isTransientError,
  classifyChargeFailure,
  isChargePaid,
  chargeAmountPaid,
  amountLimitError,
};
