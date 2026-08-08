'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';

interface KorapayConfig {
  email: string;
  amount: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  reference?: string;
  onSuccess: (reference: KorapayReference) => void;
  onClose: () => void;
}

export interface KorapayReference {
  reference: string;
  status: string;
  amount: number;
  currency: string;
}

declare global {
  interface Window {
    Korapay?: {
      initialize: (config: any) => void;
      close?: () => void;
    };
  }
}

// Korapay caps every channel enabled on this merchant account at ₦200,000 per
// transaction — card, bank transfer and pay-with-bank alike. Above it the
// gateway rejects the charge (AA021) and the modal simply dies, so we check
// before opening it and say something the shopper can act on. Raising the
// ceiling is a Korapay support request; this env var tracks it when it moves.
export const MAX_ONLINE_PAYMENT_NGN = Number(
  process.env.NEXT_PUBLIC_MAX_ONLINE_PAYMENT_NGN || 200000
);

const formatNaira = (value: number) => `₦${Math.round(value).toLocaleString()}`;

/**
 * Why this amount can't be charged online, or null if it can.
 * Exported so checkout and booking give the identical explanation.
 */
export function paymentAmountError(amount: number): string | null {
  if (!Number.isFinite(amount) || amount < 100) {
    return 'The minimum online payment is ₦100.';
  }
  if (amount > MAX_ONLINE_PAYMENT_NGN) {
    return (
      `Online payments are limited to ${formatNaira(MAX_ONLINE_PAYMENT_NGN)} per transaction, ` +
      `and this total is ${formatNaira(amount)}. Please place the order in smaller parts, ` +
      `or contact us and we'll complete it for you.`
    );
  }
  return null;
}

export function useKorapay() {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement('script');
    script.src = 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
      setIsReady(true);
    };
    script.onerror = () => {
      setError('Failed to load Korapay payment gateway');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Returns true when the Korapay modal was actually opened. Callers own a
  // loading spinner, so they need to know when it never opened — otherwise a
  // rejected amount leaves the Pay button spinning forever.
  const initializePayment = useCallback((config: Omit<KorapayConfig, 'reference'>): boolean => {
    setError(null);

    if (!window.Korapay) {
      setError('Korapay is not loaded. Please check your connection.');
      return false;
    }

    if (!config.email) {
      setError('An email address is required to take payment.');
      return false;
    }

    // Check the gateway's own limits before opening the modal — otherwise a
    // large cart just gets a modal that closes itself with no explanation.
    const amountError = paymentAmountError(config.amount);
    if (amountError) {
      setError(amountError);
      return false;
    }

    const publicKey = process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY;
    if (!publicKey || publicKey === 'pk_test_your_test_key_here') {
      setError('Payments are temporarily unavailable. Please contact us to complete your order.');
      console.error('NEXT_PUBLIC_KORAPAY_PUBLIC_KEY is missing or is the placeholder value.');
      return false;
    }

    const reference = `KENTAZ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setIsLoading(true);

    // Korapay uses naira (not kobo), so no *100 conversion
    const amountInNaira = Math.round(config.amount);

    try {
      window.Korapay.initialize({
        key: publicKey,
        reference,
        amount: amountInNaira,
        currency: 'NGN',
        customer: {
          name: `${config.firstName || ''} ${config.lastName || ''}`.trim() || 'Customer',
          email: config.email,
        },
        onClose: () => {
          setIsLoading(false);
          config.onClose();
        },
        onSuccess: (response: { reference: string; status: string; amount: string }) => {
          setIsLoading(false);
          config.onSuccess({
            reference: response.reference || reference,
            status: response.status || 'success',
            amount: config.amount,
            currency: 'NGN',
          });
        },
        onFailed: (response?: { message?: string; status?: string }) => {
          setIsLoading(false);
          // Show the gateway's own reason when it gives one — "Payment failed,
          // try again" sends people round the same loop forever.
          setError(response?.message || 'Payment failed. Please try again or use a different card.');
        },
      });
      return true;
    } catch (err) {
      setIsLoading(false);
      setError('Failed to initialize payment. Please try again.');
      return false;
    }
  }, []);

  const verifyPayment = async (reference: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kentaz_token')}`
        },
        body: JSON.stringify({ reference }),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  };

  return {
    initializePayment,
    verifyPayment,
    isLoading,
    error,
    isReady,
  };
}

export function useShippingInfo() {
  const [shippingInfo, setShippingInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    deliveryMethod: 'standard' as 'standard' | 'express',
  });

  const updateShippingInfo = (field: string, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }));
  };

  const isValid = Object.values(shippingInfo).every(val => val !== '');

  return { shippingInfo, updateShippingInfo, isValid };
}

export function getDeliveryCost(deliveryMethod: 'standard' | 'express', subtotal: number): number {
  if (deliveryMethod === 'express') return 5000;
  return subtotal >= 50000 ? 0 : 2500;
}

export function calculateTotals(subtotal: number, deliveryCost: number) {
  const tax = subtotal * 0.075;
  const total = subtotal + deliveryCost + tax;
  return { tax, total };
}
