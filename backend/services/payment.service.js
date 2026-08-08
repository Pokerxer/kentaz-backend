// services/payment.service.js
//
// Gateway-generic payment service for Kentaz. Adapted from the DrinksHarbour
// service to Kentaz conventions:
//   - Korapay only (Paystack/Stripe intentionally omitted — no keys, not enabled).
//     The PAYMENT_GATEWAY switch and createGatewayTransaction/verifyGatewayTransaction
//     wrappers are kept so another gateway can be slotted in later.
//   - Korapay charges are in naira (major units), not kobo.
//   - Merchant references are prefixed `KTZ-` to match the rest of the codebase.
//   - Order state maps to Kentaz's existing Order schema: paid ->
//     { korapayStatus: 'success', status: 'processing' }. There is no separate
//     paymentStatus/paidAt/paymentDetails field and the status enum has no
//     'confirmed' value.

const crypto = require('crypto');
const Order = require('../models/Order');
const { ValidationError, NotFoundError } = require('../utils/errors');
const {
  KORAPAY_BASE_URL,
  initializeCharge,
  requestWithRetry,
  isChargePaid,
  amountLimitError,
} = require('../utils/korapay');

// Which gateway customer-facing payments go through. Only 'korapay' is
// implemented; the switch is kept so re-enabling another gateway is one env var.
const ACTIVE_GATEWAY = (process.env.PAYMENT_GATEWAY || 'korapay').toLowerCase();

const defaultRedirectUrl = () =>
  `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/verify`;

/**
 * Initialize a Korapay charge (without an order).
 *
 * @param {number} amount   Amount in major units (NGN) — Korapay takes naira, not kobo.
 * @param {string} email    Customer email.
 * @param {object} metadata Arbitrary metadata stored on the charge. `kind` selects
 *   the narration; `customerName` is forwarded to the customer object.
 * @param {object} [options]
 * @param {string} [options.reference]   Merchant reference. Korapay REQUIRES one at
 *   init time, so we generate a `KTZ-…` reference if absent.
 * @param {string} [options.callbackUrl] Where Korapay redirects the shopper after
 *   payment. Defaults to the cart flow's /payment/verify page.
 * @returns {Promise<{authorizationUrl:string, accessCode:null, reference:string, amount:number}>}
 */
