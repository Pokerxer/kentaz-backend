'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Zap, ArrowRight, Clock, CalendarClock, ShoppingBag, Sparkles } from 'lucide-react';
import { FlashSaleCard } from '@/components/shop/FlashSaleCard';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import {
  FLASH_SALE,
  getActiveDiscounts,
  getFlashDeals,
  getFlashSaleSession,
  getNextFlashSaleSession,
  sortDealsForDisplay,
  useFlashCountdown,
} from '@/lib/flashSale';
import type { FlashDeal, FlashDiscount, FlashSaleSession } from '@/lib/flashSale';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function TimeBox({ value, label, big = false }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center ${
          big ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'
        }`}
      >
        <span
          className={`font-bold tabular-nums animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent ${
            big ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
          }`}
        >
          {value}
        </span>
      </div>
      <span className="mt-2 text-[10px] uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

function Hero({ session, deals, countdown }: { session: FlashSaleSession; deals: FlashDeal[]; countdown: ReturnType<typeof useFlashCountdown> }) {
  const bestDeal = deals.length > 0 ? deals.reduce((a, b) => (b.discountPercent > a.discountPercent ? b : a)) : null;

  return (
    <section className="relative bg-[#121212] overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-[#C9A84C]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] bg-red-600/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-16 md:py-24 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold tracking-widest uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Live Session
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            <span className="animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
              {session.title}
            </span>
          </h1>
          <p className="text-white/50 text-sm md:text-lg max-w-xl mx-auto mb-10">{session.tagline}</p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 md:gap-5 mb-10">
            <TimeBox value={countdown ? pad(countdown.days) : '--'} label="Days" big />
            <span className="text-3xl md:text-4xl font-bold text-white/20">:</span>
            <TimeBox value={countdown ? pad(countdown.hours) : '--'} label="Hours" big />
            <span className="text-3xl md:text-4xl font-bold text-white/20">:</span>
            <TimeBox value={countdown ? pad(countdown.minutes) : '--'} label="Mins" big />
            <span className="text-3xl md:text-4xl font-bold text-white/20">:</span>
            <TimeBox value={countdown ? pad(countdown.seconds) : '--'} label="Secs" big />
          </div>

          {/* Session stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-lg mx-auto mb-10">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-2xl md:text-3xl font-bold text-[#C9A84C]">{deals.length}</p>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 mt-1">Deals Live</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-2xl md:text-3xl font-bold text-red-400">{bestDeal ? `-${bestDeal.discountPercent}%` : '--'}</p>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 mt-1">Top Markdown</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-2xl md:text-3xl font-bold text-white">Today</p>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 mt-1">Ends Tonight</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#deals"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] text-[#1A1A1A] font-semibold hover:shadow-[0_8px_30px_rgba(201,168,76,0.35)] transition-all duration-300"
            >
              <Zap className="h-5 w-5 fill-current" />
              Shop the Deals
            </a>
            <Link
              href="/products"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-white/15 text-white font-medium hover:border-[#C9A84C]/60 hover:text-[#E8D48A] transition-all duration-300"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse Full Collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ nextSession, countdown }: { nextSession: FlashSaleSession; countdown: ReturnType<typeof useFlashCountdown> }) {
  return (
    <section className="py-16 md:py-24 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center rounded-3xl bg-white border border-[#E5E5E5] p-10 md:p-14 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center mb-6">
            <CalendarClock className="h-8 w-8 text-[#C9A84C]" />
          </div>
          <p className="text-[#C9A84C] font-medium mb-2 tracking-widest uppercase text-sm">Flash Sale</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3">No live flash sale right now</h2>
          <p className="text-[#6B6B6B] text-sm md:text-base mb-8">
            We're restocking the deals. The next session — <span className="font-semibold text-[#1A1A1A]">{nextSession.title}</span> — kicks off soon.
          </p>

          <div className="flex items-center justify-center gap-3 md:gap-4 mb-8">
            <TimeBox value={countdown ? pad(countdown.days) : '--'} label="Days" />
            <span className="text-2xl font-bold text-[#E5E5E5]">:</span>
            <TimeBox value={countdown ? pad(countdown.hours) : '--'} label="Hours" />
            <span className="text-2xl font-bold text-[#E5E5E5]">:</span>
            <TimeBox value={countdown ? pad(countdown.minutes) : '--'} label="Mins" />
            <span className="text-2xl font-bold text-[#E5E5E5]">:</span>
            <TimeBox value={countdown ? pad(countdown.seconds) : '--'} label="Secs" />
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#1A1A1A] text-white font-medium hover:bg-[#C9A84C] hover:text-black transition-all duration-300"
          >
            <ShoppingBag className="h-4 w-4" />
            Shop All Products
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function FlashSalePage() {
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [discounts, setDiscounts] = useState<FlashDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewDeal, setQuickViewDeal] = useState<FlashDeal | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const session = useMemo(() => getFlashSaleSession(new Date(), discounts), [discounts]);
  const nextSession = useMemo(() => getNextFlashSaleSession(), []);
  const countdown = useFlashCountdown(session.status === 'live' ? session.endTime : null);
  const nextCountdown = useFlashCountdown(nextSession.startTime);

  useEffect(() => {
    let cancelled = false;
    async function fetchDeals() {
      try {
        // Scan the full catalog: promotions can sit on any product, not just
        // the newest page. One request, filtered client-side.
        const [productsRes, discounts] = await Promise.all([
          fetch(`${API_URL}/api/store/products?limit=2000`),
          getActiveDiscounts(),
        ]);
        const data = await productsRes.json();
        if (cancelled) return;
        const all: any[] = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
        setDeals(sortDealsForDisplay(getFlashDeals(all, discounts)));
        setDiscounts(discounts);
      } catch {
        if (!cancelled) setDeals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDeals();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasDeals = !loading && deals.length > 0;

  return (
    <div className="bg-[#FAFAFA]">
      {hasDeals ? (
        <Hero session={session} deals={deals} countdown={countdown} />
      ) : (
        !loading && <EmptyState nextSession={nextSession} countdown={nextCountdown} />
      )}

      {/* Deals grid */}
      <section id="deals" className={hasDeals ? 'py-16 md:py-24' : 'hidden'}>
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-10 md:mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Today&apos;s Markdowns
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-3">Deals Of The Day</h2>
              <p className="text-[#6B6B6B] text-sm md:text-base max-w-2xl mx-auto">
                Hand-picked luxury pieces at their lowest prices — while stock lasts.
              </p>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-white aspect-[3/4]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {deals.map((deal, index) => (
                <ScrollReveal key={deal.product._id} direction="up" delay={Math.min(index, 7) * 50}>
                  <FlashSaleCard
                    deal={deal}
                    onQuickView={(d) => {
                      setQuickViewDeal(d);
                      setIsQuickViewOpen(true);
                    }}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}

          {!loading && deals.length > 0 && (
            <ScrollReveal delay={200}>
              <div className="mt-12 text-center">
                <Link
                  href="/products"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#1A1A1A] text-white font-medium hover:bg-[#C9A84C] hover:text-black transition-all duration-300 shadow-lg"
                >
                  <Clock className="h-4 w-4" />
                  <span>Deal expires soon — browse everything</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      <QuickViewModal
        product={
          quickViewDeal
            ? {
                _id: quickViewDeal.product._id,
                name: quickViewDeal.product.name,
                slug: quickViewDeal.product.slug,
                description: quickViewDeal.product.description,
                thumbnail: quickViewDeal.product.thumbnail,
                images: quickViewDeal.product.images,
                variants: quickViewDeal.product.variants,
                category: quickViewDeal.product.category,
              }
            : null
        }
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </div>
  );
}
