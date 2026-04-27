'use client';

import { useState, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart, Check, Star, Truck, Shield, RotateCcw, ArrowRight } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { addToCart } from '@/store/cartSlice';
import { VariantPicker, findVariant, autoSelectVariant } from '@/components/shop/VariantPicker';

interface ProductVariant {
  id?: string;
  title?: string;
  size?: string;
  color?: string;
  price: number;
  stock?: number;
  inventory_quantity?: number;
  prices?: { amount: number }[];
  options?: Record<string, string>;
}

interface Product {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  slug?: string;
  handle?: string;
  description?: string;
  thumbnail?: string;
  images?: { url: string }[];
  variants?: ProductVariant[];
  options?: { name: string; values: string[] }[];
  category?: string;
  tags?: string[];
  ratings?: { avg: number; count: number };
  price?: { amount: number };
}

const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', blue: '#1E40AF', navy: '#1E3A8A',
  red: '#DC2626', tan: '#D2B48C', cognac: '#9A6324', burgundy: '#722F37',
  nude: '#E3BC9A', brown: '#8B4513', pink: '#EC4899', green: '#059669',
  yellow: '#FACC15', purple: '#7C3AED', gray: '#6B7280', grey: '#6B7280',
  silver: '#C0C0C0', gold: '#FFD700', cream: '#FFFDD0', beige: '#F5F5DC',
  orange: '#F97316', emerald: '#10B981', 'natural black': '#1a1a1a',
};

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const dispatch = useAppDispatch();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      setSelectedImage(0);
      setQuantity(1);
      setAddedToCart(false);
      const { size, color } = autoSelectVariant(product.variants || []);
      setSelectedSize(size);
      setSelectedColor(color);
    }
  }, [product]);

  if (!product) return null;

  const images: string[] = [];
  if (product.thumbnail) images.push(product.thumbnail);
  if (product.images) {
    product.images.forEach((img) => {
      if (!images.includes(img.url)) images.push(img.url);
    });
  }
  if (images.length === 0) images.push('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600');
  while (images.length < 4) images.push(images[0]);

  const selectedVariant = findVariant(product.variants || [], selectedSize, selectedColor) ?? product.variants?.[0];
  const price = selectedVariant?.price || product.variants?.[0]?.price || 0;
  const inventory = selectedVariant?.stock || product.variants?.[0]?.stock || 0;
  const isOutOfStock = inventory === 0;
  const rating = product.ratings?.avg || 4.5;
  const reviewCount = product.ratings?.count || 0;
  const isBestseller = product.tags?.includes('bestseller');
  const isFeatured = product.tags?.includes('featured');

  const formatPrice = (amount: number) => '₦' + amount.toLocaleString('en-NG');

  const getColorHex = (colorName: string): string => {
    const key = colorName.toLowerCase().replace(/\s+/g, '');
    return COLOR_MAP[key] || '#9CA3AF';
  };

  const isLightColor = (colorName: string): boolean => {
    return ['white', 'cream', 'beige', 'nude', 'yellow', 'silver'].some(
      c => colorName.toLowerCase().includes(c)
    );
  };

  const handleAddToCart = () => {
    if (isOutOfStock || !product) return;

    dispatch(addToCart({
      product: {
        _id: product._id || product.id || '',
        name: product.name || product.title || '',
        slug: product.slug || '',
        thumbnail: product.thumbnail,
        images: product.images,
        price: selectedVariant?.price || 0,
      },
      quantity,
      variant: selectedVariant ? {
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: selectedVariant.price,
      } : undefined,
    }));

    setAddedToCart(true);
    window.dispatchEvent(new CustomEvent('open-cart'));
    setTimeout(() => {
      setAddedToCart(false);
      onClose();
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Quick View</h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 p-4 md:p-6">
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-2xl bg-gray-100 overflow-hidden">
                    <SafeImage
                      src={images[selectedImage]}
                      alt={product.title || product.name || 'Product'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {isFeatured && (
                        <span className="bg-amber-500 text-white px-3 py-1 text-xs font-bold rounded-lg">
                          Featured
                        </span>
                      )}
                      {isBestseller && (
                        <span className="bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-lg">
                          Best Seller
                        </span>
                      )}
                    </div>
                  </div>

                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.slice(0, 4).map((image, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedImage(index)}
                          className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                            selectedImage === index
                              ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <SafeImage
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="mb-4">
                    {product.category && (
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        {product.category}
                      </p>
                    )}
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : i < rating
                                ? 'fill-yellow-400/50 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {rating > 0 ? `${rating} (${reviewCount})` : 'No reviews'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-2xl md:text-3xl font-bold text-gray-900">
                      {formatPrice(price)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-6 line-clamp-3">
                    {product.description}
                  </p>

                  {product.variants && product.variants.length > 1 && (
                    <div className="mb-6">
                      <VariantPicker
                        variants={product.variants}
                        selectedSize={selectedSize}
                        selectedColor={selectedColor}
                        onSizeChange={size => {
                          setSelectedSize(size);
                          if (selectedColor) {
                            const exists = product.variants?.some(v => v.size === size && v.color === selectedColor);
                            if (!exists) setSelectedColor(null);
                          }
                        }}
                        onColorChange={setSelectedColor}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-gray-50 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <motion.span
                        key={quantity}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="w-14 text-center font-bold text-lg"
                      >
                        {quantity}
                      </motion.span>
                      <button
                        onClick={() => setQuantity(Math.min(inventory, quantity + 1))}
                        className="p-3 hover:bg-gray-50 transition-colors"
                        disabled={quantity >= inventory}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className={`text-sm font-medium ${isOutOfStock ? 'text-red-500' : 'text-gray-700'}`}>
                        {isOutOfStock ? 'Out of stock' : `${inventory} in stock`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-6">
                    <motion.button
                      whileHover={!isOutOfStock && !addedToCart ? { scale: 1.02 } : {}}
                      whileTap={!isOutOfStock && !addedToCart ? { scale: 0.98 } : {}}
                      onClick={handleAddToCart}
                      disabled={addedToCart || isOutOfStock}
                      className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-lg ${
                        addedToCart
                          ? 'bg-green-500 text-white'
                          : isOutOfStock
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-xl'
                      }`}
                    >
                      {addedToCart ? (
                        <><Check className="h-6 w-6" /> Added!</>
                      ) : isOutOfStock ? (
                        'Out of Stock'
                      ) : (
                        <><ShoppingCart className="h-6 w-6" /> Add to Cart</>
                      )}
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <Truck className="h-5 w-5 text-gray-700 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Free Ship</p>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <Shield className="h-5 w-5 text-gray-700 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Secure Pay</p>
                    </div>
                    <div className="text-center">
                      <RotateCcw className="h-5 w-5 text-gray-700 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Easy Returns</p>
                    </div>
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 mt-4 py-3 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    View full details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
