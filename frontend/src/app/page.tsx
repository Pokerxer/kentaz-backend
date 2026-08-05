"use client";

import Link from "next/link";
import SafeImage from '@/components/ui/SafeImage';
import { ArrowRight, Star, Shield, Brain, Mic, Heart, Eye, Sparkles, Flame, TrendingUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HeroSection } from "@/components/ui/HeroSection";
import { QuickViewModal } from "@/components/shop/QuickViewModal";
import { FlashSaleSection } from "@/components/shop/FlashSaleSection";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { addToCart } from "@/store/cartSlice";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToWishlist, removeFromWishlist } from "@/store/wishlistSlice";
import { getFlashDeal, type FlashDeal } from "@/lib/flashSale";

interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  images?: { url: string }[];
  variants?: { price: number }[];
  category?: string;
  tags?: string[];
  ratings?: { avg: number; count: number };
}

interface Category {
  name: string;
  handle: string;
  count: number;
  image: string;
  description: string;
}

function formatPrice(amount: number, currency: string = 'ngn'): string {
  return '₦' + amount.toLocaleString('en-NG');
}

const services = [
  {
    title: "Mental Health Consultation",
    description: "Professional therapy sessions with licensed counselors. Virtual & in-person available.",
    icon: Brain,
    price: "From ₦25,000",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800",
  },
  {
    title: "Podcast Studio",
    description: "State-of-the-art recording studio with professional equipment. Book by the hour.",
    icon: Mic,
    price: "From ₦15,000/hr",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
  },
];

const defaultStats = [
  { value: "500+", label: "Happy Customers" },
  { value: "1000+", label: "Products" },
  { value: "Abuja", label: "Nigeria" },
  { value: "4.8", label: "Average Rating" },
];

