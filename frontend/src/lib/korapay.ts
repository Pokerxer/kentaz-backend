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

  const initializePayment = useCallback((config: Omit<KorapayConfig, 'reference'>) => {
    if (!window.Korapay) {
      setError('Korapay is not loaded. Please check your connection.');
      return;
    }

    if (!config.email || !config.amount || config.amount < 1) {
      setError('Invalid payment configuration. Amount must be at least ₦1.');
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY;
    if (!publicKey || publicKey === 'pk_test_your_test_key_here') {
      setError('Korapay is not configured. Please check your environment variables.');
      return;
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
        onFailed: () => {
          setIsLoading(false);
          setError('Payment failed. Please try again.');
        },
      });
    } catch (err) {
      setIsLoading(false);
      setError('Failed to initialize payment. Please try again.');
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