const createKorapayCharge = async (amount, email, metadata = {}, options = {}) => {
  try {
    if (!email) throw new ValidationError('Customer email is required');
    if (!amount || amount < 1) throw new ValidationError('A valid amount is required');

    // Fail before the network call on amounts the merchant account cannot take.
    const limitError = amountLimitError(amount);
    if (limitError) throw new ValidationError(limitError);

    const reference =
      options.reference || `KTZ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const narration =
      metadata.kind === 'wallet_fund'
        ? 'Kentaz wallet funding'
        : metadata.kind === 'gift_card_purchase'
          ? 'Kentaz gift card'
          : metadata.kind === 'booking'
            ? 'Kentaz booking payment'
            : 'Kentaz order payment';

    const payload = {
      amount: Math.round(amount), // naira (integer)
      currency: 'NGN',
      reference,
      narration,
      customer: {
        email,
        ...(metadata.customerName ? { name: metadata.customerName } : {}),
      },
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
      // Without an explicit list Korapay only offers the card channel, whose
      // per-transaction limit is low (error AA021). bank_transfer lifts the ceiling.
      channels: ['card', 'bank_transfer'],
      // Server-to-server confirmation — keeps orders in sync even if the shopper
      // never returns to the redirect page.
      notification_url: process.env.KORAPAY_WEBHOOK_URL,
      redirect_url: options.callbackUrl || defaultRedirectUrl(),
    };

    const response = await initializeCharge(payload);

    if (response.data.status) {
      return {
        authorizationUrl: response.data.data.checkout_url,
        accessCode: null, // Korapay has no access-code concept; kept for shape parity
        reference: response.data.data.reference || reference,
        amount,
      };
    }
    throw new ValidationError(response.data.message || 'Failed to initialize payment');
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    console.error('Korapay initialize error:', error.response?.data || error.message);

    // AA021 — amount outside the merchant account's per-transaction channel
    // limits. Korapay's raw message confuses shoppers; translate it.
    const kpErr = error.response?.data;
    if (kpErr?.code === 'AA021') {
      const limits = String(kpErr.message || '').match(/NGN\s?([\d,]+)/gi) || [];
      const maxLimit = limits
        .map((s) => Number(s.replace(/\D/g, '')))
        .filter((n) => n > 100)
        .sort((a, b) => b - a)[0];
      const limitText = maxLimit
        ? `₦${maxLimit.toLocaleString()} per transaction`
        : 'the per-transaction limit';
      throw new ValidationError(
        `This total (₦${Math.round(amount).toLocaleString()}) is above ${limitText} for online card/bank payments. ` +
        `Please split the payment into smaller amounts or contact support to complete this order.`
      );
    }

    throw new ValidationError(kpErr?.message || error.message || 'Failed to initialize Korapay payment');
  }
};

/**
 * Verify a Korapay charge by merchant reference.
 * @returns success/status/data — `status` is 'paid' when the charge succeeded.
 */
const verifyKorapayCharge = async (reference) => {
  try {
    if (!reference) throw new ValidationError('Payment reference is required');

    const response = await requestWithRetry({
      method: 'get',
      url: `${KORAPAY_BASE_URL}/charges/${encodeURIComponent(reference)}`,
    });

    if (response.data.status) {
      const { data } = response.data;

      if (isChargePaid(data)) {
        return {
          success: true,
          status: 'paid',
          data: {
            reference: data.reference,
            transactionId: data.payment_reference || data.reference,
            // Korapay amounts are already in major units (naira)
            amount: Number(data.amount_paid ?? data.amount),
            currency: data.currency,
            paidAt: data.transaction_date || data.completed_at || new Date().toISOString(),
            channel: data.payment_method || data.channel,
            metadata: data.metadata,
          },
        };
      }
      return { success: false, status: 'failed', message: `Payment ${data.status}` };
    }
    throw new ValidationError(response.data.message || 'Verification failed');
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    console.error('Korapay verify error:', error.response?.data || error.message);
    throw new ValidationError(error.response?.data?.message || error.message || 'Failed to verify payment');
  }
};

/**
 * Gateway-generic entry points. Callers (checkout, wallet funding, gift cards)
 * use these so the active gateway is a single-env-var switch (PAYMENT_GATEWAY).
 * Only Korapay is wired; any other value falls back to Korapay with a warning.
 */
const createGatewayTransaction = (amount, email, metadata, options) => {
  if (ACTIVE_GATEWAY !== 'korapay') {
    console.warn(`PAYMENT_GATEWAY='${ACTIVE_GATEWAY}' is not implemented; using Korapay.`);
  }
  return createKorapayCharge(amount, email, metadata, options);
};

const verifyGatewayTransaction = (reference) => verifyKorapayCharge(reference);

/**
 * Mark an order paid after a verified payment, mapped to Kentaz's Order schema.
 * @param {string} orderId
 * @param {object} paymentData Result of verifyGatewayTransaction().data
 */
const attachPaymentToOrder = async (orderId, paymentData = {}) => {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  order.korapayStatus = 'success';
  order.status = 'processing'; // Kentaz's "paid" state; enum has no 'confirmed'
  if (paymentData.reference) order.korapayRef = paymentData.reference;

  await order.save();
  return order;
};

/**
 * Read-only payment status for an order, using Kentaz's Order fields.
 */
const getPaymentStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  return {
    orderId: order._id,
    status: order.status,
    korapayStatus: order.korapayStatus,
    korapayRef: order.korapayRef,
    total: order.total,
  };
};

module.exports = {
  createKorapayCharge,
  verifyKorapayCharge,
  createGatewayTransaction,
  verifyGatewayTransaction,
  attachPaymentToOrder,
  getPaymentStatus,
  ACTIVE_GATEWAY,
};
