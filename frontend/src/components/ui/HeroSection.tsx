"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState, useEffect, useRef, useCallback } from "react";

const heroSlides = [
  {
    id: 1,
    badge: "New Season",
    title: "Luxury.",
    titleAccent: "Lifestyle.",
    titleSecond: "Wellness.",
    description: "Elevate your presence with our curated collection of premium fashion, luxury hair, and skincare.",
    cta: { text: "Shop Now", href: "/products" },
    secondaryCta: { text: "Explore Services", href: "/services" },
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80",
  },
  {
    id: 2,
    badge: "Premium Hair",
    title: "Luxury.",
    titleAccent: "Human Hair.",
    titleSecond: "Collections.",
    description: "100% authentic human hair wigs and extensions. Natural look, effortless style.",
    cta: { text: "Shop Hair", href: "/products?collection=human-hair" },
    secondaryCta: { text: "View All", href: "/products" },
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=80",
  },
  {
    id: 3,
    badge: "Wellness",
    title: "Mental Health",
    titleAccent: "& Therapy.",
    titleSecond: "Consultation.",
    description: "Professional counseling services for your mental wellness. Book your session today.",
    cta: { text: "Book Session", href: "/services" },
    secondaryCta: { text: "Learn More", href: "/services#therapy" },
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80",
  },
];

function FloatingParticle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <div
      className="absolute rounded-full bg-[#C9A84C]/20 animate-float-gentle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${4 + Math.random() * 4}s`,
      }}
    />
  );
}

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

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
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
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

  const slide = heroSlides[currentSlide];

  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 5,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 4 + Math.random() * 12,
  }));

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        className="absolute inset-0 transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${mousePos.x * 0.02}px, ${mousePos.y * 0.02}px)`,
        }}
      >
        {heroSlides.map((heroSlide, index) => (
          <div
            key={heroSlide.id}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${heroSlide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "brightness(0.6)",
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a]/90 via-[#0a0a0a]/70 to-[#0a0a0a]/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/60" />

      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <FloatingParticle key={p.id} delay={p.delay} x={p.x} y={p.y} size={p.size} />
        ))}
      </div>

      <div className="relative z-20 min-h-screen flex items-center">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className={`inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 backdrop-blur-sm mb-8 transition-all duration-700 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs font-medium tracking-widest uppercase">Abuja, Nigeria</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs font-medium tracking-widest uppercase">{slide.badge}</span>
            </div>

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] font-bold leading-[0.85] mb-8 md:mb-10">
              <span
                className={`block text-white transition-all duration-1000 ${
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: "150ms" }}
              >
                {slide.title}
              </span>
              <span
                className={`block transition-all duration-1000 ${
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: "250ms" }}
              >
                <span className="animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-[length:200%_100%] bg-clip-text text-transparent">
                  {slide.titleAccent}
                </span>
              </span>
              <span
                className={`block text-white/70 transition-all duration-1000 ${
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: "350ms" }}
              >
                {slide.titleSecond}
              </span>
            </h1>

            <p
              className={`text-base md:text-lg lg:text-xl text-white/60 max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed transition-all duration-1000 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "500ms" }}
            >
              {slide.description}
            </p>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "650ms" }}
            >
              <Link href={slide.cta.href} className="group">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] font-semibold gap-3 text-base md:text-lg px-10 md:px-14 py-5 md:py-6 shadow-2xl shadow-[#C9A84C]/30 hover:shadow-[#C9A84C]/50 transition-all duration-500 transform group-hover:-translate-y-1"
                >
                  {slide.cta.text}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href={slide.secondaryCta.href} className="group">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-white/20 hover:border-[#C9A84C] text-white hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 gap-3 text-base md:text-lg px-10 md:px-14 py-5 md:py-6 transition-all duration-500"
                >
                  {slide.secondaryCta.text}
                  <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
                </Button>
              </Link>
            </div>

            <div
              className={`mt-16 md:mt-20 transition-all duration-1000 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: "800ms" }}
            >
              <div className="flex items-center justify-center gap-8 text-white/40 text-xs tracking-widest uppercase">
                <span className="flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-white/20" />
                  Free Shipping Nationwide
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-white/20" />
                  Secure Payment
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-white/20" />
                  Premium Quality
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          prevSlide();
          startAutoPlay();
        }}
        className={`absolute left-6 md:left-10 top-1/2 -translate-y-1/2 z-30 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0a0a0a]/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/30 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        }`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7 text-white" />
      </button>

      <button
        onClick={() => {
          nextSlide();
          startAutoPlay();
        }}
        className={`absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-30 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0a0a0a]/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#C9A84C]/30 hover:border-[#C9A84C]/50 transition-all duration-500 ${
          isHovering ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        }`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 md:h-7 md:w-7 text-white" />
      </button>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              goToSlide(index);
              startAutoPlay();
            }}
            className={`group h-2 rounded-full transition-all duration-700 ${
              index === currentSlide
                ? "w-12 bg-[#C9A84C]"
                : "w-2 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#FAFAFA] to-transparent z-20" />
    </section>
  );
}