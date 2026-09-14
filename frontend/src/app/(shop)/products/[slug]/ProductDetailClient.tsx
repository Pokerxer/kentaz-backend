'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, MotionConfig, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Transition, ViewportOptions, Variants } from 'framer-motion';
import { Minus, Plus, Heart, ShoppingCart, Truck, Shield, BadgeCheck, Check, Star, Share2, ChevronRight, ChevronLeft, ZoomIn, X, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToWishlist } from '@/store/wishlistSlice';
import { addToCart } from '@/store/cartSlice';
import { formatPrice } from '@/lib/utils';
import { getActiveDiscounts, getVariantDeal } from '@/lib/flashSale';
import type { FlashDiscount } from '@/lib/flashSale';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { BUSINESS } from '@/lib/seo';

interface ProductVariant {
  size?: string;
  color?: string;
  price: number;
  stock?: number;
}

interface Review {
  _id: string;
  user: { name: string };
  rating: number;
  comment: string;
  createdAt: string;
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
  gold: '#C9A84C',
  cream: '#FFFDD0',
  beige: '#F5F5DC',
  orange: '#F97316',
  emerald: '#10B981',
};

const STAR_FILLED = 'fill-[#C9A84C] text-[#C9A84C]';
const STAR_EMPTY = 'text-[#E5E5E5]';
const FALLBACK_PRODUCT_IMG = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

// Animated selection ring shared across thumbnails (shared-element continuity).
// Module-level so React keeps a stable component identity between renders.
function ThumbRing({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={SPRING}
      className="absolute inset-0 rounded-[10px] ring-2 ring-[#2D2D2D] ring-offset-2 pointer-events-none"
      aria-hidden
    />
  );
}

// Motion tokens — one rhythm for the whole page (ui-ux-pro-max §7)
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // easeOutQuint: fast start, graceful settle
const MICRO: Transition = { duration: 0.22, ease: EASE };          // taps, hovers, icon swaps
const ENTER: Transition = { duration: 0.42, ease: EASE };          // section / panel entrances
const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 30, mass: 0.85 };
const VIEWPORT: ViewportOptions = { once: true, amount: 0.15 };    // standard reveal trigger

// Framework convention: transform + opacity only, never width/height/top/left.
const SECTION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: ENTER },
};

