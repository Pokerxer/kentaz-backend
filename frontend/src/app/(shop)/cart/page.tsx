'use client';

import { useEffect, useState } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import Link from 'next/link';
import { Trash2, Minus, Plus, ShoppingBag, Lock, Tag, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCart, updateQuantity, setDiscountCode } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';
import { useCartQuote } from '@/lib/cartQuote';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, discountCode } = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.user);

  // What the shopper is typing, kept separate from the code that is actually
  // applied — the applied one lives in Redux so it survives the trip to checkout.
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Every figure below comes from the server. Delivery is chosen at checkout,
  // so the cart quotes standard shipping.
  const { quote, loading } = useCartQuote(items, discountCode ?? null, 'standard');

  // A code the server refused should not linger as "applied".
  useEffect(() => {
    if (quote?.codeError && discountCode) {
      dispatch(setDiscountCode(null));
      setCodeInput(discountCode);
    }
  }, [quote?.codeError, discountCode, dispatch]);

  useEffect(() => {
    if (!loading) setSubmitting(false);
  }, [loading]);

  const applyCode = () => {
    if (!codeInput.trim()) return;
    setSubmitting(true);
    dispatch(setDiscountCode(codeInput));
  };

  const clearCode = () => {
    dispatch(setDiscountCode(null));
    setCodeInput('');
  };

  const appliedDiscount = quote?.discount ?? null;
  const codeError = quote?.codeError ?? null;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven&apos;t added any items to your cart yet.
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
          {items.map(({ product, quantity, variant }, index) => {
            // Line up each cart row with its priced counterpart from the quote.
            const line = quote?.items[index];
            const unitPrice = line?.unitPrice ?? variant?.price ?? product.price ?? 0;
            const wasPrice = line?.originalUnitPrice ?? unitPrice;
            const onSale = wasPrice > unitPrice;
            const productId = product._id || product.id || '';
            const variantKey = [variant?.size, variant?.color].filter(Boolean).join(' / ');

            return (
              <Card key={`${productId}-${variantKey}`} className="p-4">
                <div className="flex gap-4">
                  <Link href={`/products/${product.slug}`}>
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <SafeImage
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
                    {variantKey && (
                      <p className="text-xs text-muted-foreground mt-0.5">{variantKey}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-semibold">{formatPrice(unitPrice)}</p>
                      {onSale && (
                        <>
                          <p className="text-sm text-muted-foreground line-through">
                            {formatPrice(wasPrice)}
                          </p>
                          <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                            -{line?.discountPercent}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => dispatch(removeFromCart({ productId, variant }))}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${product.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center border border-border rounded-lg">
                      <button
                        onClick={() =>
                          dispatch(updateQuantity({ productId, quantity: quantity - 1, variant }))
                        }
                        className="p-2 hover:bg-muted transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                      <button
                        onClick={() =>
                          dispatch(updateQuantity({ productId, quantity: quantity + 1, variant }))
                        }
                        className="p-2 hover:bg-muted transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{quote ? formatPrice(quote.subtotal) : '—'}</span>
              </div>

              {/* Savings already baked into the line prices above. */}
              {quote && quote.itemDiscountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Sale savings</span>
                  <span>-{formatPrice(quote.itemDiscountTotal)}</span>
                </div>
              )}

              <div className="space-y-2">
                {!appliedDiscount ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                        placeholder="Gift card or promo code"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={applyCode}
                      disabled={submitting || !codeInput.trim()}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{appliedDiscount.code}</span>
                    </div>
                    <button
                      onClick={clearCode}
                      className="text-green-600 hover:text-green-800"
                      aria-label="Remove discount code"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {codeError && <p className="text-xs text-destructive">{codeError}</p>}
              </div>

              {quote && quote.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({quote.discount?.code})</span>
                  <span>-{formatPrice(quote.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {!quote ? '—' : quote.shipping === 0 ? 'Free' : formatPrice(quote.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{quote ? formatPrice(quote.tax) : '—'}</span>
              </div>
            </div>

            <div className="border-t border-border my-4 pt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className={loading ? 'opacity-50' : undefined}>
                  {quote ? formatPrice(quote.total) : '—'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Delivery method is chosen at checkout.
              </p>
            </div>

            {isAuthenticated ? (
              <Link href="/checkout">
                <Button className="w-full" size="lg" disabled={!quote}>
                  <Lock className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => router.push('/login?redirect=/cart')}
              >
                <Lock className="h-4 w-4 mr-2" />
                Login to Checkout
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground mt-4">
              Secure checkout powered by Korapay
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
