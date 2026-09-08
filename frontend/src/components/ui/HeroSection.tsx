"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface HeroSlide {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  imageFit?: "cover" | "contain";
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  order: number;
}

export function HeroSection() {
  const [heroes, setHeroes] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchHeroes() {
      const bases = [process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'];
      for (const base of new Set(bases)) {
        try {
          const res = await fetch(`${base}/api/heroes`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setHeroes(data);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Try the next configured backend.
        }
      }
      setIsLoading(false);
    }
    fetchHeroes();
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => heroes.length > 1 ? (prev + 1) % heroes.length : 0);
  }, [heroes.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => heroes.length > 1 ? (prev - 1 + heroes.length) % heroes.length : 0);
  }, [heroes.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (heroes.length < 2 || isHovering) return;
    intervalRef.current = setInterval(nextSlide, 7000);
  }, [nextSlide, heroes.length, isHovering]);

  useEffect(() => {
    if (heroes.length < 2) return;
    if (!isHovering) {
      startAutoPlay();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay, isHovering, heroes.length]);

  if (isLoading) {
    return <section className="relative w-full aspect-[2/1] max-h-[80vh] bg-[#0a0a0a]" aria-label="Loading hero banners" />;
  }

  if (heroes.length === 0) return null;

  return (
    <section
      className="relative w-full aspect-[2/1] max-h-[80vh] overflow-hidden bg-[#0a0a0a]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0">
        {heroes.map((heroSlide, index) => (
          <div
            key={heroSlide._id}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${heroSlide.image})`,
                backgroundSize: heroSlide.imageFit || "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {heroes.length > 1 && <>
      <button
        onClick={() => {
          prevSlide();
          startAutoPlay();
        }}
        className={`absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#0a0a0a]/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-70 translate-x-0 md:opacity-0 md:-translate-x-3"
        }`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 text-white" />
      </button>

      <button
        onClick={() => {
          nextSlide();
          startAutoPlay();
        }}
        className={`absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#0a0a0a]/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-70 translate-x-0 md:opacity-0 md:translate-x-3"
        }`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 text-white" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {heroes.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              goToSlide(index);
              startAutoPlay();
            }}
            className={`group relative h-1.5 rounded-full transition-all duration-700 ${
              index === currentSlide ? "w-8 bg-[#C9A84C]" : "w-1.5 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === currentSlide && (
              <div className="absolute inset-0 rounded-full bg-[#E8D48A] animate-pulse" />
            )}
          </button>
        ))}
      </div>
      </>}
    </section>
  );
}