export default function ProductDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.user);
  const reduceMotion = useReducedMotion();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Sticky mobile CTA — appears once the inline buy panel scrolls out of view
  const [showStickyBar, setShowStickyBar] = useState(false);
  const buyPanelRef = useRef<HTMLDivElement>(null);

  // Share feedback — icon flips to a checkmark after the link is copied
  const [shareCopied, setShareCopied] = useState(false);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Related-product quick add feedback
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);
  const quickAddTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Temu-style variant selection
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  /** Active promotions from the public discounts endpoint (best-effort). */
  const [discounts, setDiscounts] = useState<FlashDiscount[]>([]);

  // Write-a-review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Lightbox gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Share / toast feedback
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      if (quickAddTimerRef.current) clearTimeout(quickAddTimerRef.current);
    };
  }, []);

  // Show the mobile sticky CTA only after the inline buy panel scrolled away
  useEffect(() => {
    const el = buyPanelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: '0px 0px -30% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    getActiveDiscounts().then((ds) => {
      if (!cancelled) setDiscounts(ds);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Gallery images (derived at top level so hooks below can read `images.length` safely)
  const images: string[] = [];
  if (product?.thumbnail) images.push(product.thumbnail);
  if (product?.images) {
    product.images.forEach((img) => {
      if (!images.includes(img.url)) images.push(img.url);
    });
  }
  if (product && images.length === 0) {
    images.push('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800');
  }
  while (product && images.length < 4) images.push(images[0]);

  const sizes: string[] = product?.variants
    ? [...new Set(product.variants.map(v => v.size).filter(Boolean))] as string[]
    : [];

  const uniqueAllColors: string[] = product?.variants
    ? [...new Set(product.variants.map(v => v.color).filter(Boolean))] as string[]
    : [];

  // Availability check handles size-only, color-only, and combined variant structures
  const isColorAvailable = (color: string): boolean => {
    if (!product) return false;
    if (sizes.length > 0 && selectedSize) {
      const v = product.variants.find(v => v.size === selectedSize && v.color === color);
      return (v?.stock ?? 0) > 0;
    }
    if (sizes.length === 0) {
      const v = product.variants.find(v => v.color === color);
      return (v?.stock ?? 0) > 0;
    }
    return true;
  };

  const selectedVariant = (() => {
    if (!product) return undefined;
    const hasSizes = sizes.length > 0;
    const hasColors = uniqueAllColors.length > 0;
    if (hasSizes && hasColors)
      return product.variants.find(v => v.size === selectedSize && v.color === selectedColor);
    if (hasSizes)
      return product.variants.find(v => v.size === selectedSize);
    if (hasColors)
      return product.variants.find(v => v.color === selectedColor);
    return product.variants[0];
  })() ?? product?.variants[0];

  // Auto-select first available size + color on product load
  useEffect(() => {
    if (!product || product.variants.length === 0) return;

    let sizeToUse = selectedSize;
    if (sizes.length > 0 && !selectedSize) {
      const first = sizes.find(s =>
        product.variants.some(v => v.size === s && (v.stock ?? 0) > 0)
      ) ?? sizes[0];
      setSelectedSize(first);
      sizeToUse = first;
    }

    if (uniqueAllColors.length > 0 && !selectedColor) {
      const pool = sizeToUse
        ? product.variants.filter(v => v.size === sizeToUse)
        : product.variants;
      const first = uniqueAllColors.find(c =>
        pool.some(v => v.color === c && (v.stock ?? 0) > 0)
      ) ?? uniqueAllColors[0];
      setSelectedColor(first);
    }
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    const availableColors = (product?.variants ?? [])
      .filter(v => v.size === size && (v.stock ?? 0) > 0)
      .map(v => v.color)
      .filter(Boolean) as string[];
    setSelectedColor(availableColors[0] ?? null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    }
  };

  const loadProduct = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/products/${slug}`);
      const data = await res.json();
      const p = data.product;
      setProduct(p);
      setReviews(data.reviews || []);

      // Fetch related products by category
      if (p?.category) {
        try {
          const relRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/products?category=${encodeURIComponent(p.category)}&limit=10`);
          const relData = await relRes.json();
          // Filter out current product, products without images, and out-of-stock products
          const related = (relData.products || [])
            .filter((rp: Product) =>
              rp._id !== p._id &&
              (rp.images?.length ?? 0) > 0 &&
              rp.images?.[0]?.url &&
              (rp.variants || []).some((v: any) => (v.stock ?? 0) >= 1)
            )
            .slice(0, 6);
          setRelatedProducts(related);
        } catch (err) {
          console.error('Failed to fetch related products:', err);
        }
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProduct(String(params.slug));
  }, [params.slug, loadProduct]);

  // Lightbox keyboard navigation + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, images.length]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const data = { title: `${product.name} — Kentaz Emporium`, text: `Shop ${product.name}` };
    const fallback = async () => {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard');
        setShareCopied(true);
        if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
        shareTimerRef.current = setTimeout(() => setShareCopied(false), 1800);
      } catch {
        showToast('Could not copy link');
      }
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ ...data, url });
      } else {
        await fallback();
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') await fallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, showToast]);

  // Quick-add a related product straight from the card (deal-aware pricing).
  // Declared with the other hooks — BEFORE any early return — so React always
  // sees the same hook count on every render.
  const handleQuickAdd = useCallback((item: Product) => {
    const variant = item.variants?.[0];
    const deal = getVariantDeal(item, variant, discounts);
    const price = deal?.price ?? variant?.price ?? 0;
    dispatch(addToCart({
      product: {
        _id: item._id,
        name: item.name,
        slug: item.slug,
        thumbnail: item.thumbnail,
        images: item.images,
        price,
      },
      quantity: 1,
      variant: variant
        ? { size: variant.size, color: variant.color, price }
        : undefined,
    }));
    setQuickAddedId(item._id);
    if (quickAddTimerRef.current) clearTimeout(quickAddTimerRef.current);
    quickAddTimerRef.current = setTimeout(() => setQuickAddedId(null), 1600);
    window.dispatchEvent(new CustomEvent('open-cart'));
  }, [dispatch, discounts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            <div className="space-y-4">
              <div className="aspect-square bg-[#E5E5E5] rounded-2xl animate-pulse" />
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square bg-[#E5E5E5] rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
            <div className="space-y-6 pt-8">
              <div className="h-4 bg-[#E5E5E5] rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-[#E5E5E5] rounded w-3/4 animate-pulse" />
              <div className="h-8 bg-[#E5E5E5] rounded w-1/3 animate-pulse" />
              <div className="h-32 bg-[#E5E5E5] rounded w-full animate-pulse" />
              <div className="h-16 bg-[#E5E5E5] rounded w-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Product not found</h1>
          <p className="text-muted">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

const price = selectedVariant?.price || 0;
  const inventory = selectedVariant?.stock || 0;
  const isOutOfStock = inventory === 0;
  const isLowStock = !isOutOfStock && inventory <= 5;
  // Visual stock gauge: full bar at 20+ units
  const stockPct = Math.min(100, Math.round((inventory / 20) * 100));
  // Effective pricing: the deepest genuine markdown wins (admin discount or
  // compareAtPrice), mirroring the backend quote — so the page shows exactly
  // what the cart will charge.
  const deal = product && selectedVariant ? getVariantDeal(product, selectedVariant, discounts) : null;
  const displayPrice = deal?.price ?? price;
  const wasPrice = deal?.compareAtPrice ?? null;
  const discountPct = deal?.discountPercent ?? 0;
  const rating = product.ratings?.avg || 4.5;
  const reviewCount = product.ratings?.count || 0;
  const isFeatured = product.tags?.includes('featured');
  const isBestseller = product.tags?.includes('bestseller');
  const whatsappHref = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(
    `Hello Kentaz Emporium! I'm interested in "${product.name}" (${formatPrice(displayPrice)}). Is it available?`
  )}`;

  const handleAddToCart = () => {
    if (isOutOfStock || !product) return;

    dispatch(addToCart({
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail,
        images: product.images,
        price: displayPrice,
      },
      quantity,
      variant: selectedVariant ? {
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: displayPrice,
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
    if (!isWishlisted) showToast('Added to wishlist');
  };

  const handleSubmitReview = async () => {
    if (!product || submittingReview) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('kentaz_token') : null;
    setSubmittingReview(true);
    setReviewMsg(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          product: product._id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewMsg({ ok: true, text: 'Review submitted! Thank you for your feedback.' });
        setReviewComment('');
        setReviewRating(5);
        // Refresh the page data so the new review and updated average appear.
        await loadProduct(String(params.slug));
      } else if (res.status === 401) {
        setReviewMsg({ ok: false, text: 'Please log in to submit a review.' });
      } else {
        setReviewMsg({ ok: false, text: data.error || 'Could not submit your review.' });
      }
    } catch {
      setReviewMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setSubmittingReview(false);
    }
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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const thumbClasses = () =>
    'relative flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 cursor-pointer';

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted mb-6 lg:mb-10 overflow-hidden"
        >
          <Link href="/" className="hover:text-gold transition-colors whitespace-nowrap">Home</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          <Link href="/products" className="hover:text-gold transition-colors whitespace-nowrap">Shop</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              <Link href={`/products?category=${product.category}`} className="hover:text-gold transition-colors whitespace-nowrap">
                {product.category}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          <span className="text-foreground truncate min-w-0">{product.name}</span>
        </motion.nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={ENTER}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col lg:flex-row-reverse gap-4 items-stretch">
              {/* Main image */}
              <div className="flex-1 min-w-0">
                <div
                  ref={imageRef}
                  className="relative aspect-square rounded-2xl bg-[#F5F5F0] overflow-hidden group cursor-zoom-in ring-1 ring-border"
                  onMouseEnter={() => !reduceMotion && setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                  onClick={() => openLightbox(selectedImage)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${product.name} image in fullscreen`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openLightbox(selectedImage);
                    }
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedImage}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={MICRO}
                      className="absolute inset-0"
                    >
                      <SafeImage
                        src={images[selectedImage]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{
                          transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                          transform: isZoomed && !reduceMotion ? 'scale(2)' : 'scale(1)',
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
                          className="bg-gradient-to-r from-[#C9A84C] to-[#A68A3D] text-white px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg shadow-lg"
                        >
                          Featured
                        </motion.span>
                      )}
                      {isBestseller && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="bg-[#2D2D2D]/90 text-white px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg shadow-lg backdrop-blur-sm"
                        >
                          Best Seller
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToWishlist();
                    }}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={isWishlisted}
                    className={`absolute top-4 right-4 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      isWishlisted ? 'text-[#E85C5C]' : 'text-muted hover:text-[#E85C5C]'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
                  </motion.button>

                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-muted">
                    <ZoomIn className="h-4 w-4" aria-hidden />
                    <span>Click to enlarge</span>
                  </div>
                </div>

                {/* Horizontal thumbnails — mobile */}
                {images.length > 1 && (
                  <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 pt-3 scrollbar-hide" role="group" aria-label="Product images">
                    {images.slice(0, 4).map((image, index) => (
                      <motion.button
                        key={index}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setSelectedImage(index)}
                        aria-label={`View image ${index + 1}`}
                        aria-pressed={selectedImage === index}
                        className={`${thumbClasses()} w-16 h-16 sm:w-20 sm:h-20`}
                      >
                        <span className="absolute inset-0 overflow-hidden rounded-[10px] border border-transparent group-hover:border-gold/60 transition-colors">
                          <SafeImage
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-300 hover:scale-110"
                            sizes="80px"
                          />
                        </span>
                        {selectedImage === index && <ThumbRing layoutId="thumb-ring-mobile" />}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vertical thumbnails — desktop */}
              {images.length > 1 && (
                <div className="hidden lg:flex flex-col gap-3 w-20 xl:w-24" role="group" aria-label="Product images">
                  {images.slice(0, 4).map((image, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={selectedImage === index}
                      className={`${thumbClasses()} aspect-square`}
                    >
                      <span className="absolute inset-0 overflow-hidden rounded-[10px] border border-transparent group-hover:border-gold/60 transition-colors">
                        <SafeImage
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-110"
                          sizes="96px"
                        />
                      </span>
                      {selectedImage === index && <ThumbRing layoutId="thumb-ring-desktop" />}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={ENTER}
            ref={buyPanelRef}
            className="lg:sticky lg:top-24 lg:self-start space-y-5"
          >
            <div className="bg-surface rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm border border-border">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={ENTER}
                  className="block h-[3px] w-14 origin-left rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] mt-1"
                  aria-hidden
                />
                <div className="flex items-center justify-between gap-3">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-[#C9A84C] bg-[#C9A84C]/10 px-3 py-1.5 rounded-full"
                  >
                    {product.category || 'Kentaz Fashion'}
                  </motion.p>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleShare}
                    aria-label={shareCopied ? 'Link copied' : 'Share this product'}
                    className="p-3 hover:bg-surface-alt rounded-full transition-colors text-muted hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={shareCopied ? 'copied' : 'share'}
                        initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.4, rotate: 20 }}
                        transition={MICRO}
                        className="block"
                      >
                        {shareCopied ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Share2 className="h-5 w-5" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#2D2D2D] leading-tight tracking-tight"
                >
                  {product.name}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <Star
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            i < Math.floor(rating)
                              ? STAR_FILLED
                              : i < rating
                              ? 'fill-[#C9A84C]/40 text-[#C9A84C]'
                              : STAR_EMPTY
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <span className="text-sm text-muted">
                    {rating > 0 ? `${rating.toFixed(1)} (${reviewCount})` : 'No reviews yet'}
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center gap-3 pt-2"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={displayPrice}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={MICRO}
                      className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"
                    >
                      <span className="text-3xl sm:text-4xl font-bold text-[#2D2D2D] tabular-nums">
                        {formatPrice(displayPrice)}
                      </span>
                      {wasPrice != null && wasPrice > displayPrice && (
                        <>
                          <span className="text-lg sm:text-xl text-[#9CA3AF] line-through tabular-nums">
                            {formatPrice(wasPrice)}
                          </span>
                          <span className="text-xs font-bold text-[#A16207] bg-[#C9A84C]/15 border border-[#C9A84C]/30 px-2.5 py-1.5 rounded-lg tabular-nums">
                            -{discountPct}%
                          </span>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div className="prose prose-sm text-muted leading-relaxed py-4 border-y border-border">
                  <p className="text-[15px] sm:text-base">{product.description}</p>
                </motion.div>

                {(sizes.length > 0 || uniqueAllColors.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="space-y-5 pt-2"
                  >
                    {/* Size Selection */}
                    {sizes.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-[#2D2D2D]">
                            Size
                            {selectedSize && (
                              <span className="text-muted font-normal ml-1.5">— {selectedSize}</span>
                            )}
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((size, index) => {
                            const hasStock = product.variants
                              .filter(v => v.size === size)
                              .some(v => (v.stock ?? 0) > 0);
                            const isSelected = selectedSize === size;

                            return (
                              <motion.button
                                key={size}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                                whileHover={hasStock ? { scale: 1.05 } : {}}
                                whileTap={hasStock ? { scale: 0.95 } : {}}
                                onClick={() => hasStock && handleSizeSelect(size)}
                                disabled={!hasStock}
                                aria-pressed={isSelected}
                                className={`min-w-[56px] px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                                  isSelected
                                    ? 'border-[#2D2D2D] bg-[#2D2D2D] text-white shadow-lg'
                                    : !hasStock
                                    ? 'border-border text-[#D1D5DB] cursor-not-allowed bg-surface-alt line-through'
                                    : 'border-border text-[#2D2D2D] hover:border-gold hover:text-gold hover:shadow-sm'
                                }`}
                              >
                                {size}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Color Selection */}
                    {uniqueAllColors.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-[#2D2D2D]">
                            Color
                            {selectedColor && (
                              <span className="text-muted font-normal ml-1.5">— {selectedColor}</span>
                            )}
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {uniqueAllColors.map((color, index) => {
                            const unavailable = !isColorAvailable(color ?? '');
                            const isSelected = selectedColor === color;
                            const colorHex = getColorHex(color ?? '');
                            const light = isLightColor(color ?? '');

                            return (
                              <motion.button
                                key={color}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                                whileHover={!unavailable ? { scale: 1.1 } : {}}
                                whileTap={!unavailable ? { scale: 0.95 } : {}}
                                onClick={() => !unavailable && color && setSelectedColor(color)}
                                disabled={unavailable}
                                title={unavailable
                                  ? `${color} — not available${selectedSize ? ` in size ${selectedSize}` : ''}`
                                  : color ?? ''}
                                aria-label={`Color ${color}${isSelected ? ' (selected)' : ''}`}
                                aria-pressed={isSelected}
                                className={`group relative w-11 h-11 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                                  isSelected
                                    ? 'border-[#2D2D2D] shadow-lg ring-2 ring-[#2D2D2D]/10'
                                    : unavailable
                                    ? 'border-border opacity-35 cursor-not-allowed'
                                    : 'border-border hover:border-gold hover:shadow-md'
                                }`}
                              >
                                <span
                                  className={`absolute inset-1 rounded-full ${light ? 'border border-border' : ''}`}
                                  style={{ backgroundColor: colorHex }}
                                />
                                {unavailable && (
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="w-[150%] h-px bg-[#DC2626] rotate-45 absolute" />
                                  </span>
                                )}
                                {isSelected && !unavailable && (
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Check className={`w-4 h-4 ${light ? 'text-[#2D2D2D]' : 'text-white'}`} />
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-4 border-t border-border"
                >
                  <div className="flex items-center border border-border rounded-xl overflow-hidden" role="group" aria-label="Quantity">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-surface-alt transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      aria-label="Decrease quantity"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <motion.span
                      key={quantity}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="w-16 text-center font-bold text-lg tabular-nums"
                      aria-live="polite"
                    >
                      {quantity}
                    </motion.span>
                    <button
                      onClick={() => setQuantity(Math.min(Math.max(inventory, 1), quantity + 1))}
                      className="p-3 hover:bg-surface-alt transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      aria-label="Increase quantity"
                      disabled={quantity >= Math.max(inventory, 1)}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-3 h-3 rounded-full ${isOutOfStock ? 'bg-[#DC2626] animate-pulse' : isLowStock ? 'bg-[#C9A84C] animate-pulse' : 'bg-[#16A34A]'}`} />
                    <span className={`text-sm font-medium tabular-nums ${isOutOfStock ? 'text-[#DC2626]' : 'text-muted'}`}>
                      {isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${inventory} left` : `${inventory} in stock`}
                    </span>
                  </motion.div>

                  {/* Animated availability gauge — encode urgency, not decoration */}
                  {!isOutOfStock && (
                    <div className="relative w-full h-1 rounded-full bg-[#E5E5E5] overflow-hidden" role="presentation">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.9 }}
                        style={{ width: `${stockPct}%` }}
                        className={`h-full rounded-full origin-left ${isLowStock ? 'bg-[#C9A84C]' : 'bg-[#16A34A]'}`}
                      />
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="flex flex-col gap-3 pt-2"
                >
                  <motion.button
                    whileHover={!isOutOfStock && !addedToCart ? { scale: 1.01 } : {}}
                    whileTap={!isOutOfStock && !addedToCart ? { scale: 0.99 } : {}}
                    onClick={handleAddToCart}
                    disabled={addedToCart || isOutOfStock}
                    aria-label={isOutOfStock ? 'Out of stock' : 'Add to cart'}
                    className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-base sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                      addedToCart
                        ? 'bg-green-600 text-white'
                        : isOutOfStock
                        ? 'bg-[#E5E5E5] text-[#9CA3AF] cursor-not-allowed'
                        : 'bg-[#2D2D2D] text-white hover:bg-[#C9A84C] hover:text-[#1A1A1A] shadow-xl shadow-[#2D2D2D]/15 transition-colors duration-300'
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

                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border border-[#C9A84C]/40 text-[#A16207] hover:bg-[#C9A84C]/10 transition-colors duration-300"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    Order via WhatsApp
                  </a>
                </motion.div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                  {[
                    { icon: BadgeCheck, label: '100% Authentic', sub: 'Verified genuine' },
                    { icon: Truck, label: 'Same-Day Dispatch', sub: 'Order before 2pm' },
                    { icon: Shield, label: 'Secure Payment', sub: 'Paystack protected' },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 + index * 0.05 }}
                      className="text-center px-1.5 py-3 sm:p-4 bg-surface-alt rounded-xl hover:bg-[#E5E5E5] transition-colors"
                    >
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#C9A84C] mx-auto mb-1.5" aria-hidden />
                      <p className="text-[10px] sm:text-xs font-semibold text-[#2D2D2D] leading-tight">{item.label}</p>
                      <p className="text-[10px] sm:text-xs text-muted leading-tight mt-0.5 hidden sm:block">{item.sub}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <motion.section
            variants={SECTION_VARIANTS}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            className="mt-16 lg:mt-24"
            aria-labelledby="related-heading"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-6 lg:mb-8">
              <div>
                <h2 id="related-heading" className="text-2xl lg:text-3xl font-semibold text-[#2D2D2D]">
                  You May Also Like
                </h2>
                <span className="mt-2 block h-[2px] w-16 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A]" aria-hidden />
                <p className="text-sm text-muted mt-2">Handpicked pieces our customers couldn't resist.</p>
              </div>
              <Link
                href={`/products?category=${product?.category || ''}`}
                className="group/link text-sm font-medium text-gold hover:text-gold-dark transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                aria-label={`View all ${product?.category || ''} products`}
              >
                View All
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5 lg:gap-x-6 lg:gap-y-8">
              {relatedProducts.map((item, index) => {
                const itemVariant = item.variants?.[0];
                const itemDeal = getVariantDeal(item, itemVariant, discounts);
                const itemPrice = itemDeal?.price ?? itemVariant?.price ?? 0;
                const itemWas = itemDeal?.compareAtPrice ?? null;
                const itemPct = itemDeal?.discountPercent ?? 0;
                const itemRating = item.ratings?.avg;
                const itemCount = item.ratings?.count ?? 0;

                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT}
                    transition={{ ...ENTER, delay: index * 0.05 }}
                    whileHover={{ y: -6 }}
                    className="group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-alt shadow-sm ring-1 ring-border transition-all duration-500 group-hover:shadow-[0_20px_45px_-18px_rgba(0,0,0,0.35)] group-hover:ring-gold/60">

                      <Link
                        href={`/products/${item.slug}`}
                        className="absolute inset-0 z-0 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                        aria-label={item.name}
                      >
                        <SafeImage
                          src={item.thumbnail || item.images?.[0]?.url || FALLBACK_PRODUCT_IMG}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {/* Hover depth gradient */}
                        <span
                          className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          aria-hidden
                        />
                      </Link>

                      {/* Brand badges */}
                      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
                        {item.tags?.includes('featured') && (
                          <span className="bg-gradient-to-r from-[#C9A84C] to-[#A68A3D] text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                            Featured
                          </span>
                        )}
                        {item.tags?.includes('bestseller') && (
                          <span className="bg-[#2D2D2D]/90 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg shadow-md backdrop-blur-sm">
                            Best Seller
                          </span>
                        )}
                      </div>

                      {/* Discount badge (deal-aware) */}
                      {itemWas != null && itemWas > itemPrice && (
                        <motion.span
                          initial={{ scale: 0, rotate: -8 }}
                          whileInView={{ scale: 1, rotate: 0 }}
                          viewport={VIEWPORT}
                          transition={SPRING}
                          className="absolute top-2.5 right-2.5 z-10 bg-[#A16207] text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg shadow-md tabular-nums"
                        >
                          -{itemPct}%
                        </motion.span>
                      )}

                      {/* Quick add — full-width slide-up on desktop hover */}
                      <button
                        onClick={() => handleQuickAdd(item)}
                        aria-label={`Add ${item.name} to cart`}
                        className="hidden lg:flex absolute inset-x-3 bottom-3 z-10 items-center justify-center gap-2 h-11 rounded-xl bg-white/95 backdrop-blur-sm text-[#2D2D2D] text-sm font-bold shadow-lg translate-y-[130%] opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 hover:bg-[#2D2D2D] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        {quickAddedId === item._id ? (
                          <><Check className="h-4 w-4" /> Added!</>
                        ) : (
                          <><ShoppingCart className="h-4 w-4" /> Quick Add</>
                        )}
                      </button>

                      {/* Quick add — always-visible FAB on touch devices */}
                      <motion.button
                        onClick={() => handleQuickAdd(item)}
                        aria-label={`Add ${item.name} to cart`}
                        whileTap={{ scale: 0.9 }}
                        className={`lg:hidden absolute bottom-3 right-3 z-10 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                          quickAddedId === item._id
                            ? 'bg-green-600 text-white'
                            : 'bg-[#2D2D2D] text-white hover:bg-[#C9A84C] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {quickAddedId === item._id ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <ShoppingCart className="h-5 w-5" />
                        )}
                      </motion.button>
                    </div>

                    <div className="pt-3 px-0.5">
                      <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                        <span className="text-base sm:text-lg font-bold text-[#2D2D2D] tabular-nums">
                          {formatPrice(itemPrice)}
                        </span>
                        {itemWas != null && itemWas > itemPrice && (
                          <span className="text-xs text-[#9CA3AF] line-through tabular-nums">
                            {formatPrice(itemWas)}
                          </span>
                        )}
                      </div>
                      <Link href={`/products/${item.slug}`} className="block mt-1">
                        <h3 className="text-sm font-medium text-[#2D2D2D] line-clamp-2 leading-snug transition-colors duration-300 group-hover:text-[#A16207]">
                          {item.name}
                        </h3>
                      </Link>
                      {itemRating != null && itemRating > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5" aria-label={`Rated ${itemRating.toFixed(1)} of 5`}>
                          <Star className="h-3.5 w-3.5 fill-[#C9A84C] text-[#C9A84C]" />
                          <span className="text-xs text-muted tabular-nums">{itemRating.toFixed(1)}</span>
                          {itemCount > 0 && (
                            <span className="text-xs text-[#9CA3AF] tabular-nums">({itemCount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Reviews Section */}
        <motion.section
          variants={SECTION_VARIANTS}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="mt-16 lg:mt-24"
          aria-labelledby="reviews-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 id="reviews-heading" className="text-2xl lg:text-3xl font-semibold text-[#2D2D2D]">
                Customer Reviews
              </h2>
              <span className="mt-2 block h-[2px] w-16 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A]" aria-hidden />
            </div>
            <div className="flex items-center gap-4">
              {reviews.length > 0 && (
                <span className="text-sm text-muted">
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </span>
              )}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewForm((v) => !v);
                    setReviewMsg(null);
                  }}
                  aria-expanded={showReviewForm}
                  className="px-4 py-2.5 rounded-xl bg-[#2D2D2D] text-white text-sm font-semibold hover:bg-[#C9A84C] hover:text-[#1A1A1A] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              ) : (
                <Link
                  href={`/login?callbackUrl=/products/${product.slug}`}
                  className="px-4 py-2.5 rounded-xl border border-gold text-gold text-sm font-semibold hover:bg-gold hover:text-white transition-colors duration-300"
                >
                  Login to Review
                </Link>
              )}
            </div>
          </div>

          {showReviewForm && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-2xl p-5 sm:p-6 mb-8"
            >
              <h3 className="font-bold text-[#2D2D2D] mb-4">Write your review</h3>
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    aria-pressed={reviewRating === star}
                    className="p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= reviewRating ? STAR_FILLED : STAR_EMPTY
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted">{reviewRating}/5</span>
              </div>
              <label htmlFor="review-comment" className="sr-only">Your review</label>
              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with this product (optional)"
                rows={4}
                className="w-full border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-none"
              />
              {reviewMsg && (
                <p role="status" className={`mt-3 text-sm font-medium ${reviewMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {reviewMsg.text}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="px-6 py-3 rounded-xl bg-[#2D2D2D] text-white text-sm font-bold hover:bg-[#C9A84C] hover:text-[#1A1A1A] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-surface-alt rounded-2xl">
              <Star className="h-12 w-12 text-[#D1D5DB] mx-auto mb-4" />
              <p className="text-muted mb-2">No reviews yet</p>
              <p className="text-sm text-[#9CA3AF]">Be the first to review this product</p>
              {isAuthenticated && !showReviewForm && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm(true)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#2D2D2D] text-white text-sm font-semibold hover:bg-[#C9A84C] hover:text-[#1A1A1A] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Write the first review
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Rating Summary */}
              <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
                <div className="bg-surface-alt rounded-2xl p-6 text-center">
                  <div className="text-5xl font-bold text-[#2D2D2D] mb-2 tabular-nums">
                    {product.ratings?.avg?.toFixed(1) || '0.0'}
                  </div>
                  <div className="flex justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(product.ratings?.avg || 0) ? STAR_FILLED : STAR_EMPTY
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted">
                    Based on {product.ratings?.count || 0} reviews
                  </p>
                </div>

                <div className="md:col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-sm text-muted w-12">{star} star</span>
                        <div className="flex-1 h-2 bg-[#E5E5E5] rounded-full overflow-hidden" role="presentation">
                          <div
                            className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted w-8 tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review List */}
              <div className="space-y-6">
                {reviews.map((review, index) => (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT}
                    transition={{ ...ENTER, delay: index * 0.06 }}
                    className="bg-surface border border-border rounded-2xl p-5 sm:p-6"
                  >
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#C9A84C] to-[#A68A3D] rounded-full flex items-center justify-center text-white font-bold">
                          {review.user?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2D2D2D]">
                            {review.user?.name || 'Anonymous'}
                          </p>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < review.rating ? STAR_FILLED : STAR_EMPTY
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm text-[#9CA3AF] whitespace-nowrap">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-muted leading-relaxed">
                      {review.comment}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      </div>

      {/* Sticky mobile add-to-cart bar — slides in after the inline panel scrolls away */}
      <AnimatePresence>
        {product && showStickyBar && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
            className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-base sm:text-lg font-bold text-[#2D2D2D] tabular-nums leading-tight">
                  {formatPrice(displayPrice)}
                </p>
                <p className="text-[11px] text-muted truncate">{product.name}</p>
              </div>
              <div className="flex items-center border border-border rounded-lg overflow-hidden" role="group" aria-label="Quantity">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-3 hover:bg-surface-alt transition-colors disabled:opacity-50"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold tabular-nums" aria-live="polite">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(Math.max(inventory, 1), quantity + 1))}
                  className="px-3 py-3 hover:bg-surface-alt transition-colors disabled:opacity-50"
                  aria-label="Increase quantity"
                  disabled={quantity >= Math.max(inventory, 1)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={addedToCart || isOutOfStock}
                aria-label={isOutOfStock ? 'Out of stock' : 'Add to cart'}
                className={`flex-1 min-h-[52px] px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                  addedToCart
                    ? 'bg-green-600 text-white'
                    : isOutOfStock
                    ? 'bg-[#E5E5E5] text-[#9CA3AF] cursor-not-allowed'
                    : 'bg-[#2D2D2D] text-white hover:bg-[#C9A84C] hover:text-[#1A1A1A]'
                }`}
              >
                {addedToCart ? (
                  <><Check className="h-5 w-5" /> Added</>
                ) : isOutOfStock ? (
                  'Out of Stock'
                ) : (
                  <><ShoppingCart className="h-5 w-5" /> Add</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global toast */}
      <span className="fixed inset-x-0 bottom-28 lg:bottom-10 z-[60] flex justify-center pointer-events-none px-4">
        <AnimatePresence>
          {toast && (
            <motion.span
              role="status"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-[#2D2D2D] text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl"
            >
              <Check className="h-4 w-4 text-[#C9A84C]" />
              {toast}
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} image viewer`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              autoFocus
              aria-label="Close image viewer"
              className="absolute top-4 right-4 z-10 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X className="h-6 w-6" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
                  }}
                  aria-label="Previous image"
                  className="absolute left-3 sm:left-6 z-10 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((i) => (i + 1) % images.length);
                  }}
                  aria-label="Next image"
                  className="absolute right-3 sm:right-6 z-10 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="relative w-[calc(100vw-2rem)] sm:w-[min(85vw,56rem)] h-[70vh] sm:h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <SafeImage
                    src={images[lightboxIndex]}
                    alt={`${product.name} — image ${lightboxIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, 85vw"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm tabular-nums bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {lightboxIndex + 1} / {images.length}
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 hidden sm:flex gap-3" onClick={(e) => e.stopPropagation()}>
                {images.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-pressed={lightboxIndex === index}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      lightboxIndex === index ? 'border-[#C9A84C]' : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}