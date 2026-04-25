'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus, ShoppingBag, Lock, Tag, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCart, updateQuantity } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface DiscountValidation {
  valid: boolean;
  discountAmount: number;
  discount: {
    code: string;
    type: string;
    value: number;
    description: string;
  };
}

export default function CartPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, total } = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const [discountCode, setDiscountCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountValidation['discount'] | null>(null);

  const getPrice = (product: any) => {
    if (!product) return 0;
    if (product.variants?.[0]?.price) return product.variants[0].price;
    if (product.price) return typeof product.price === 'number' ? product.price : product.price.amount || 0;
    return 0;
  };

  const subtotal = items.reduce((sum, item) => sum + getPrice(item.product) * item.quantity, 0);
  const discountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? Math.min((subtotal * appliedDiscount.value) / 100, 50000) // example cap
      : appliedDiscount.value
    : 0;
  const shipping = subtotal - discountAmount >= 25000 ? 0 : 2500;
  const tax = (subtotal - discountAmount) * 0.075;
  const finalTotal = subtotal - discountAmount + shipping + tax;

  const validateDiscount = async () => {
    if (!discountCode.trim()) return;
    setValidating(true);
    setDiscountError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, cartTotal: subtotal }),
      });
      const data = await res.json();
      
      if (data.valid) {
        setAppliedDiscount(data.discount);
      } else {
        setDiscountError(data.error || 'Invalid discount code');
      }
    } catch (err) {
      setDiscountError('Failed to validate code');
    } finally {
      setValidating(false);
    }
  };

  const removeDiscountCode = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link href="/products">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <Card key={product._id} className="p-4">
              <div className="flex gap-4">
                <Link href={`/products/${product.slug}`}>
                  <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={product.images?.[0]?.url || '/placeholder.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium line-clamp-1 hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="font-semibold mt-1">{formatPrice(getPrice(product))}</p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => dispatch(removeFromCart({ productId: product._id || product.id || '' }))}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-center border border-border rounded-lg">
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: product._id || product.id || '', quantity: Math.max(1, quantity - 1) }))}
                      className="p-2 hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: product._id || product.id || '', quantity: quantity + 1 }))}
                      className="p-2 hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {/* Discount input - always visible */}
              <div className="space-y-2">
                {!appliedDiscount ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="Gift card or promo code"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={validateDiscount}
                      disabled={validating || !discountCode.trim()}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{appliedDiscount.code}</span>
                    </div>
                    <button onClick={removeDiscountCode} className="text-green-600 hover:text-green-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {discountError && (
                  <p className="text-xs text-destructive">{discountError}</p>
                )}
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>

            <div className="border-t border-border my-4 pt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {isAuthenticated ? (
              <Link href="/checkout">
                <Button className="w-full" size="lg">
                  <Lock className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Button>
              </Link>
            ) : (
              <Button className="w-full" size="lg" variant="outline" onClick={() => router.push('/login?redirect=/cart')}>
                <Lock className="h-4 w-4 mr-2" />
                Login to Checkout
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground mt-4">
              Secure checkout powered by Paystack
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
