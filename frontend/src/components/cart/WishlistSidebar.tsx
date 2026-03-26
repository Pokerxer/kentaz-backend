'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingBag, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeFromWishlist } from '@/store/wishlistSlice';
import { addToCart } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';

export function WishlistSidebar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items: wishlistItems } = useAppSelector((state) => state.wishlist);
  const { items: cartItems } = useAppSelector((state) => state.cart);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleOpenWishlist = () => setIsOpen(true);
    window.addEventListener('open-wishlist', handleOpenWishlist);
    return () => window.removeEventListener('open-wishlist', handleOpenWishlist);
  }, []);

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      dispatch(removeFromWishlist(id));
      setRemovingId(null);
    }, 300);
  };

  const handleAddToCart = (item: any) => {
    dispatch(addToCart({
      product: {
        _id: item._id,
        name: item.name,
        slug: item.slug,
        thumbnail: item.thumbnail,
        images: item.images,
        price: item.price || 0,
      },
      quantity: 1,
      variant: undefined,
    }));
    dispatch(removeFromWishlist(item._id));
  };

  const isInCart = (id: string) => cartItems.some((cartItem) => cartItem.product._id === id);

  if (!isMounted) return null;

  return (
    <>
      {/* Wishlist Button in Navbar */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Heart className="h-5 w-5" />
        {wishlistItems.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {wishlistItems.length}
          </span>
        )}
      </button>

      {/* Wishlist Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-semibold">My Wishlist</h2>
                  <span className="text-sm text-gray-500">({wishlistItems.length})</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {wishlistItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Heart className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">Your wishlist is empty</p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-[#C9A84C] hover:underline"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wishlistItems.map((item) => (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={`flex gap-4 p-3 bg-gray-50 rounded-xl ${removingId === item._id ? 'opacity-50' : ''}`}
                      >
                        {/* Image */}
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="relative w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white"
                        >
                          <Image
                            src={item.thumbnail || '/placeholder.jpg'}
                            alt={item.name || 'Product'}
                            fill
                            className="object-cover"
                          />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="font-medium text-sm hover:text-[#C9A84C] transition-colors line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          <p className="text-[#C9A84C] font-semibold mt-1">
                            {item.price ? formatPrice(item.price) : 'View for price'}
                          </p>
                          
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={isInCart(item._id)}
                              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                                isInCart(item._id)
                                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                  : 'bg-gray-900 text-white hover:bg-[#C9A84C]'
                              }`}
                            >
                              {isInCart(item._id) ? 'In Cart' : 'Add to Cart'}
                            </button>
                            <button
                              onClick={() => handleRemove(item._id)}
                              className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:border-red-500 hover:text-red-500 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {wishlistItems.length > 0 && (
                <div className="p-4 border-t">
                  <button
                    onClick={() => { setIsOpen(false); router.push('/account?tab=wishlist'); }}
                    className="w-full py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-[#C9A84C] transition-colors flex items-center justify-center gap-2"
                  >
                    View Full Wishlist
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}