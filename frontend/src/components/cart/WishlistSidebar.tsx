'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingBag, Trash2, ArrowRight, Loader2, Plus, Minus, Check } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeFromWishlist } from '@/store/wishlistSlice';
import { addToCart } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface WishlistItem {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  images?: { url: string }[];
  price?: number;
  variants?: { size?: string; color?: string; price: number; stock?: number }[];
}

interface QuickViewModalProps {
  item: WishlistItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function QuickViewModal({ item, isOpen, onClose }: QuickViewModalProps) {
  const dispatch = useAppDispatch();
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!item) return null;

  const images = item.images?.map(img => img.url) || [item.thumbnail || '/placeholder.jpg'];
  const variants = item.variants || [];
  const currentVariant = variants[selectedVariant];
  const price = currentVariant?.price || item.price || 0;

  const handleAddToCart = () => {
    dispatch(addToCart({
      product: {
        _id: item._id,
        name: item.name,
        slug: item.slug,
        thumbnail: item.thumbnail,
        images: item.images,
        price: price,
      },
      quantity,
      variant: currentVariant ? {
        size: currentVariant.size,
        color: currentVariant.color,
        price: currentVariant.price,
      } : undefined,
    }));
    setAddedToCart(true);
    setTimeout(() => {
      onClose();
      setAddedToCart(false);
      setQuantity(1);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl z-50 overflow-hidden shadow-2xl"
          >
            <div className="grid md:grid-cols-2 gap-6 p-6">
              {/* Images */}
              <div className="space-y-3">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={images[selectedImage] || '/placeholder.jpg'}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`relative w-16 h-20 rounded-lg overflow-hidden ${selectedImage === idx ? 'ring-2 ring-[#C9A84C]' : ''}`}
                      >
                        <Image src={img} alt="" fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-xl font-bold mb-2">{item.name}</h2>
                <p className="text-2xl font-bold text-[#C9A84C] mb-4">{formatPrice(price)}</p>

                {/* Variants */}
                {variants.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {variants.some(v => v.size) && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Size</label>
                        <div className="flex gap-2 flex-wrap">
                          {variants.map((v, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedVariant(idx)}
                              className={`px-4 py-2 border rounded-lg text-sm ${
                                selectedVariant === idx
                                  ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {v.size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {variants.some(v => v.color) && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Color</label>
                        <div className="flex gap-2">
                          {variants.map((v, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedVariant(idx)}
                              className={`w-8 h-8 rounded-full border-2 ${
                                selectedVariant === idx ? 'border-[#C9A84C]' : 'border-gray-200'
                              }`}
                              style={{ backgroundColor: v.color?.toLowerCase() || '#ccc' }}
                              title={v.color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  className="w-full py-4"
                  disabled={addedToCart}
                >
                  {addedToCart ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-5 w-5" />
                      Added to Cart
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      Add to Cart
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function WishlistSidebar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items: wishlistItems } = useAppSelector((state) => state.wishlist);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [quickViewItem, setQuickViewItem] = useState<WishlistItem | null>(null);

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

  const handleQuickView = (item: WishlistItem) => {
    setQuickViewItem(item);
  };

  if (!isMounted) return null;

  return (
    <>
      {/* Wishlist Button in Navbar */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 md:p-3 text-[#2D2D2D] hover:text-[#C9A84C] transition-colors"
      >
        <Heart className="h-5 w-5" />
        {wishlistItems.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#C9A84C] text-white text-[10px] font-bold flex items-center justify-center">
            {wishlistItems.length}
          </span>
        )}
      </button>

      {/* Quick View Modal */}
      <QuickViewModal
        item={quickViewItem}
        isOpen={!!quickViewItem}
        onClose={() => setQuickViewItem(null)}
      />

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
                              onClick={() => handleQuickView(item)}
                              className="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-[#C9A84C] transition-colors"
                            >
                              Add to Cart
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