const fallbackTestimonials = [
  { name: "Amara J.", text: "The quality of the human hair wigs is amazing! Exactly what I was looking for.", rating: 5, image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100" },
  { name: "Chioma M.", text: "Fast delivery and excellent customer service. Will definitely order again!", rating: 5, image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" },
  { name: "Nadia K.", text: "Love the skincare products. My skin has never looked better.", rating: 5, image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" },
];

function AnimatedCounter({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState("0");
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
          const suffix = value.replace(/[0-9.]/g, "");
          const duration = 2000;
          const steps = 60;
          const increment = numericValue / steps;
          let current = 0;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            current = Math.min(increment * step, numericValue);
            const display = Number.isInteger(numericValue)
              ? Math.round(current).toString()
              : current.toFixed(1);
            setDisplayValue(display + suffix);

            if (step >= steps) {
              clearInterval(timer);
              setDisplayValue(value);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return <span ref={ref}>{displayValue}</span>;
}

function StatsSection() {
  const [stats, setStats] = useState(defaultStats);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    fetch(`${apiUrl}/api/store/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.productCount || data.avgRating) {
          setStats([
            { value: "500+", label: "Happy Customers" },
            { value: `${data.productCount}+`, label: "Products" },
            { value: "Abuja", label: "Nigeria" },
            { value: String(data.avgRating), label: "Average Rating" },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-[#FAFAFA] to-[#F5F5F0]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} direction="up" delay={index * 100}>
              <div className="text-center group">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-[#6B6B6B] text-xs md:text-sm font-medium">{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section className="py-16 md:py-24 bg-[#F5F5F0]">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12 md:mb-16">
            <p className="text-[#C9A84C] font-medium mb-3 tracking-widest uppercase text-sm">What We Offer</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">Wellness & Creative Spaces</h2>
            <p className="text-[#6B6B6B] text-base max-w-2xl mx-auto">Professional services designed to nurture your mind, body, and creative spirit</p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {services.map((service, index) => (
            <ScrollReveal key={service.title} direction={index === 0 ? "left" : "right"} delay={index * 200}>
              <Link
                href={service.title === "Mental Health Consultation" ? "/services#therapy" : "/services#studio"}
                className="group relative"
              >
                <div className="relative rounded-3xl overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-all duration-700">
                  <div className="relative aspect-[4/3] md:aspect-[16/10] overflow-hidden">
                    <SafeImage
                      src={service.image}
                      alt={service.title}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/80 via-[#1A1A1A]/20 to-transparent" />
                    
                    <div className="absolute top-4 left-4 md:top-6 md:left-6">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#C9A84C] flex items-center justify-center shadow-lg shadow-[#C9A84C]/30">
                        <service.icon className="w-7 h-7 md:w-8 md:h-8 text-[#1A1A1A]" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-10">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="inline-block px-3 py-1 mb-3 text-[10px] font-medium tracking-widest uppercase text-[#E8D48A] bg-[#C9A84C]/30 rounded-full backdrop-blur-sm">
                            {service.price}
                          </span>
                          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:text-[#E8D48A] transition-colors duration-300">
                            {service.title}
                          </h3>
                          <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-lg hidden md:block">
                            {service.description}
                          </p>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-2">
                          <span className="text-sm font-medium text-[#C9A84C] group-hover:gap-3 transition-all">
                            Book Now
                          </span>
                          <div className="w-12 h-12 rounded-full bg-[#C9A84C] flex items-center justify-center transform group-hover:scale-110 transition-all duration-300">
                            <ArrowRight className="w-5 h-5 text-[#1A1A1A]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 lg:hidden">
                    <p className="text-[#6B6B6B] text-sm leading-relaxed mb-4">{service.description}</p>
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C9A84C] text-[#1A1A1A] font-medium text-sm group-hover:bg-[#E8D48A] transition-colors">
                      Book Now <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#C9A84C]/10 rounded-full blur-2xl group-hover:bg-[#C9A84C]/20 transition-all duration-700" />
                <div className="absolute -top-4 -left-4 w-32 h-32 bg-[#C9A84C]/5 rounded-full blur-3xl group-hover:bg-[#C9A84C]/10 transition-all duration-700" />
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Featured categories — derived from the live product catalog.
// Product category strings in the DB are messy legacy variants ("FEMALE WEARS",
// "MENS WEAR", "SKIN CARE", "ACCESORIES"...). CATEGORY_ALIASES merges them into
// the brand's display buckets so counts are real and the hero grid shows the
// categories that actually stock the most products.
// ---------------------------------------------------------------------------

const CATEGORY_ALIASES: Record<string, string> = {
  'female wears': 'Female Fashion',
  'female fashion': 'Female Fashion',
  'mens wear': 'Mens Wear',
  'male fashion': 'Mens Wear',
  briefs: 'Mens Wear',
  shoes: 'Shoes',
  'male shoes': 'Shoes',
  jewelry: 'Accessories',
  earrings: 'Accessories',
  accessories: 'Accessories',
  accesories: 'Accessories',
  ties: 'Accessories',
  'kids outfit male': 'Kiddies Fashion',
  'kids outfit female': 'Kiddies Fashion',
  'kiddies fashion': 'Kiddies Fashion',
  children: 'Kiddies Fashion',
  'kids bag': 'Kiddies Fashion',
  'kids purse': 'Kiddies Fashion',
  'gift items / accessories': 'Gift Items',
  'gift items': 'Gift Items',
  skincare: 'Skincare',
  'skin care': 'Skincare',
  perfumes: 'Perfumes',
  'bags & purses': 'Bags & Purses',
  bags: 'Bags & Purses',
  purs: 'Bags & Purses',
  'human hair': 'Human Hair',
  'luxury hair': 'Luxury Hair',
  'u.s wears': 'U.S Wears',
  'us wears': 'U.S Wears',
  'adult female toys': 'Adult Toys',
};

const CATEGORY_DEFAULTS: Record<string, { image: string; description: string }> = {
  'Female Fashion': { image: 'https://images.unsplash.com/photo-1485968579169-a6e9dc7d3a84?w=600', description: 'Curated womenswear including gowns, tops, skirts, suits, and more' },
  'Mens Wear': { image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600', description: 'Premium menswear covering shirts, trousers, suits, and accessories' },
  'Kiddies Fashion': { image: 'https://images.unsplash.com/photo-1519234935892-7cb5d9e5b2e7?w=600', description: 'Beautifully crafted clothing and accessories for children' },
  Skincare: { image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600', description: 'Premium skincare, creams, serums, and beauty tools' },
  'Human Hair': { image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600', description: 'Premium 100% human hair extensions — soft and natural-looking' },
  'Bags & Purses': { image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600', description: 'Chic handbags, purses, sling bags, and designer bags' },
  Shoes: { image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600', description: 'Heels, flats, sneakers, boots, sandals, and luxury designer shoes' },
  Accessories: { image: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600', description: 'Earrings, belts, bangles, brooches, and finishing touches' },
  Perfumes: { image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600', description: 'Niche, designer, and luxury scents for men and women' },
  'Gift Items': { image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600', description: 'Thoughtful gifts and novelties for every occasion' },
  'Luxury Hair': { image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600', description: 'Exclusive luxury human hair pieces and wigs' },
  'U.S Wears': { image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600', description: 'American-style womenswear and menswear from US fashion labels' },
  'Adult Toys': { image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', description: 'Premium adult pleasure products. Age-restricted (18+).' },
};

const GENERIC_CATEGORY = { image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600', description: 'Explore our curated collection' };

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    let cancelled = false;

    async function loadCategories() {
      try {
        // The Category collection is curated but its names don't match the
        // product rows (e.g. category "Female Fashion" vs product category
        // "FEMALE WEARS"), so counts from /api/admin/categories are wrong.
        // Derive buckets straight from the live catalog instead.
        const res = await fetch(`${apiUrl}/api/store/products?limit=2000`);
        const data = await res.json();
        if (cancelled) return;
        const all: any[] = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];

        // Count only products the shop would actually show — same visibility
        // predicate as the products page (in stock + has an image).
        const isVisible = (p: any) =>
          (!Array.isArray(p.variants) || p.variants.length === 0 || p.variants.some((v: any) => (v.stock ?? 0) > 0)) &&
          (Boolean(p.thumbnail?.trim()) || (Array.isArray(p.images) && p.images.some((img: any) => img?.url?.trim())));

        const buckets = new Map<string, { count: number; raws: string[]; image: string }>();
        for (const p of all) {
          const raw = (p.category || '').trim();
          if (!raw || raw.toLowerCase() === 'other') continue;
          if (!isVisible(p)) continue;
          const bucket = CATEGORY_ALIASES[raw.toLowerCase()] || raw;
          const entry = buckets.get(bucket) || { count: 0, raws: [], image: '' };
          entry.count += 1;
          if (!entry.raws.includes(raw)) entry.raws.push(raw);
          if (!entry.image) {
            const img = Array.isArray(p.images) ? p.images.find((i: any) => i?.url) : null;
            if (img) entry.image = img.url;
          }
          buckets.set(bucket, entry);
        }

        const mapped: Category[] = [...buckets.entries()]
          .map(([name, b]) => {
            const d = CATEGORY_DEFAULTS[name] || GENERIC_CATEGORY;
            return {
              name,
              // Comma-joined raw names so the collection filter matches every
              // variant in the bucket (the products page ORs comma-separated
              // values, case-insensitively).
              handle: b.raws.join(','),
              count: b.count,
              image: b.image || d.image,
              description: d.description,
            };
          })
          // Most-stocked categories get the hero spots; ties break alphabetically.
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        setCategories(mapped);
      } catch {
        // Curated fallback so the section still renders if the API is down.
        setCategories(
          Object.entries(CATEGORY_DEFAULTS).map(([name, d]) => ({
            name,
            handle: name,
            count: 0,
            image: d.image,
            description: d.description,
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);
  // Show top 8 most populated categories in the hero grid
  const featured = categories.slice(0, 8);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-[#FAFAFA] overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Curated Collections
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">Featured Categories</h2>
            <p className="text-[#6B6B6B] text-base max-w-2xl mx-auto">
              Explore our exquisite range of luxury fashion, beauty, and lifestyle products
            </p>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-3xl bg-[#F5F5F0] ${i === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-square'}`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {featured.map((category, index) => {
              const isBig = index === 0;
              return (
                <ScrollReveal
                  key={category.name}
                  direction="up"
                  delay={index * 60}
                  className={isBig ? "col-span-2 row-span-2" : ""}
                >
                  <Link
                    href={`/products?collection=${encodeURIComponent(category.handle)}`}
                    className={`group relative block overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-shadow duration-500 ${
                      isBig ? "aspect-[16/9] md:aspect-[4/3]" : "aspect-square"
                    }`}
                  >
                    <SafeImage
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Gold shimmer on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#C9A84C]/0 via-[#C9A84C]/0 to-[#C9A84C]/0 group-hover:from-[#C9A84C]/20 group-hover:via-transparent group-hover:to-transparent transition-all duration-700" />

                    {/* Border glow */}
                    <div className="absolute inset-0 rounded-3xl ring-1 ring-white/10 group-hover:ring-[#C9A84C]/50 group-hover:shadow-[inset_0_0_40px_rgba(201,168,76,0.08)] transition-all duration-500" />

                    {/* Top badge */}
                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase text-white/90 bg-black/30 backdrop-blur-md rounded-full border border-white/10 group-hover:bg-[#C9A84C] group-hover:text-black group-hover:border-[#C9A84C] transition-all duration-300">
                        <span className="w-1 h-1 bg-current rounded-full" />
                        {category.count} items
                      </span>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
                      <div className="transform transition-transform duration-500 group-hover:-translate-y-1">
                        <div className="w-8 h-0.5 bg-[#C9A84C] mb-3 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                        <h3 className={`font-bold text-white group-hover:text-[#E8D48A] transition-colors duration-300 leading-tight mb-1 ${
                          isBig ? "text-xl md:text-2xl lg:text-3xl" : "text-base md:text-lg"
                        }`}>
                          {category.name}
                        </h3>
                        {isBig && (
                          <p className="text-white/60 text-sm line-clamp-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            {category.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-white/0 group-hover:text-[#C9A84C] transition-all duration-500 delay-100">
                          <span className="text-xs font-semibold tracking-wide">Shop Now</span>
                          <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* All categories pill strip */}
        {!loading && categories.length > 8 && (
          <ScrollReveal delay={300}>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {categories.slice(8).map(cat => (
                <Link
                  key={cat.name}
                  href={`/products?collection=${encodeURIComponent(cat.handle)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E5E5E5] text-[#1A1A1A] text-sm font-medium hover:border-[#C9A84C] hover:text-[#C9A84C] hover:shadow-md transition-all duration-300"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {cat.name}
                  <span className="text-xs text-[#9B9B9B]">({cat.count})</span>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal delay={400}>
          <div className="mt-10 md:mt-14 text-center">
            <Link
              href="/products"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#1A1A1A] text-white font-medium hover:bg-[#C9A84C] hover:text-black transition-all duration-300 shadow-lg shadow-[#1A1A1A]/20 hover:shadow-[#C9A84C]/30"
            >
              <span>View All Products</span>
              <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

const PRODUCT_PLACEHOLDER = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600';

// Broad category buckets for the filter tabs
const CATEGORY_BUCKETS: Record<string, string[]> = {
  Fashion:    ['Female Fashion', 'Mens Wear', 'Male Fashion', 'Turkey Wears', 'U.S Wears', 'China Wears', 'Abayas', 'Sport Wear', 'Children', 'Kiddies Fashion'],
  Shoes:      ['Shoes'],
  Bags:       ['Bags', 'Bags & Purses'],
  Accessories:['Accessories', 'Jewelry'],
  Beauty:     ['Beauty & Skincare', 'Skincare', 'Perfumes'],
  Hair:       ['Human Hair', 'Luxury Hair', 'Luxury Human Hair'],
  Gifts:      ['Gift Items', 'Adult Toys'],
};

function getBucket(category: string): string {
  // Normalize messy DB category strings ("FEMALE WEARS", "ACCESORIES"…) the
  // same way CategoriesSection does, then group into display buckets.
  const raw = (category || '').trim().toLowerCase();
  const aliased = CATEGORY_ALIASES[raw] || raw;
  for (const [bucket, cats] of Object.entries(CATEGORY_BUCKETS)) {
    if (cats.some(c => c.toLowerCase() === aliased.toLowerCase())) return bucket;
  }
  return category;
}

function FeaturedProductsSection() {
  const dispatch = useAppDispatch();
  const wishlistItems = useAppSelector((state) => state.wishlist.items);
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item._id)), [wishlistItems]);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [visibleCount, setVisibleCount] = useState(8);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Map<string, FlashDeal>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
        const res = await fetch(`${apiUrl}/api/store/products?limit=2000`);
        const data = await res.json();
        if (cancelled) return;
        const all: any[] = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
        const visible = all.filter((p: any) => {
          const hasImage = Boolean(p.thumbnail?.trim()) || (Array.isArray(p.images) && p.images.some((img: any) => img?.url?.trim()));
          const hasStock = !Array.isArray(p.variants) || p.variants.length === 0 || p.variants.some((v: any) => (v.stock ?? 0) > 0);
          return hasImage && hasStock;
        });
        setAllProducts(visible);

        // Pre-compute flash deals for all visible products
        const dealMap = new Map<string, FlashDeal>();
        for (const p of visible) {
          const deal = getFlashDeal(p);
          if (deal) dealMap.set(p._id, deal);
        }
        setDeals(dealMap);
      } catch {
        if (!cancelled) setAllProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, []);

  // Derive tabs from actual product data
  const tabs = useMemo(() => {
    const buckets = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) buckets.add(getBucket(p.category));
    });
    return ['All', ...Array.from(buckets).slice(0, 6)];
  }, [allProducts]);

  const filtered = useMemo(() => {
    const list = activeTab === 'All'
      ? allProducts
      : allProducts.filter((p) => getBucket(p.category || '') === activeTab);
    return [...list].sort((a: any, b: any) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (da !== db) return db - da;
      return (b._id || '').localeCompare(a._id || '');
    });
  }, [allProducts, activeTab]);

  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 8, filtered.length));
  }, [filtered.length]);

  const toggleWishlist = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    const id = product._id;
    if (wishlistIds.has(id)) {
      dispatch(removeFromWishlist(id));
    } else {
      const image = product.thumbnail || product.images?.[0]?.url || PRODUCT_PLACEHOLDER;
      dispatch(addToWishlist({
        _id: id,
        name: product.name,
        slug: product.slug,
        thumbnail: image,
        price: product.variants?.[0]?.price || 0,
      }));
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    const v = product.variants?.[0];
    if (!v) return;
    dispatch(addToCart({
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
        variants: product.variants,
      },
      quantity: 1,
      variant: {
        size: v.size,
        color: v.color,
        price: v.price,
      },
    }));
    setAddedId(product._id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const getTag = (product: any): { label: string; color: string } => {
    const tags = product.tags || [];
    if (tags.includes('bestseller')) return { label: 'Best Seller', color: 'bg-orange-500' };
    if (tags.includes('featured'))   return { label: 'Featured',    color: 'bg-[#C9A84C]' };
    if (tags.includes('sale'))       return { label: 'Sale',        color: 'bg-red-500' };
    return { label: 'New', color: 'bg-[#1A1A1A]' };
  };


  const getDealForProduct = (product: any): FlashDeal | null => {
    return deals.get(product._id) || null;
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
            <div>
              <p className="text-[#C9A84C] font-medium mb-2 tracking-widest uppercase text-sm">Curated Selection</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A]">Featured Products</h2>
              {!loading && (
                <p className="text-sm text-[#6B6B6B] mt-1">{filtered.length} products available</p>
              )}
            </div>
            <Link href="/products" className="hidden md:flex items-center gap-2 text-[#C9A84C] hover:gap-3 transition-all font-medium group text-sm">
              View All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Category tabs */}
        {!loading && tabs.length > 1 && (
          <ScrollReveal delay={100}>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-8 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none' }}>
              {tabs.map((tab) => {
                const count = tab === 'All'
                  ? allProducts.length
                  : allProducts.filter((p) => getBucket(p.category || '') === tab).length;
                return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setVisibleCount(8); }}
                  className={`flex-none snap-start px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[#1A1A1A] text-white shadow-md'
                      : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E5] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tab} <span className="text-[10px] opacity-60 ml-1">({count})</span>
                </button>
                );
              })}
            </div>
          </ScrollReveal>
        )}

        {/* Skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-2xl bg-[#F5F5F0] ${
                  i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-[3/4]'
                }`}
              />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-[#9B9B9B]">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No products in this category yet.</p>
          </div>
        ) : (
          /* Bento grid: first card is 2x2 hero, rest are 1x1 */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
            {displayed.map((product: any, index: number) => {
              const isHero = index === 0;
              const tag = getTag(product);
              const deal = getDealForProduct(product);
              const price = deal ? deal.price : (product.variants?.[0]?.price || 0);
              const compareAt = deal ? deal.compareAtPrice : (product.variants?.[0]?.compareAtPrice || 0);
              const discountPercent = deal ? deal.discountPercent : (compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0);
              const inWishlist = wishlistIds.has(product._id);
              const justAdded = addedId === product._id;
              const imgSrc = product.thumbnail || product.images?.[0]?.url || PRODUCT_PLACEHOLDER;
              const lowStock = deal ? deal.stock > 0 && deal.stock <= 10 : false;

              return (
                <ScrollReveal
                  key={product._id}
                  direction="up"
                  delay={index * 50}
                  className={isHero ? 'col-span-2 row-span-2' : ''}
                >
                  <Link href={`/products/${product.slug}`} className="group block h-full">
                    <div className="relative h-full rounded-2xl overflow-hidden bg-[#F5F5F0] border border-[#E5E5E5] hover:border-[#C9A84C]/50 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-0.5">
                      {/* Image */}
                      <div className={`relative overflow-hidden ${isHero ? 'aspect-square md:aspect-auto md:h-[360px]' : 'aspect-[3/4]'}`}>
                        <SafeImage
                          src={imgSrc}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                        {/* Tag + discount badges — flex layout */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full ${tag.color} text-[9px] font-bold text-white tracking-wider uppercase shadow`}>
                            {tag.label}
                          </span>
                          {discountPercent > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white tracking-wider uppercase shadow">
                              -{discountPercent}%
                            </span>
                          )}
                        </div>

                        {/* Wishlist — Redux */}
                        <button
                          onClick={(e) => toggleWishlist(e, product)}
                          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full transition-all duration-300 ${
                            inWishlist
                              ? 'bg-red-500 opacity-100'
                              : 'bg-white/80 backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 md:translate-y-1 md:group-hover:translate-y-0 hover:bg-red-50'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-white text-white' : 'text-[#6B6B6B] hover:text-red-500'}`} />
                        </button>

                        {/* Low stock indicator */}
                        {lowStock && (
                          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[8px] font-bold tracking-wider uppercase shadow">
                            Low Stock
                          </div>
                        )}

                        {/* Cart + Quick View */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0 transition-all duration-300">
                          <button
                            onClick={(e) => handleAddToCart(e, product)}
                            className={`flex-1 h-9 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors ${
                              justAdded
                                ? 'bg-green-500 text-white'
                                : 'bg-[#C9A84C] text-[#1A1A1A] hover:bg-[#E8D48A]'
                            }`}
                          >
                            <ShoppingBag className="h-3 w-3" />
                            {justAdded ? 'Added!' : 'Add to Cart'}
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewProduct(product); setIsQuickViewOpen(true); }}
                            className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-lg transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#1A1A1A]" />
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className={`p-3 ${isHero ? 'md:p-4' : ''}`}>
                        <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-0.5 truncate">{product.category}</p>
                        <h3 className={`font-semibold text-[#1A1A1A] group-hover:text-[#C9A84C] transition-colors leading-snug ${isHero ? 'text-sm md:text-base line-clamp-2' : 'text-xs md:text-sm line-clamp-1'}`}>
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-[#C9A84C] ${isHero ? 'text-base' : 'text-sm'}`}>
                              {formatPrice(price)}
                            </span>
                            {compareAt > price && (
                              <span className="text-[10px] text-[#C0C0C0] line-through">
                                {formatPrice(compareAt)}
                              </span>
                            )}
                            {deal && (
                              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                {deal.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          {(product.ratings?.avg || 0) > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-[#C9A84C] text-[#C9A84C]" />
                              <span className="text-[10px] text-[#9B9B9B]">{product.ratings.avg.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* Load More / View All */}
        <ScrollReveal delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {hasMore && (
              <button
                onClick={handleLoadMore}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#F5F5F0] text-[#1A1A1A] font-medium hover:bg-[#E5E5E5] hover:text-[#C9A84C] transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <span>Load More</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            <Link
              href={activeTab === 'All' ? '/products' : `/products?collection=${encodeURIComponent(activeTab)}`}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#1A1A1A] text-white font-medium hover:bg-[#C9A84C] hover:text-black transition-all duration-300 shadow-lg shadow-[#1A1A1A]/20 hover:shadow-[#C9A84C]/30"
            >
              <span>{activeTab === 'All' ? 'View All Products' : `Shop ${activeTab}`}</span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </section>
  );
}

function TrendingProductsSection() {
  const [products, setProducts] = useState<any[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
        const res = await fetch(`${apiUrl}/api/store/products/trending?limit=8`);
        const data = await res.json();
        const arr = Array.isArray(data.products) ? data.products : [];
        setProducts(arr);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-[#0F0F0F] overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold tracking-widest uppercase mb-4">
                <Flame className="h-3.5 w-3.5" />
                Hot Right Now
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">Trending Products</h2>
              <p className="text-white/40 text-sm md:text-base">Most loved by our customers this season</p>
            </div>
            <Link
              href="/products?sort=bestselling"
              className="flex items-center gap-2 text-[#C9A84C] hover:gap-3 transition-all font-medium group text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              See All Trends
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white/5 aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile: horizontal scroll */}
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {products.map((product, index) => (
                <div key={product._id} className="flex-none w-44 snap-start">
                  <TrendingCard
                    product={product}
                    rank={index + 1}
                    onQuickView={() => { setQuickViewProduct(product); setIsQuickViewOpen(true); }}
                  />
                </div>
              ))}
            </div>

            {/* Desktop: 4-column grid */}
            <div className="hidden md:grid grid-cols-4 gap-5">
              {products.map((product, index) => (
                <ScrollReveal key={product._id} direction="up" delay={index * 60}>
                  <TrendingCard
                    product={product}
                    rank={index + 1}
                    onQuickView={() => { setQuickViewProduct(product); setIsQuickViewOpen(true); }}
                  />
                </ScrollReveal>
              ))}
            </div>
          </>
        )}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </section>
  );
}

function TrendingCard({ product, rank, onQuickView }: { product: any; rank: number; onQuickView: () => void }) {
  const dispatch = useDispatch();
  const price = product.variants?.[0]?.price || 0;
  const image = product.images?.[0]?.url || product.thumbnail || PRODUCT_PLACEHOLDER;
  const isTopThree = rank <= 3;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addToCart({
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
        variants: product.variants,
      },
      quantity: 1,
      variant: product.variants?.[0] ? {
        size: product.variants[0].size,
        color: product.variants[0].color,
        price: product.variants[0].price,
      } : undefined,
    }));
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative rounded-2xl overflow-hidden bg-white/5 hover:bg-white/8 border border-white/5 hover:border-[#C9A84C]/30 transition-all duration-500 transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(201,168,76,0.15)]">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <SafeImage
            src={image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Rank badge */}
          <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
            rank === 1 ? 'bg-[#FFD700] text-black' :
            rank === 2 ? 'bg-[#C0C0C0] text-black' :
            rank === 3 ? 'bg-[#CD7F32] text-white' :
            'bg-white/20 backdrop-blur-sm text-white'
          }`}>
            #{rank}
          </div>

          {/* Hot badge for top 3 */}
          {isTopThree && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[10px] font-bold tracking-wide">
              <Flame className="h-2.5 w-2.5" />
              Hot
            </div>
          )}

          {/* Sold count */}
          {product.totalSold > 0 && (
            <div className="absolute top-3 left-10 text-white/80 text-[10px] font-medium bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {product.totalSold} sold
            </div>
          )}

          {/* Cart + Quick view — always visible on mobile, hover-reveal on desktop */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-y-2 md:group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              className="flex-1 h-8 rounded-full bg-[#C9A84C] text-black text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#E8D48A] transition-colors shadow-lg"
            >
              <ShoppingBag className="h-3 w-3" />
              Add
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(); }}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-[#C9A84C] border border-white/20 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">{product.category}</p>
          <h3 className="text-white text-sm font-semibold line-clamp-2 group-hover:text-[#E8D48A] transition-colors duration-300 leading-snug mb-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[#C9A84C] font-bold text-sm">
              ₦{price.toLocaleString('en-NG')}
            </span>
            {product.ratings?.avg > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-[#C9A84C] text-[#C9A84C]" />
                <span className="text-white/50 text-[10px]">{product.ratings.avg.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const avatarColors = [
  'bg-[#C9A84C]', 'bg-[#2563EB]', 'bg-[#16A34A]', 'bg-[#DC2626]', 'bg-[#9333EA]', 'bg-[#EA580C]',
];

function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<any[]>(fallbackTestimonials);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    fetch(`${apiUrl}/api/store/reviews?limit=6`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length >= 2) {
          setTestimonials(data.map((r: any) => ({
            name: r.user?.name || 'Customer',
            text: r.comment,
            rating: r.rating,
            product: r.product?.name,
            image: null, // real reviews have no avatar image
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-16 md:py-24 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-8 md:mb-12 lg:mb-16">
            <p className="text-[#C9A84C] font-medium mb-2 md:mb-3 tracking-widest uppercase text-sm">Testimonials</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A]">What Our Customers Say</h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 150}>
              <div className="bg-white p-5 md:p-6 lg:p-8 rounded-xl border border-[#E5E5E5] hover:border-[#C9A84C]/30 transition-all duration-500 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                  {testimonial.image ? (
                    <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-[#C9A84C]/30 flex-shrink-0">
                      <SafeImage src={testimonial.image} alt={testimonial.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg ${avatarColors[index % avatarColors.length]}`}>
                      {testimonial.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm md:text-base text-[#1A1A1A]">{testimonial.name}</p>
                    {testimonial.product && (
                      <p className="text-[10px] text-[#9B9B9B] mb-0.5">on {testimonial.product}</p>
                    )}
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 md:h-4 md:w-4 ${i < testimonial.rating ? 'fill-[#C9A84C] text-[#C9A84C]' : 'fill-[#E5E5E5] text-[#E5E5E5]'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[#6B6B6B] text-sm md:text-base leading-relaxed italic">"{testimonial.text}"</p>
                <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-[#E5E5E5] flex items-center gap-2 text-xs md:text-sm text-[#6B6B6B]">
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  Verified Purchase
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col bg-[#FAFAFA]">
      {/* SEO h1 — visually hidden. The hero's rotating headline is an h2 for
          animation reasons; this single descriptive h1 gives search engines
          a clear, keyword-rich topic for the homepage. */}
      <h1 className="sr-only">
        Kentaz Emporium — Premium Fashion, Lifestyle &amp; Wellness in Abuja, Nigeria
      </h1>
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <CategoriesSection />
      <FlashSaleSection />
      <FeaturedProductsSection />
      <TrendingProductsSection />
      <TestimonialsSection />
    </div>
  );
}