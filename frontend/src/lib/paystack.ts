'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearCart } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';

interface PaystackConfig {
  email: string;
  amount: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  reference?: string;
  onSuccess: (reference: PaystackReference) => void;
  onClose: () => void;
}

export interface PaystackReference {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  gateway_response: string;
  channel: string;
  created_at: string;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: any) => { openIframe: () => void };
    };
  }
}

export function usePaystack() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
      setIsReady(true);
    };
    script.onerror = () => {
      setError('Failed to load Paystack payment gateway');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const initializePayment = useCallback((config: Omit<PaystackConfig, 'reference'>) => {
    if (!window.PaystackPop) {
      setError('Paystack is not loaded. Please check your connection.');
      return;
    }

    const reference = `KENTAZ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setIsLoading(true);
    
    // Debug log the config
    console.log('Paystack config:', {
      ...config,
      amount: config.amount * 100,
      reference
    });
    
    try {
      const paystack = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_your_test_key_here',
        email: config.email,
        amount: config.amount * 100,
        firstname: config.firstName,
        lastname: config.lastName,
        phone: config.phone,
        reference,
        currency: 'NGN',
        channels: ['card', 'bank', 'ussd', 'mobile_money'],
        callback: (response: any) => {
          config.onSuccess({
            reference: response.reference,
            status: response.status,
            amount: config.amount,
            currency: 'NGN',
            gateway_response: response.message,
            channel: response.channel,
            created_at: new Date().toISOString(),
          });
        },
        onClose: () => {
          setIsLoading(false);
          config.onClose();
        },
      });

      paystack.openIframe();
    } catch (err) {
      setIsLoading(false);
      setError('Failed to initialize payment. Please try again.');
    }
  }, [items]);

  const verifyPayment = async (reference: string): Promise<boolean> => {
    try {
      console.log('Verifying payment with reference:', reference);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kentaz_token')}`
        },
        body: JSON.stringify({ reference }),
      });
      
      console.log('Verification response status:', response.status);
      const data = await response.json();
      console.log('Verification response data:', data);
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
