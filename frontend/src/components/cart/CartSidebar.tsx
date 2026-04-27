'use client';

import { useEffect, useState } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight, Sparkles, Truck, Shield, Lock, Loader2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeFromCart, updateQuantity } from '@/store/cartSlice';
import { setUser } from '@/store/userSlice';
import { formatPrice } from '@/lib/utils';

const COLOR_MAP: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  blue: '#1E40AF',
  navy: '#1E3A8A',
  red: '#DC2626',
  tan: '#D2B48C',
  cognac: '#9A6324',
  burgundy: '#722F37',
  nude: '#E3BC9A',
  brown: '#8B4513',
  pink: '#EC4899',
  green: '#059669',
  yellow: '#FACC15',
  purple: '#7C3AED',
  gray: '#6B7280',
  grey: '#6B7280',
  silver: '#C0C0C0',
  gold: '#FFD700',
  cream: '#FFFDD0',
  beige: '#F5F5DC',
  orange: '#F97316',
  emerald: '#10B981',
};

export function CartSidebar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, total } = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Restore user session from token on mount
  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    if (token) {
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
  }, [dispatch]);

  // Listen for custom event to open cart
  useEffect(() => {
    if (!isMounted) return;
    
    const handleOpenCart = () => setIsOpen(true);
    window.addEventListener('open-cart', handleOpenCart);
    
    return () => window.removeEventListener('open-cart', handleOpenCart);
  }, [isMounted]);

  useEffect(() => {
    if (isMounted) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMounted, isOpen]);

  if (!isMounted) return null;

  const getPriceAmount = (price: number | { amount: number } | undefined): number => {
    if (!price) return 0;
    if (typeof price === 'object') return price.amount;
    return price;
  };

  const getColorHex = (colorName: string): string => {
    const key = colorName.toLowerCase().replace(/\s+/g, '');
    return COLOR_MAP[key] || '#9CA3AF';
  };

  const handleRemove = (productId: string, variant?: { size?: string; color?: string }) => {
    const id = `${productId}-${variant?.size || ''}-${variant?.color || ''}`;
    setRemovingId(id);
    setTimeout(() => {
      dispatch(removeFromCart({ productId, variant }));
      setRemovingId(null);
    }, 300);
  };

  const subtotal = total;
  const shipping = subtotal >= 50000 ? 0 : 2500;
  const finalTotal = subtotal + shipping;

  const handleCheckout = () => {
    if (isAuthenticated) {
      setIsOpen(false);
      router.push('/checkout');
    } else {
      setIsOpen(false);
      router.push('/login?callbackUrl=/checkout');
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
          >
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="h-6 w-6 text-gray-900" />
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </motion.button>
            </motion.div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6"
                  >
                    <ShoppingBag className="h-16 w-16 text-gray-400" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-gray-900 mb-2"
                  >
                    Your cart is empty
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-500 mb-8 max-w-xs"
                  >
                    Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Link
                      href="/products"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all hover:shadow-lg"
                    >
                      Start Shopping
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 space-y-4"
                >
                  <AnimatePresence>
                    {items.map((item, index) => {
                      const itemPrice = item.variant?.price || item.product.price || 0;
                      const itemTotal = itemPrice * item.quantity;
                      const id = `${item.product._id}-${item.variant?.size || ''}-${item.variant?.color || ''}-${index}`;
                      const isRemoving = removingId === id;
                      
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: isRemoving ? 0 : 1, x: isRemoving ? -50 : 0, height: isRemoving ? 0 : 'auto' }}
                          exit={{ opacity: 0, x: -50, height: 0 }}
                          transition={{ duration: 0.3 }}
                          layout
                          className={`flex gap-4 p-4 bg-gradient-to-r from-white to-gray-50 rounded-2xl border border-gray-100 ${isRemoving ? 'mb-[-16px]' : ''}`}
                        >
                          <Link
                            href={`/products/${item.product.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="relative w-24 h-28 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-sm group"
                          >
                            <SafeImage
                              src={item.product.images?.[0]?.url || item.product.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                              alt={item.product.name || 'Product image'}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </Link>
                          
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <Link
                                href={`/products/${item.product.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-gray-600 transition-colors"
                              >
                                {item.product.name}
                              </Link>
                              
                              {(item.variant?.size || item.variant?.color) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="flex flex-wrap gap-x-3 gap-y-1 mt-2"
                                >
                                  {item.variant?.size && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {item.variant.size}
                                    </span>
                                  )}
                                  {item.variant?.color && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {item.variant.color}
                                    </span>
                                  )}
                                </motion.div>
                              )}
                            </div>
                            
                            <div className="flex items-end justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex items-center bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm"
                                >
                                  <motion.button
                                    whileHover={{ backgroundColor: '#f3f4f6' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => dispatch(updateQuantity({ productId: item.product._id, quantity: item.quantity - 1, variant: item.variant }))}
                                    className="p-2 transition-colors"
                                  >
                                    <Minus className="h-4 w-4 text-gray-600" />
                                  </motion.button>
                                  <motion.span
                                    key={item.quantity}
                                    initial={{ scale: 1.3 }}
                                    animate={{ scale: 1 }}
                                    className="w-10 text-center font-bold text-gray-900"
                                  >
                                    {item.quantity}
                                  </motion.span>
                                  <motion.button
                                    whileHover={{ backgroundColor: '#f3f4f6' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => dispatch(updateQuantity({ productId: item.product._id, quantity: item.quantity + 1, variant: item.variant }))}
                                    className="p-2 transition-colors"
                                  >
                                    <Plus className="h-4 w-4 text-gray-600" />
                                  </motion.button>
                                </motion.div>
                                
                                <motion.button
                                  whileHover={{ scale: 1.1, color: '#ef4444' }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleRemove(item.product._id, item.variant)}
                                  className="p-2 text-gray-400 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </div>
                              
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-right"
                              >
                                <p className="text-sm font-bold text-gray-900">{formatPrice(itemTotal)}</p>
                                {item.quantity > 1 && (
                                  <p className="text-xs text-gray-500">{formatPrice(itemPrice)} each</p>
                                )}
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-100 bg-white"
              >
                {subtotal < 50000 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-800">Almost there!</p>
                        <p className="text-xs text-green-600">Add {formatPrice(50000 - subtotal)} more for free shipping</p>
                      </div>
                      <div className="w-full max-w-[100px] h-2 bg-green-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((subtotal / 50000) * 100, 100)}%` }}
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                      <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className={`font-semibold ${shipping === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {shipping === 0 ? 'Free' : formatPrice(shipping)}
                      </span>
                    </div>
                    {shipping > 0 && (
                      <p className="text-xs text-gray-500">Free shipping on orders over ₦50,000</p>
                    )}
                    <div className="h-px bg-gray-200 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <motion.span
                        key={finalTotal}
                        initial={{ scale: 1.2, color: '#059669' }}
                        animate={{ scale: 1, color: '#111827' }}
                        className="text-2xl font-bold text-gray-900"
                      >
                        {formatPrice(finalTotal)}
                      </motion.span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: status === 'loading' ? 1 : 1.02, boxShadow: status === 'loading' ? 'none' : '0 10px 40px -10px rgba(0,0,0,0.2)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCheckout}
                      className="w-full py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAuthenticated ? (
                        <>
                          <Lock className="h-5 w-5" />
                          <span>Proceed to Checkout</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5" />
                          <span>Login to Checkout</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsOpen(false)}
                      className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      Continue Shopping
                    </motion.button>
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Truck className="h-4 w-4" />
                      <span>Free returns</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Shield className="h-4 w-4" />
                      <span>Secure checkout</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export a function to open the cart from anywhere
export const openCart = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-cart'));
  }
};
