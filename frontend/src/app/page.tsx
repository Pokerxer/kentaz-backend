"use client";

import Link from "next/link";
import SafeImage from '@/components/ui/SafeImage';
import { ArrowRight, Star, Shield, Brain, Mic, Heart, Eye, Sparkles, Flame, TrendingUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HeroSection } from "@/components/ui/HeroSection";
import { QuickViewModal } from "@/components/shop/QuickViewModal";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { addToCart } from "@/store/cartSlice";

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

const defaultCategories = [
  { name: "Female Fashion",    handle: "Female Fashion",    count: 0, image: "https://images.unsplash.com/photo-1485968579169-a6e9dc7d3a84?w=600", description: "Curated womenswear including gowns, tops, skirts, suits, and more" },
  { name: "Mens Wear",         handle: "Mens Wear",         count: 0, image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600", description: "Premium menswear covering shirts, trousers, suits, and accessories" },
  { name: "Male Fashion",      handle: "Male Fashion",      count: 0, image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600", description: "Stylish casual and contemporary fashion pieces for men" },
  { name: "Turkey Wears",      handle: "Turkey Wears",      count: 0, image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600", description: "Exquisite Turkish-crafted gowns, abayas, kaftans, and co-ord sets" },
  { name: "U.S Wears",         handle: "U.S Wears",         count: 0, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600", description: "American-style womenswear and menswear from US fashion labels" },
  { name: "China Wears",       handle: "China Wears",       count: 0, image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4e41?w=600", description: "Sophisticated Chinese-made blazers, pant suits, and leather jackets" },
  { name: "Abayas",            handle: "Abayas",            count: 0, image: "https://images.unsplash.com/photo-1626436819054-14e0c4deaef8?w=600", description: "Elegant and modest abayas in a range of beautiful styles" },
  { name: "Sport Wear",        handle: "Sport Wear",        count: 0, image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600", description: "High-performance activewear sets and jumpsuits for the active woman" },
  { name: "Children",          handle: "Children",          count: 0, image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600", description: "Beautifully crafted clothing and accessories for children" },
  { name: "Kiddies Fashion",   handle: "Kiddies Fashion",   count: 0, image: "https://images.unsplash.com/photo-1519234935892-7cb5d9e5b2e7?w=600", description: "Playful and stylish fashion for kids" },
  { name: "Shoes",             handle: "Shoes",             count: 0, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600", description: "Heels, flats, sneakers, boots, sandals, and luxury designer shoes" },
  { name: "Bags",              handle: "Bags",              count: 0, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600", description: "Chic handbags, purses, sling bags, and designer bags" },
  { name: "Bags & Purses",     handle: "Bags & Purses",     count: 0, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600", description: "Statement purses and everyday bags for the fashion-forward woman" },
  { name: "Accessories",       handle: "Accessories",       count: 0, image: "https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600", description: "Earrings, belts, bangles, brooches, and finishing touches" },
  { name: "Jewelry",           handle: "Jewelry",           count: 0, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600", description: "Stunning rings, bangles, necklaces, and full jewelry sets" },
  { name: "Beauty & Skincare", handle: "Beauty & Skincare", count: 0, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600", description: "Premium skincare, creams, serums, and beauty tools" },
  { name: "Skincare",          handle: "Skincare",          count: 0, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", description: "Targeted skincare solutions for glowing skin" },
  { name: "Human Hair",        handle: "Human Hair",        count: 0, image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600", description: "Premium 100% human hair extensions — soft and natural-looking" },
  { name: "Luxury Hair",       handle: "Luxury Hair",       count: 0, image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600", description: "Exclusive luxury human hair pieces and wigs" },
  { name: "Perfumes",          handle: "Perfumes",          count: 0, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", description: "Niche, designer, and luxury scents for men and women" },
  { name: "Gift Items",        handle: "Gift Items",        count: 0, image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600", description: "Thoughtful gifts and novelties for every occasion" },
  { name: "Adult Toys",        handle: "Adult Toys",        count: 0, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600", description: "Premium adult pleasure products. Age-restricted (18+)." },
];

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    const defaultMap = Object.fromEntries(defaultCategories.map(c => [c.name, c]));
    fetch(`${apiUrl}/api/admin/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data
            .filter((c: any) => c.name && c.name !== 'Other')
            .map((c: any) => {
              const fallback = defaultMap[c.name];
              return {
                name: c.name,
                handle: c.name,
                count: c.count || 0,
                image: c.image || fallback?.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
                description: c.description || fallback?.description || 'Explore our collection',
              };
            });
          // Sort by product count so the most-stocked categories get the hero spots
          setCategories([...mapped].sort((a, b) => b.count - a.count));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
  for (const [bucket, cats] of Object.entries(CATEGORY_BUCKETS)) {
    if (cats.includes(category)) return bucket;
  }
  return category;
}

function FeaturedProductsSection() {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [addedId, setAddedId] = useState<string | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kentaz_wishlist') || '[]');
      setWishlist(new Set(saved));
    } catch {}

    async function fetchProducts() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
        const res = await fetch(`${apiUrl}/api/store/products?limit=120`);
        const data = await res.json();
        const all: any[] = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
        const visible = all.filter(p => {
          const hasImage = (p.images && p.images.length > 0) || p.thumbnail;
          const hasStock = p.variants && p.variants.length > 0
            ? p.variants.some((v: any) => (v.stock ?? 0) > 0)
            : true;
          return hasImage && hasStock;
        });
        setAllProducts(visible);
      } catch {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Derive tabs from actual product data
  const tabs = useMemo(() => {
    const buckets = new Set<string>();
    allProducts.forEach(p => { if (p.category) buckets.add(getBucket(p.category)); });
    return ['All', ...Array.from(buckets).slice(0, 6)];
  }, [allProducts]);

  // Filter products for the active tab (show 9 at a time for bento)
  const displayed = useMemo(() => {
    if (activeTab === 'All') return allProducts.slice(0, 9);
    return allProducts
      .filter(p => getBucket(p.category) === activeTab)
      .slice(0, 9);
  }, [allProducts, activeTab]);

  const toggleWishlist = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('kentaz_wishlist', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
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

  const getDiscount = (product: any): number | null => {
    const v = product.variants?.[0];
    if (!v?.costPrice || !v?.price || v.costPrice >= v.price) return null;
    return Math.round(((v.price - v.costPrice) / v.price) * 100);
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
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-none snap-start px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[#1A1A1A] text-white shadow-md'
                      : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#E5E5E5] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
            {[...Array(9)].map((_, i) => (
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
          /* Bento grid: first card is 2×2 hero, rest are 1×1 */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
            {displayed.map((product, index) => {
              const isHero = index === 0;
              const tag = getTag(product);
              const discount = getDiscount(product);
              const inWishlist = wishlist.has(product._id);
              const justAdded = addedId === product._id;
              const imgSrc = product.thumbnail || product.images?.[0]?.url || PRODUCT_PLACEHOLDER;
              const price = product.variants?.[0]?.price || 0;

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

                        {/* Tag badge */}
                        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full ${tag.color} text-[9px] font-bold text-white tracking-wider uppercase shadow`}>
                          {tag.label}
                        </span>

                        {/* Discount badge */}
                        {discount && (
                          <span className="absolute top-2.5 left-[70px] px-2 py-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white tracking-wider uppercase shadow">
                            -{discount}%
                          </span>
                        )}

                        {/* Wishlist */}
                        <button
                          onClick={(e) => toggleWishlist(e, product._id)}
                          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow ${
                            inWishlist
                              ? 'bg-red-500 opacity-100'
                              : 'bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 hover:bg-red-50'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-white text-white' : 'text-[#6B6B6B] hover:text-red-500'}`} />
                        </button>

                        {/* Cart + Quick View — shown on hover */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
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
                            {product.variants?.[0]?.costPrice > price && (
                              <span className="text-[10px] text-[#C0C0C0] line-through">
                                {formatPrice(product.variants[0].costPrice)}
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

        {/* View All CTA */}
        <ScrollReveal delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
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

          {/* Cart + Quick view */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
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
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <CategoriesSection />
      <FeaturedProductsSection />
      <TrendingProductsSection />
      <TestimonialsSection />
    </div>
  );
}