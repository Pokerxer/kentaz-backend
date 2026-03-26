'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check, ShoppingBag, Heart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/wishlistSlice';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  images?: { url: string }[];
  variants?: { size?: string; color?: string; price: number; stock?: number }[];
  category?: string;
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const dispatch = useAppDispatch();
  const wishlistItems = useAppSelector((state) => state.wishlist.items);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const isInWishlist = product ? wishlistItems.some(item => item._id === product._id) : false;

  if (!product) return null;

  const images = product.images?.map(img => img.url) || [product.thumbnail || '/placeholder.jpg'];
  const variants = product.variants || [];
  const currentVariant = variants[selectedVariant];
  const price = currentVariant?.price || 0;
  const isOutOfStock = !currentVariant?.stock || currentVariant.stock <= 0;

  const handleAddToCart = () => {
    dispatch(addToCart({
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail,
        images: product.images,
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
      setAddedToCart(false);
      setQuantity(1);
    }, 2000);
  };

  const handleWishlist = () => {
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
    } else {
      dispatch(addToWishlist({ 
        _id: product._id, 
        name: product.name, 
        slug: product.slug, 
        thumbnail: product.thumbnail,
        price: price,
      }));
    }
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
            <div className="grid md:grid-cols-2 gap-0">
              {/* Images */}
              <div className="relative aspect-[3/4] bg-gray-100">
                <Image
                  src={images[selectedImage] || '/placeholder.jpg'}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          selectedImage === idx ? 'bg-[#C9A84C] w-6' : 'bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-6 flex flex-col">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>

                <span className="text-sm text-[#C9A84C] font-medium mb-2">{product.category}</span>
                <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                <p className="text-3xl font-bold text-[#C9A84C] mb-4">{formatPrice(price)}</p>
                
                {product.description && (
                  <p className="text-gray-600 text-sm mb-6 line-clamp-3">{product.description}</p>
                )}

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

                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                  <Button
                    onClick={handleAddToCart}
                    className="flex-1 py-4"
                    disabled={addedToCart || isOutOfStock}
                  >
                    {addedToCart ? (
                      <span className="flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        Added
                      </span>
                    ) : isOutOfStock ? (
                      'Out of Stock'
                    ) : (
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Add to Cart
                      </span>
                    )}
                  </Button>
                  <button
                    onClick={handleWishlist}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                      isInWishlist
                        ? 'border-red-500 bg-red-50 text-red-500'
                        : 'border-gray-200 hover:border-red-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}