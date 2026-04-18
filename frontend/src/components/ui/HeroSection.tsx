"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState, useEffect, useRef, useCallback } from "react";

function FloatingParticle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  const duration = 4 + (size / 4);
  return (
    <div
      className="absolute rounded-full bg-[#C9A84C]/30 animate-float-gentle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

interface HeroSlide {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  order: number;
}

const defaultSlides: HeroSlide[] = [
  {
    _id: 'default-1',
    title: "Luxury.",
    subtitle: "Lifestyle. Wellness.",
    description: "Elevate your presence with our curated collection of premium fashion, luxury hair, and skincare.",
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80",
    ctaText: "Shop Now",
    ctaLink: "/products",
    isActive: true,
    order: 0,
  },
  {
    _id: 'default-2',
    title: "Luxury. Human Hair.",
    subtitle: "Collections.",
    description: "100% authentic human hair wigs and extensions. Natural look, effortless style.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=80",
    ctaText: "Shop Hair",
    ctaLink: "/products",
    isActive: true,
    order: 1,
  },
  {
    _id: 'default-3',
    title: "Mental Health & Therapy.",
    subtitle: "Consultation.",
    description: "Professional counseling services for your mental wellness. Book your session today.",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80",
    ctaText: "Book Session",
    ctaLink: "/services",
    isActive: true,
    order: 2,
  },
];

export function HeroSection() {
  const [heroes, setHeroes] = useState<HeroSlide[]>(defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function fetchHeroes() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/heroes`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setHeroes(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch heroes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeroes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroes.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroes.length) % heroes.length);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(nextSlide, 7000);
  }, [nextSlide]);

  useEffect(() => {
    if (!isHovering) {
      startAutoPlay();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay, isHovering]);

  const slide = heroes[currentSlide];
  const [particles, setParticles] = useState<{id: number; delay: number; x: number; y: number; size: number}[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 16,
    }));
    setParticles(newParticles);
  }, []);

  // Split title into words for staggered animation
  const titleWords = slide.title.split(' ');

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${mousePos.x * 0.015}px, ${mousePos.y * 0.015}px)`,
        }}
      >
        {heroes.map((heroSlide, index) => (
          <div
            key={heroSlide._id}
            className={`absolute inset-0 transition-all duration-[1500ms] ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${heroSlide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "brightness(0.5) saturate(1.1)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a]/95 via-[#0a0a0a]/60 to-[#0a0a0a]/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0a_100%)]" />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <FloatingParticle key={p.id} delay={p.delay} x={p.x} y={p.y} size={p.size} />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-5xl mx-auto text-center">
            {/* Animated Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-bold leading-[0.9] mb-6 md:mb-8 tracking-tight">
              <div className="overflow-hidden">
                {titleWords.map((word, idx) => (
                  <span
                    key={idx}
                    className={`inline-block mr-4 md:mr-6 transition-all duration-1000 ${
                      isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
                    }`}
                    style={{ transitionDelay: `${idx * 150 + 100}ms` }}
                  >
                    <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                      {word}
                    </span>
                  </span>
                ))}
              </div>
            </h1>

            {/* Subtitle */}
            {slide.subtitle && (
              <div
                className={`mb-6 transition-all duration-1000 ${
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: "400ms" }}
              >
                <p className="text-lg md:text-xl lg:text-2xl text-[#C9A84C] font-medium tracking-wide">
                  {slide.subtitle}
                </p>
              </div>
            )}

            {/* Description */}
            {slide.description && (
              <p
                className={`text-base md:text-lg lg:text-xl text-white/50 max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed transition-all duration-1000 ${
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: "550ms" }}
              >
                {slide.description}
              </p>
            )}

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 transition-all duration-1000 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "700ms" }}
            >
              <Link href={slide.ctaLink} className="group">
                <button
                  className="relative overflow-hidden bg-[#C9A84C] text-[#0a0a0a] font-bold text-base md:text-lg px-10 md:px-14 py-5 md:py-6 rounded-full shadow-2xl shadow-[#C9A84C]/30 transition-all duration-500 transform group-hover:-translate-y-1 group-hover:shadow-[#C9A84C]/50"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {slide.ctaText}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#E8D48A] to-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </Link>
              <Link href="/services" className="group">
                <button className="relative overflow-hidden border-2 border-white/20 text-white font-semibold text-base md:text-lg px-10 md:px-14 py-5 md:py-6 rounded-full transition-all duration-500 hover:border-[#C9A84C] hover:text-[#C9A84C] hover:bg-[#C9A84C]/5">
                  <span className="flex items-center gap-3">
                    Explore Services
                    <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                  </span>
                </button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div
              className={`mt-16 md:mt-24 transition-all duration-1000 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: "900ms" }}
            >
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {[
                  { icon: Star, text: "4.9 Rating" },
                  { icon: Sparkles, text: "Premium Quality" },
                  { icon: ArrowRight, text: "Free Shipping" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-white/40 text-xs md:text-sm tracking-widest uppercase">
                    <item.icon className="h-4 w-4 text-[#C9A84C]" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => {
          prevSlide();
          startAutoPlay();
        }}
        className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        }`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-white" />
      </button>

      <button
        onClick={() => {
          nextSlide();
          startAutoPlay();
        }}
        className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        }`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {heroes.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              goToSlide(index);
              startAutoPlay();
            }}
            className={`group relative h-2 rounded-full transition-all duration-700 ${
              index === currentSlide ? "w-10 bg-[#C9A84C]" : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === currentSlide && (
              <div className="absolute inset-0 rounded-full bg-[#E8D48A] animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 md:h-48 bg-gradient-to-t from-[#FAFAFA] to-transparent z-20" />
    </section>
  );
}