'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SafeImage from '@/components/ui/SafeImage';
import { CreditCard, Lock, ArrowLeft, Check, ChevronRight, Truck, ShoppingBag, User, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearCart } from '@/store/cartSlice';
import { setUser } from '@/store/userSlice';
import { formatPrice } from '@/lib/utils';
import { usePaystack, useShippingInfo, getDeliveryCost, calculateTotals } from '@/lib/paystack';

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

export default function CheckoutPage() {
  const userState = useAppSelector((state) => state.user);
  const { isAuthenticated, user } = userState;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, total } = useAppSelector((state) => state.cart);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paystackRef, setPaystackRef] = useState('');
  
  const { initializePayment, verifyPayment, isLoading: paystackLoading, error: paystackError, isReady: paystackReady } = usePaystack();
  const { shippingInfo, updateShippingInfo, isValid: isShippingValid } = useShippingInfo();

  // Restore user session from token on mount
  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    if (token && !user) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data._id) {
            dispatch(setUser(data));
          }
        })
        .catch(() => {
          localStorage.removeItem('kentaz_token');
        });
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?callbackUrl=/checkout');
    }
    if (user) {
      updateShippingInfo('email', user.email || '');
      updateShippingInfo('firstName', user.name?.split(' ')[0] || '');
      updateShippingInfo('lastName', user.name?.split(' ').slice(1).join(' ') || '');
    }
  }, [isAuthenticated, user, router]);

  const deliveryCost = getDeliveryCost(shippingInfo.deliveryMethod, total);
  const subtotal = total;
  const { tax, total: grandTotal } = calculateTotals(subtotal, deliveryCost);

  const getPrice = (product: any) => {
    if (!product?.price) return 0;
    if (typeof product.price === 'object') return product.price.amount;
    return product.price;
  };

  const handleContinueToPayment = () => {
    if (isShippingValid) {
      setCurrentStep('payment');
    }
  };

  const handlePlaceOrder = async () => {
    if (!paystackReady) return;
    setLoading(true);

    initializePayment({
      email: shippingInfo.email,
      amount: grandTotal,
      firstName: shippingInfo.firstName,
      lastName: shippingInfo.lastName,
      phone: shippingInfo.phone,
      onSuccess: async (reference) => {
        try {
          const token = localStorage.getItem('kentaz_token');
          const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              items: items.map(item => ({
                product: item.product._id,
                name: item.product.name,
                price: item.variant?.price || item.product.price,
                quantity: item.quantity,
                variant: item.variant
              })),
              shippingAddress: shippingInfo,
              total: grandTotal,
              paystackRef: reference.reference
            })
          });
          
          if (orderResponse.ok) {
            setPaystackRef(reference.reference);
            const newOrderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
            setOrderNumber(newOrderNumber);
            dispatch(clearCart());
            setLoading(false);
            setCurrentStep('confirmation');
          } else {
            throw new Error('Failed to create order');
          }
        } catch (error) {
          console.error('Error creating order:', error);
          alert('Failed to create order. Please contact support.');
          setLoading(false);
        }
      },
      onClose: () => {
        setLoading(false);
      },
    });
  };

  if (items.length === 0 && currentStep !== 'confirmation') {
    router.push('/cart');
    return null;
  }

  // Check if we're still initializing user state
  const token = localStorage.getItem('kentaz_token');
  if (token && !user) {
    // Token exists but user state hasn't loaded yet
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-500 mb-6">You must be logged in to complete your purchase</p>
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => router.push('/login?callbackUrl=/checkout')}
              >
                Log In to Continue
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/cart')}
              >
                Return to Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'confirmation', label: 'Confirmation', icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      {currentStep !== 'confirmation' && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`
                      flex items-center gap-2 px-4 py-2 rounded-full transition-all
                      ${isActive ? 'bg-gray-900 text-white' : isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                    `}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-gray-300 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentStep === 'shipping' && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100 pb-6">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-500" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                    <Input
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                      placeholder="+234 xxx xxx xxxx"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      name="firstName"
                      value={shippingInfo.firstName}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                    />
                    <Input
                      label="Last Name"
                      name="lastName"
                      value={shippingInfo.lastName}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Delivery Address"
                    name="address"
                    value={shippingInfo.address}
                    onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                    required
                    placeholder="123 Main Street, Apt 4B"
                  />

                  <div className="grid sm:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      name="city"
                      value={shippingInfo.city}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                      placeholder="Lagos"
                    />
                    <Input
                      label="State"
                      name="state"
                      value={shippingInfo.state}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                      placeholder="Lagos"
                    />
                    <Input
                      label="Postal Code"
                      name="postalCode"
                      value={shippingInfo.postalCode}
                      onChange={(e) => updateShippingInfo(e.target.name, e.target.value)}
                      required
                      placeholder="100001"
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Delivery Method</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <label
                        className={`
                          relative flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                          ${shippingInfo.deliveryMethod === 'standard' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
                        `}
                      >
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="standard"
                          checked={shippingInfo.deliveryMethod === 'standard'}
                          onChange={() => updateShippingInfo('deliveryMethod', 'standard')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">Standard Delivery</span>
                            <span className="font-semibold text-gray-900">
                              {total >= 50000 ? 'Free' : '₦2,500'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">3-5 business days</p>
                        </div>
                      </label>

                      <label
                        className={`
                          relative flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                          ${shippingInfo.deliveryMethod === 'express' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
                        `}
                      >
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="express"
                          checked={shippingInfo.deliveryMethod === 'express'}
                          onChange={() => updateShippingInfo('deliveryMethod', 'express')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">Express Delivery</span>
                            <span className="font-semibold text-gray-900">₦5,000</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">1-2 business days</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button size="lg" onClick={handleContinueToPayment} className="px-8">
                      Continue to Payment
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'payment' && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100 pb-6">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <Lock className="h-6 w-6 opacity-60" />
                      <span className="text-sm font-medium opacity-80">Powered by Paystack</span>
                    </div>
                    <div className="text-center py-8">
                      <p className="text-lg opacity-80 mb-2">Total Amount</p>
                      <p className="text-4xl font-bold">{formatPrice(grandTotal)}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Secure Payment</p>
                      <p className="text-sm text-amber-700">You'll be redirected to Paystack's secure payment page to complete your order</p>
                    </div>
                  </div>

                  {paystackError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Payment Error</p>
                        <p className="text-sm text-red-700">{paystackError}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 border-t border-gray-100 pt-6">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Shipping to</p>
                        <p className="text-sm text-gray-500">
                          {shippingInfo.firstName} {shippingInfo.lastName}<br />
                          {shippingInfo.address}<br />
                          {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postalCode}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Delivery Method</p>
                        <p className="text-sm text-gray-500">
                          {shippingInfo.deliveryMethod === 'express' ? 'Express Delivery (1-2 days)' : 'Standard Delivery (3-5 days)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" size="lg" onClick={() => setCurrentStep('shipping')}>
                      Back to Shipping
                    </Button>
                    <Button 
                      size="lg" 
                      onClick={handlePlaceOrder} 
                      loading={loading || paystackLoading} 
                      disabled={!paystackReady || !isShippingValid}
                      className="px-8"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Pay {formatPrice(grandTotal)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'confirmation' && (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
                  <p className="text-gray-500 mb-6">Thank you for your purchase</p>
                  
                  <div className="bg-gray-50 rounded-xl p-6 mb-8 max-w-md mx-auto">
                    <p className="text-sm text-gray-500 mb-1">Order Number</p>
                    <p className="text-xl font-mono font-bold text-gray-900 mb-4">{orderNumber}</p>
                    {paystackRef && (
                      <>
                        <p className="text-sm text-gray-500 mb-1">Payment Reference</p>
                        <p className="text-sm font-mono text-gray-700">{paystackRef}</p>
                      </>
                    )}
                  </div>

                  <div className="space-y-4 text-left max-w-md mx-auto mb-8">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Shipping to</p>
                        <p className="text-sm text-gray-500">
                          {shippingInfo.firstName} {shippingInfo.lastName}<br />
                          {shippingInfo.address}<br />
                          {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postalCode}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Estimated Delivery</p>
                        <p className="text-sm text-gray-500">
                          {shippingInfo.deliveryMethod === 'express' ? '1-2 business days' : '3-5 business days'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => router.push('/account/orders')}>
                      View Orders
                    </Button>
                    <Button onClick={() => router.push('/products')}>
                      Continue Shopping
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          {currentStep !== 'confirmation' && (
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg sticky top-24">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-gray-500" />
                    Order Summary
                    <span className="text-sm font-normal text-gray-500">({items.length} items)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {items.map(({ product, quantity, variant }) => (
                      <div key={product._id} className="flex gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url && (
                            <SafeImage
                              src={product.images[0].url}
                              alt={product.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                          {variant && (variant.size || variant.color) && (
                            <p className="text-xs text-gray-500">
                              {[variant.size, variant.color].filter(Boolean).join(' / ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">Qty: {quantity}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatPrice(getPrice(product) * quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery</span>
                      <span className="font-medium text-gray-900">
                        {deliveryCost === 0 ? 'Free' : formatPrice(deliveryCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax (7.5%)</span>
                      <span className="font-medium text-gray-900">{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-xl text-gray-900">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-500">
                    <Lock className="h-3 w-3" />
                    <span>Secure checkout powered by Paystack</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
