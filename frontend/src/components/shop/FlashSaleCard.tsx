'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, ShoppingBag, Eye, Zap, Flame } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/wishlistSlice';
import { formatPrice } from '@/lib/utils';
import type { FlashDeal } from '@/lib/flashSale';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600';

interface FlashSaleCardProps {
  deal: FlashDeal;
  /** 'dark' for dark surfaces (homepage section), 'light' for white surfaces (flash sale page). */
  variant?: 'dark' | 'light';
  onQuickView?: (deal: FlashDeal) => void;
}

export function FlashSaleCard({ deal, variant = 'light', onQuickView }: FlashSaleCardProps) {
  const dispatch = useAppDispatch();
  const wishlistItems = useAppSelector((state) => state.wishlist.items);
  const [addedToCart, setAddedToCart] = useState(false);

  const product = deal.product;
  const productId = product._id || product.id || '';
  const productName = product.name || product.title || '';
  const productSlug = product.slug || product.handle || '';
  const isInWishlist = wishlistItems.some((item) => item._id === productId);

  const image = product.thumbnail || product.images?.[0]?.url || PLACEHOLDER;
  const isDark = variant === 'dark';
  const isLowStock = deal.stock > 0 && deal.stock <= 10;
  const outOfStock = deal.stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    dispatch(
      addToCart({
        product: {
          _id: productId,
          name: productName,
          slug: productSlug,
          thumbnail: product.thumbnail,
          images: product.images,
          price: deal.price,
        },
        quantity: 1,
        variant: {
          size: deal.variant.size,
          color: deal.variant.color,
          price: deal.price,
        },
      })
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist) {
      dispatch(removeFromWishlist(productId));
    } else {
      dispatch(addToWishlist({ _id: productId, name: productName, slug: productSlug, thumbnail: image, price: deal.price }));
    }
  };

  return (
    <Link href={`/products/${productSlug}`} className="group block h-full">
      <div
        className={`relative h-full rounded-2xl overflow-hidden border transition-all duration-500 transform hover:-translate-y-1 hover:shadow-xl ${
          isDark
            ? 'bg-white/5 border-white/10 hover:border-[#C9A84C]/40 hover:shadow-[0_8px_30px_rgba(201,168,76,0.15)]'
            : 'bg-white border-[#E5E5E5] hover:border-[#C9A84C]/50 shadow-sm hover:shadow-[0_8px_30px_rgba(201,168,76,0.12)]'
        }`}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <SafeImage
            src={image}
            alt={productName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              isDark ? 'from-black/70 via-black/10 to-transparent' : 'from-black/50 via-black/10 to-transparent'
            } opacity-60 group-hover:opacity-80 transition-opacity duration-500`}
          />

          {/* Discount + Flash badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2 py-1 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white text-[11px] font-extrabold tracking-wide shadow-lg whitespace-nowrap">
              -{deal.discountPercent}%
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#C9A84C] text-[#1A1A1A] text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg">
              <Zap className="h-3 w-3 fill-current" />
              Flash
            </span>
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow ${
              isInWishlist
                ? 'bg-red-500 opacity-100'
                : isDark
                ? 'bg-white/10 backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500'
                : 'bg-white/80 backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 transition-colors ${isInWishlist ? 'fill-white text-white' : 'text-[#6B6B6B] hover:text-white'}`} />
          </button>

          {/* Actions */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0 transition-all duration-300">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex-1 h-9 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors ${
                addedToCart
                  ? 'bg-green-500 text-white'
                  : outOfStock
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-[#C9A84C] text-[#1A1A1A] hover:bg-[#E8D48A]'
              }`}
            >
              <ShoppingBag className="h-3 w-3" />
              {addedToCart ? 'Added!' : outOfStock ? 'Sold Out' : 'Add to Cart'}
            </button>
            {onQuickView && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView(deal);
                }}
                aria-label="Quick view"
                className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-lg transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-[#1A1A1A]" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className={`text-[10px] uppercase tracking-wider mb-0.5 truncate ${isDark ? 'text-white/50' : 'text-[#9B9B9B]'}`}>
            {product.category}
          </p>
          <h3
            className={`font-semibold leading-snug line-clamp-1 transition-colors text-xs md:text-sm ${
              isDark ? 'text-white group-hover:text-[#E8D48A]' : 'text-[#1A1A1A] group-hover:text-[#C9A84C]'
            }`}
          >
            {productName}
          </h3>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-bold text-[#C9A84C] text-sm whitespace-nowrap">{formatPrice(deal.price)}</span>
              <span className={`text-[10px] line-through whitespace-nowrap ${isDark ? 'text-white/40' : 'text-[#C0C0C0]'}`}>
                {formatPrice(deal.compareAtPrice)}
              </span>
            </div>
            {product.ratings?.avg > 0 && (
              <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-[#9B9B9B]'}`}>★ {product.ratings.avg.toFixed(1)}</span>
            )}
          </div>

          {/* Low-stock urgency */}
          {isLowStock && (
            <div className="mt-2">
              <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#F5F5F0]'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                  style={{ width: `${Math.max(8, Math.min(100, deal.stock * 5))}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] font-semibold text-red-500 flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Only {deal.stock} left in stock
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
