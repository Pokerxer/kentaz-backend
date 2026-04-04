"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Shield, Brain, Mic, Heart, Eye, Sparkles, Flame, TrendingUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HeroSection } from "@/components/ui/HeroSection";
import { QuickViewModal } from "@/components/shop/QuickViewModal";
import { useState, useEffect, useRef } from "react";

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

const stats = [
  { value: "500+", label: "Happy Customers" },
  { value: "100+", label: "Products" },
  { value: "Abuja", label: "Nigeria" },
  { value: "4.8", label: "Average Rating" },
];

const testimonials = [
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
                    <Image
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
  { name: "Female Fashion", handle: "Female Fashion", count: 18, image: "https://images.unsplash.com/photo-1485968579169-a6e9dc7d3a84?w=600", description: "Elegant dresses, gowns, and contemporary styles for her" },
  { name: "Male Fashion", handle: "Male Fashion", count: 12, image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600", description: "Premium suits, casuals, and accessories for the modern gentleman" },
  { name: "Luxury Hair", handle: "Luxury Hair", count: 8, image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600", description: "Premium virgin hair extensions and luxury wigs" },
  { name: "Skincare", handle: "Skincare", count: 15, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", description: "Luxury skincare and beauty products for radiant skin" },
  { name: "Bags & Purses", handle: "Bags & Purses", count: 10, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600", description: "Designer bags and statement pieces" },
  { name: "Shoes", handle: "Shoes", count: 14, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600", description: "Handcrafted footwear for every occasion" },
  { name: "Accessories", handle: "Accessories", count: 20, image: "https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600", description: "Watches, jewelry, and premium accessories" },
  { name: "Perfumes", handle: "Perfumes", count: 9, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", description: "Signature fragrances that leave a lasting impression" },
];

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    fetch(`${apiUrl}/api/store/products/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Show top 6 most populated categories
  const featured = categories.slice(0, 6);

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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-3xl bg-[#F5F5F0] ${i === 0 ? 'md:col-span-2 md:row-span-2 aspect-[4/3]' : 'aspect-square'}`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {featured.map((category, index) => {
              const isBig = index === 0;
              return (
                <ScrollReveal
                  key={category.name}
                  direction="up"
                  delay={index * 70}
                  className={isBig ? "col-span-2 md:col-span-2 md:row-span-2" : ""}
                >
                  <Link
                    href={`/products?collection=${encodeURIComponent(category.handle)}`}
                    className={`group relative block overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-shadow duration-500 ${
                      isBig ? "aspect-[16/9] md:aspect-[4/3]" : "aspect-square"
                    }`}
                  >
                    <Image
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
        {!loading && categories.length > 6 && (
          <ScrollReveal delay={300}>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {categories.slice(6).map(cat => (
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

function FeaturedProductsSection() {
  const [products, setProducts] = useState<any[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
        // Fetch products explicitly marked as featured
        const res = await fetch(`${apiUrl}/api/store/products?featured=true&limit=6`);
        const data = await res.json();
        let arr = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
        // Fallback to latest products if no featured ones are set
        if (arr.length === 0) {
          const fallback = await fetch(`${apiUrl}/api/store/products?limit=6`);
          const fd = await fallback.json();
          arr = Array.isArray(fd) ? fd : (Array.isArray(fd.products) ? fd.products : []);
        }
        setProducts(arr);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const getTag = (product: Product): string => {
    if (product.tags?.some(t => t === 'bestseller')) return 'Best Seller';
    if (product.tags?.some(t => t === 'featured')) return 'Featured';
    return 'New';
  };

  const getRating = (product: Product): number => product.ratings?.avg || 4.5;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-12 lg:mb-16">
            <div>
              <p className="text-[#C9A84C] font-medium mb-2 md:mb-3 tracking-widest uppercase text-sm">Curated Selection</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A]">Featured Products</h2>
            </div>
            <Link href="/products" className="flex items-center gap-2 text-[#C9A84C] hover:gap-3 transition-all font-medium group">
              View All <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-[#F5F5F0] rounded-2xl" />
                <div className="mt-4 h-4 bg-[#F5F5F0] rounded w-3/4" />
                <div className="mt-2 h-4 bg-[#F5F5F0] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {products.slice(0, 6).map((product, index) => (
              <ScrollReveal key={product._id} direction="up" delay={index * 100}>
                <Link
                  href={`/products/${product.slug}`}
                  className="group block"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-white border border-[#E5E5E5] hover:border-[#C9A84C]/50 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                    <div className="relative aspect-[3/4] md:aspect-square overflow-hidden bg-[#F5F5F0]">
                      <Image
                        src={product.thumbnail || product.images?.[0]?.url || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <span className="absolute top-2 left-2 md:top-4 md:left-4 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-[#C9A84C] text-[8px] md:text-[10px] font-bold text-white tracking-wider uppercase">
                        {getTag(product)}
                      </span>

                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="absolute top-2 right-2 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hover:bg-[#C9A84C] hover:text-white"
                      >
                        <Heart className="h-4 w-4 md:h-5 md:w-5" />
                      </button>

                      <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewProduct(product); setIsQuickViewOpen(true); }}
                          className="w-full py-2 md:py-3 rounded-lg bg-[#C9A84C] text-[#1A1A1A] font-semibold text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 hover:bg-[#E8D48A] transition-colors shadow-lg"
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden md:inline">Quick View</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 md:p-5">
                      <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                        <h3 className="font-semibold text-xs md:text-base lg:text-lg text-[#1A1A1A] group-hover:text-[#C9A84C] transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-0.5 mb-2 md:mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-2.5 w-2.5 md:h-3.5 md:w-3.5 ${i < Math.round(getRating(product)) ? 'fill-[#C9A84C] text-[#C9A84C]' : 'fill-[#E5E5E5] text-[#E5E5E5]'}`} />
                        ))}
                        <span className="ml-1 text-[10px] md:text-xs text-[#6B6B6B]">({product.ratings?.count || 0})</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1 md:gap-2">
                          <span className="text-sm md:text-lg lg:text-xl font-bold text-[#C9A84C]">
                            {formatPrice(product.variants?.[0]?.price || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
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
  const price = product.variants?.[0]?.price || 0;
  const image = product.images?.[0]?.url || '/placeholder.jpg';
  const isTopThree = rank <= 3;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative rounded-2xl overflow-hidden bg-white/5 hover:bg-white/8 border border-white/5 hover:border-[#C9A84C]/30 transition-all duration-500 transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(201,168,76,0.15)]">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
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
            <div className="absolute bottom-3 left-3 text-white/70 text-[10px] font-medium">
              {product.totalSold} sold
            </div>
          )}

          {/* Quick view */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(); }}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#C9A84C] border border-white/20"
          >
            <Eye className="h-3.5 w-3.5 text-white" />
          </button>
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

function TestimonialsSection() {
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
            <ScrollReveal key={testimonial.name} direction="up" delay={index * 150}>
              <div className="bg-white p-5 md:p-6 lg:p-8 rounded-xl border border-[#E5E5E5] hover:border-[#C9A84C]/30 transition-all duration-500 shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-[#C9A84C]/30 group-hover:border-[#C9A84C]/60 transition-colors">
                    <Image src={testimonial.image} alt={testimonial.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-sm md:text-base text-[#1A1A1A]">{testimonial.name}</p>
                    <div className="flex gap-0.5">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-[#C9A84C] text-[#C9A84C]" />
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