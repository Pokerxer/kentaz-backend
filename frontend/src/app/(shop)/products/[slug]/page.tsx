'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Heart, ShoppingCart, Truck, Shield, RotateCcw, Check, Star, Share2, ChevronRight, ZoomIn, Eye } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { addToWishlist } from '@/store/wishlistSlice';
import { addToCart } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ProductVariant {
  size?: string;
  color?: string;
  price: number;
  stock?: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  images?: { url: string }[];
  variants: ProductVariant[];
  category?: string;
  tags?: string[];
  ratings?: { avg: number; count: number };
}

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Temu-style variant selection
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Extract unique sizes and colors from variants
  const sizes = product?.variants ? [...new Set(product.variants.map(v => v.size).filter(Boolean))] : [];
  const colorsForSize = selectedSize
    ? product?.variants
        .filter(v => v.size === selectedSize && v.color)
        .map(v => v.color)
        .filter(Boolean) || []
    : [];
  const uniqueColorsForSize = [...new Set(colorsForSize)];

  // All unique colors across all variants
  const allColors = product?.variants
    .map(v => v.color)
    .filter(Boolean) || [];
  const uniqueAllColors = [...new Set(allColors)];

  // Check if a color is available for selected size
  const isColorAvailableForSize = (color: string) => {
    if (!selectedSize) return true;
    const variant = product?.variants.find(v => v.size === selectedSize && v.color === color);
    return variant?.stock && variant.stock > 0;
  };

  // Find the selected variant based on size and color
  const selectedVariant = product?.variants.find(v =>
    v.size === selectedSize && v.color === selectedColor
  ) || product?.variants[0];

  // Auto-select first available size on load
  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedSize) {
      const firstSize = sizes[0];
      setSelectedSize(firstSize || null);
      // Auto-select first available color for this size
      const colorsForFirstSize = product.variants
        .filter(v => v.size === firstSize && v.stock && v.stock > 0)
        .map(v => v.color)
        .filter(Boolean);
      if (colorsForFirstSize.length > 0) {
        setSelectedColor(colorsForFirstSize[0]);
      }
    }
  }, [product, sizes, selectedSize]);

  // Reset color when size changes
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    // Find first available color for this size
    const availableColors = product?.variants
      .filter(v => v.size === size && v.stock && v.stock > 0)
      .map(v => v.color)
      .filter(Boolean) || [];
    setSelectedColor(availableColors[0] || null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    }
  };

useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/products/${params.slug}`)
      .then(res => res.json())
      .then(data => {
        const p = data.product;
        setProduct(p);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch product:', err);
        setLoading(false);
      });
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
            <div className="space-y-6 pt-8">
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-32 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-16 bg-gray-200 rounded w-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h1>
          <p className="text-gray-500">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const images: string[] = [];
  if (product.thumbnail) images.push(product.thumbnail);
  if (product.images) {
    product.images.forEach((img) => {
      if (!images.includes(img.url)) images.push(img.url);
    });
  }
  if (images.length === 0) images.push('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800');
  
  while (images.length < 4) images.push(images[0]);

  const price = selectedVariant?.price || 0;
  const inventory = selectedVariant?.stock || 0;
  const isOutOfStock = inventory === 0;
  const rating = product.ratings?.avg || 4.5;
  const reviewCount = product.ratings?.count || 0;
  const isFeatured = product.tags?.includes('featured');
  const isBestseller = product.tags?.includes('bestseller');

  const handleAddToCart = () => {
    if (isOutOfStock || !product) return;
    
    dispatch(addToCart({
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail,
        images: product.images,
        price: selectedVariant?.price,
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
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleAddToWishlist = () => {
    dispatch(addToWishlist({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      thumbnail: product.thumbnail,
    }));
    setIsWishlisted(!isWishlisted);
  };

  const getColorHex = (colorName: string): string => {
    const key = colorName.toLowerCase().replace(/\s+/g, '');
    return COLOR_MAP[key] || '#9CA3AF';
  };

  const isLightColor = (colorName: string): boolean => {
    return ['white', 'cream', 'beige', 'nude', 'yellow', 'silver'].some(
      c => colorName.toLowerCase().includes(c)
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <motion.nav 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-gray-500 mb-8"
        >
          <a href="/" className="hover:text-gray-900 transition-colors">Home</a>
          <ChevronRight className="h-4 w-4" />
          <a href="/products" className="hover:text-gray-900 transition-colors">Shop</a>
          {product.category && (
            <>
              <ChevronRight className="h-4 w-4" />
              <a href={`/products?category=${product.category}`} className="hover:text-gray-900 transition-colors">
                {product.category}
              </a>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
        </motion.nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div 
              ref={imageRef}
              className="relative aspect-square rounded-2xl bg-gray-100 overflow-hidden group cursor-zoom-in"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{
                      transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      transform: isZoomed ? 'scale(2)' : 'scale(1)',
                    }}
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </motion.div>
              </AnimatePresence>
              
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <AnimatePresence>
                  {isFeatured && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-1.5 text-sm font-bold rounded-lg shadow-lg"
                    >
                      Featured
                    </motion.span>
                  )}
                  {isBestseller && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1.5 text-sm font-bold rounded-lg shadow-lg"
                    >
                      Best Seller
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAddToWishlist}
                className={`absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all ${
                  isWishlisted ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Heart className={`h-6 w-6 ${isWishlisted ? 'fill-current' : ''}`} />
              </motion.button>

              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-gray-600">
                <ZoomIn className="h-4 w-4" />
                <span>Hover to zoom</span>
              </div>
            </div>
            
            {images.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              >
                {images.slice(0, 4).map((image, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(index)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === index 
                        ? 'border-gray-900 shadow-lg ring-2 ring-gray-900 ring-offset-2' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-24 lg:self-start space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block"
                  >
                    {product.category || 'Kentaz Fashion'}
                  </motion.p>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Share2 className="h-5 w-5 text-gray-500" />
                  </motion.button>
                </div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl lg:text-4xl font-bold text-gray-900 leading-tight"
                >
                  {product.name}
                </motion.h1>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            i < Math.floor(rating) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : i < rating 
                              ? 'fill-yellow-400/50 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {rating > 0 ? `${rating} (${reviewCount} reviews)` : 'No reviews yet'}
                  </span>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-baseline gap-4 pt-2"
                >
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(price)}
                  </span>
                </motion.div>

                <motion.div className="prose prose-sm text-gray-600 leading-relaxed py-4 border-y border-gray-100">
                  <p>{product.description}</p>
                </motion.div>

                {product.variants && product.variants.length > 0 && sizes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="space-y-6 pt-2"
                  >
                    {/* Size Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-gray-900">
                          Size
                          {selectedSize && (
                            <span className="text-gray-500 font-normal ml-1">: {selectedSize}</span>
                          )}
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((size, index) => {
                          const sizeVariants = product.variants.filter(v => v.size === size);
                          const hasStock = sizeVariants.some(v => v.stock && v.stock > 0);
                          const isSelected = selectedSize === size;
                          const isUnavailable = !hasStock;

                          return (
                            <motion.button
                              key={size}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 + index * 0.05 }}
                              whileHover={!isUnavailable ? { scale: 1.05 } : {}}
                              whileTap={!isUnavailable ? { scale: 0.95 } : {}}
                              onClick={() => !isUnavailable && handleSizeSelect(size)}
                              disabled={isUnavailable}
                              className={`min-w-[70px] px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                isSelected
                                  ? 'border-gray-900 bg-gray-900 text-white shadow-lg'
                                  : isUnavailable
                                  ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50 line-through'
                                  : 'border-gray-200 text-gray-700 hover:border-gray-400 hover:shadow-md'
                              }`}
                            >
                              {size}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Selection - Show all colors, strike out unavailable */}
                    {uniqueAllColors.length > 0 && selectedSize && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-gray-900">
                            Color
                            {selectedColor && (
                              <span className="text-gray-500 font-normal ml-1">: {selectedColor}</span>
                            )}
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {uniqueAllColors.map((color, index) => {
                            const isUnavailable = !isColorAvailableForSize(color || '');
                            const isSelected = selectedColor === color;
                            const colorHex = getColorHex(color || '');

                            return (
                              <motion.button
                                key={color}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                                whileHover={!isUnavailable ? { scale: 1.1 } : {}}
                                whileTap={!isUnavailable ? { scale: 0.95 } : {}}
                                onClick={() => !isUnavailable && setSelectedColor(color)}
                                disabled={isUnavailable}
                                title={isUnavailable ? `Not available in ${selectedSize}` : color}
                                className={`group relative w-12 h-12 rounded-full border-2 transition-all ${
                                  isSelected
                                    ? 'border-gray-900 shadow-lg ring-2 ring-gray-900 ring-offset-2'
                                    : isUnavailable
                                    ? 'border-gray-200 opacity-40 cursor-not-allowed'
                                    : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                                }`}
                              >
                                <span
                                  className={`absolute inset-1 rounded-full border ${
                                    isLightColor(color || '') ? 'border-gray-300' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: colorHex }}
                                />
                                {/* Strike-through for unavailable */}
                                {isUnavailable && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-14 h-0.5 bg-red-500 rotate-45 absolute" />
                                  </span>
                                )}
                                {isSelected && !isUnavailable && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <Check className={`w-5 h-5 ${isLightColor(color || '') ? 'text-gray-900' : 'text-white'}`} />
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                        {selectedColor && (
                          <p className="mt-2 text-sm text-gray-600">
                            Color: <span className="font-semibold text-gray-900">{selectedColor}</span>
                            {!isColorAvailableForSize(selectedColor || '') && (
                              <span className="ml-2 text-red-500 text-xs">(out of stock)</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Selected variant info */}
                    {selectedVariant && (
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm text-gray-600">
                            Selected: <span className="font-semibold text-gray-900">{selectedSize}</span>
                            {selectedColor && (
                              <span className="text-gray-900"> / {selectedColor}</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Price</p>
                          <p className="font-bold text-gray-900">{formatPrice(selectedVariant.price)}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-4 pt-4 border-t border-gray-100"
                >
                  <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <motion.span 
                      key={quantity}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="w-16 text-center font-bold text-lg"
                    >
                      {quantity}
                    </motion.span>
                    <button
                      onClick={() => setQuantity(Math.min(inventory, quantity + 1))}
                      className="p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      disabled={quantity >= inventory}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-3 h-3 rounded-full ${isOutOfStock ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className={`text-sm font-medium ${isOutOfStock ? 'text-red-500' : 'text-gray-700'}`}>
                      {isOutOfStock ? 'Out of stock' : `${inventory} in stock`}
                    </span>
                  </motion.div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="flex gap-3 pt-2"
                >
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
                        : 'bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-gray-900/20'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {addedToCart ? (
                        <motion.div
                          key="added"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-6 w-6" />
                          Added!
                        </motion.div>
                      ) : isOutOfStock ? (
                        <motion.span key="out">Out of Stock</motion.span>
                      ) : (
                        <motion.div key="add" className="flex items-center gap-2">
                          <ShoppingCart className="h-6 w-6" />
                          Add to Cart
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100"
                >
                  {[
                    { icon: Truck, label: 'Free Shipping', sub: 'Orders ₦50k+' },
                    { icon: Shield, label: 'Secure Pay', sub: '100% Protected' },
                    { icon: RotateCcw, label: 'Easy Returns', sub: '7 Days' },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 + index * 0.05 }}
                      className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <item.icon className="h-6 w-6 text-gray-700 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.sub}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Free Delivery</p>
                  <p className="text-sm text-gray-500">On orders over ₦50,000</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Secure Payment</p>
                  <p className="text-sm text-gray-500">Powered by Paystack</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">7-Day Returns</p>
                  <p className="text-sm text-gray-500">Hassle-free returns policy</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}