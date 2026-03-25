'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus, ShoppingBag, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCart, updateQuantity } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const { data: session, status } = useSession();
  const { items, total } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();

  const getPrice = (product: any) => {
    if (!product) return 0;
    if (product.variants?.[0]?.price) return product.variants[0].price;
    return 0;
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
                    onClick={() => dispatch(removeFromCart({ productId: product._id }))}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-center border border-border rounded-lg">
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: product._id, quantity: Math.max(1, quantity - 1) }))}
                      className="p-2 hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: product._id, quantity: quantity + 1 }))}
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
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{total >= 25000 ? 'Free' : formatPrice(2500)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(total * 0.075)}</span>
              </div>
            </div>

            <div className="border-t border-border my-4 pt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatPrice(total + (total >= 25000 ? 0 : 2500) + total * 0.075)}</span>
              </div>
            </div>

            {status === 'loading' ? (
              <Button className="w-full" size="lg" disabled>
                Loading...
              </Button>
            ) : session ? (
              <Link href="/checkout">
                <Button className="w-full" size="lg">
                  <Lock className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Button>
              </Link>
            ) : (
              <Link href="/login?callbackUrl=/cart">
                <Button className="w-full" size="lg" variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  Login to Checkout
                </Button>
              </Link>
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
