"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

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
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
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
              setHeroes(data.filter((slide: HeroSlide) => slide.isActive !== false).sort((a: HeroSlide, b: HeroSlide) => a.order - b.order));
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
    if (heroes.length < 2 || isHovering || isPaused || reducedMotion) return;
    intervalRef.current = setInterval(nextSlide, 7000);
  }, [nextSlide, heroes.length, isHovering, isPaused, reducedMotion]);

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
      aria-label="Featured collections"
      aria-roledescription="carousel"
      onFocusCapture={() => setIsHovering(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsHovering(false); }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={(event) => setIsHovering(event.currentTarget.contains(document.activeElement))}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0">
        {heroes.map((heroSlide, index) => {
          const content = (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${heroSlide.image})`,
                backgroundSize: heroSlide.imageFit || "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          );
          const isCurrent = index === currentSlide;
          const href = heroSlide.ctaLink?.trim();
          const isExternal = /^https?:\/\//i.test(href || "");
          return (
            <div
              key={heroSlide._id}
              role={isCurrent ? "link" : undefined}
              aria-label={heroSlide.title}
              aria-hidden={!isCurrent}
              className={`absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${
                isCurrent
                  ? "opacity-100 z-10 pointer-events-auto"
                  : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {isCurrent && href ? (
                isExternal ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="absolute inset-0 block" aria-label={`${heroSlide.title} — ${heroSlide.ctaText}`}>
                    {content}
                  </a>
                ) : (
                  <Link href={href} className="absolute inset-0 block" aria-label={`${heroSlide.title} — ${heroSlide.ctaText}`}>
                    {content}
                  </Link>
                )
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {heroes.length > 1 && <>
      <button
        onClick={() => {
          prevSlide();
          startAutoPlay();
        }}
        className={`absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#0a0a0a]/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-70 translate-x-0 md:opacity-100"
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
        className={`absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#0a0a0a]/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-70 translate-x-0 md:opacity-100"
        }`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 text-white" />
      </button>

      <button onClick={() => setIsPaused(value => !value)} aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'} aria-pressed={isPaused} className="absolute bottom-4 right-4 z-30 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center" hidden={reducedMotion}>
        {isPaused ? <Play size={16} /> : <Pause size={16} />}
      </button>
      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex max-w-[60%] overflow-x-auto items-center gap-2">
        {heroes.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              goToSlide(index);
              startAutoPlay();
            }}
            className="group relative w-11 h-11 shrink-0 flex items-center justify-center"
            aria-current={index === currentSlide ? 'true' : undefined}
            aria-label={`Go to slide ${index + 1}`}
          >
            <span className={`block h-1.5 w-6 rounded-full ${index === currentSlide ? 'bg-[#E8D48A]' : 'bg-white/60'}`} />
          </button>
        ))}
      </div>
      </>}
    </section>
  );
}
