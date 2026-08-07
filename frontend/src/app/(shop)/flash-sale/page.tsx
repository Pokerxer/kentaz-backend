'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Zap, ArrowRight, Clock, CalendarClock, ShoppingBag, Sparkles, ChevronDown, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { FlashSaleCard } from '@/components/shop/FlashSaleCard';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import {
  FLASH_SALE,
  dealsWithImages,
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

/** Ticking clock so the session (and its countdown) stays accurate without a reload. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Countdown boxes are fluid on mobile (grid-cols-4 → each fills a quarter of
 * the row, no overflow on 320px screens) and fixed-size squares on sm+.
 */
function TimeBox({ value, label, big = false }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <div
        className={`w-full aspect-square sm:aspect-auto rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center ${
          big ? 'sm:w-20 sm:h-20 lg:w-24 lg:h-24' : 'sm:w-16 sm:h-16 lg:w-20 lg:h-20'
        }`}
      >
        <span
          className={`font-bold tabular-nums animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent ${
            big ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl sm:text-2xl lg:text-3xl'
          }`}
        >
          {value}
        </span>
      </div>
      <span className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

function Hero({ session, deals, countdown }: { session: FlashSaleSession; deals: FlashDeal[]; countdown: ReturnType<typeof useFlashCountdown> }) {
  const bestDeal = deals.length > 0 ? deals.reduce((a, b) => (b.discountPercent > a.discountPercent ? b : a)) : null;

  // When does the session end, in calendar-day terms? (Discount end dates can
  // run days out — "Ends Tonight" is only correct when it actually ends today.)
  const endsLabel = useMemo(() => {
    const now = new Date();
    const end = new Date(session.endTime);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfEndDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const dayDiff = Math.round((startOfEndDay - startOfToday) / 86400000);
    if (dayDiff <= 0) return { value: 'Today', label: 'Ends Tonight' };
    if (dayDiff === 1) return { value: 'Tomorrow', label: 'Ends Tomorrow' };
    return { value: `${dayDiff}d`, label: 'Sale Ends' };
  }, [session.endTime]);

  const live = session.status === 'live';

  return (
    <section className="relative bg-[#121212] overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-[#C9A84C]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] bg-red-600/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-14 md:py-20 lg:py-24 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase mb-6 border ${
              live
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-white/5 border-white/10 text-white/50'
            }`}
          >
            {live && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            {live ? 'Live Session' : 'Session Ended'}
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-5">
            <span className="animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
              {session.title}
            </span>
          </h1>
          <p className="text-white/50 text-sm md:text-lg max-w-xl mx-auto mb-8 md:mb-10">{session.tagline}</p>

          {/* Countdown — fluid 4-up grid on mobile so it can never overflow */}
          {live ? (
            <div
              role="timer"
              aria-label={`Flash sale ends in ${countdown ? `${countdown.days} days ${countdown.hours} hours ${countdown.minutes} minutes` : 'under a minute'}`}
              className="grid grid-cols-4 gap-2 sm:flex sm:items-start sm:justify-center sm:gap-4 mb-8 md:mb-10 max-w-md mx-auto"
            >
              <TimeBox value={countdown ? pad(countdown.days) : '--'} label="Days" big />
              <TimeBox value={countdown ? pad(countdown.hours) : '--'} label="Hours" big />
              <TimeBox value={countdown ? pad(countdown.minutes) : '--'} label="Mins" big />
              <TimeBox value={countdown ? pad(countdown.seconds) : '--'} label="Secs" big />
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium mb-8 md:mb-10">
              <Clock className="h-3.5 w-3.5" />
              This session has ended — the markdowns below may still be live while stock lasts.
            </div>
          )}

          {/* Session stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-lg mx-auto mb-8 md:mb-10">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-2 py-4 flex flex-col items-center justify-center">
              <p className="text-2xl md:text-3xl font-bold text-[#C9A84C] tabular-nums">{deals.length}</p>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 mt-1 text-center">Deals Live</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-2 py-4 flex flex-col items-center justify-center">
              <p className="text-2xl md:text-3xl font-bold text-red-400 tabular-nums">{bestDeal ? `-${bestDeal.discountPercent}%` : '--'}</p>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 mt-1 text-center">Top Markdown</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-2 py-4 flex flex-col items-center justify-center">
              <p className="text-2xl md:text-3xl font-bold text-white">{endsLabel.value}</p>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 mt-1 text-center">{endsLabel.label}</p>
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

/**
 * Shown when the catalogue could not be loaded.
 *
 * Deliberately distinct from EmptyState: a failed request is not the same as
 * "no deals today", and telling a shopper the sale is empty when the server is
 * down loses a sale and hides an outage.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="py-16 md:py-24 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center rounded-3xl bg-white border border-[#E5E5E5] p-10 md:p-14 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-[#C9A84C] font-medium mb-2 tracking-widest uppercase text-sm">Flash Sale</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3">We couldn&apos;t load the deals</h2>
          <p className="text-[#6B6B6B] text-sm md:text-base mb-2">
            Something went wrong reaching our store — this isn&apos;t a sign the sale is over.
          </p>
          <p className="text-xs text-[#9B9B9B] mb-8">{message}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#1A1A1A] text-white font-medium hover:bg-[#C9A84C] hover:text-black transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#E5E5E5] text-[#1A1A1A] font-medium hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all duration-300"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop All Products
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

          <div
            role="timer"
            aria-label={`Next flash sale starts in ${countdown ? `${countdown.days} days ${countdown.hours} hours ${countdown.minutes} minutes` : 'under a minute'}`}
            className="grid grid-cols-4 gap-2 sm:flex sm:items-start sm:justify-center sm:gap-4 max-w-sm mx-auto mb-8"
          >
            <TimeBox value={countdown ? pad(countdown.days) : '--'} label="Days" />
            <TimeBox value={countdown ? pad(countdown.hours) : '--'} label="Hours" />
            <TimeBox value={countdown ? pad(countdown.minutes) : '--'} label="Mins" />
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

const PAGE_SIZE = 16;

type SortKey = 'discount' | 'savings' | 'price-low' | 'price-high';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'discount', label: 'Biggest discount' },
  { key: 'savings', label: 'Biggest savings' },
  { key: 'price-low', label: 'Price: low to high' },
  { key: 'price-high', label: 'Price: high to low' },
];

function sortDeals(deals: FlashDeal[], sortBy: SortKey): FlashDeal[] {
  const list = [...deals];
  switch (sortBy) {
    case 'savings':
      return list.sort((a, b) => b.savings - a.savings || b.discountPercent - a.discountPercent);
    case 'price-low':
      return list.sort((a, b) => a.price - b.price);
    case 'price-high':
      return list.sort((a, b) => b.price - a.price);
    default:
      return list.sort((a, b) => b.discountPercent - a.discountPercent || b.savings - a.savings);
  }
}

export default function FlashSalePage() {
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [discounts, setDiscounts] = useState<FlashDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by the retry button to re-run the fetch effect. */
  const [reloadKey, setReloadKey] = useState(0);
  const [quickViewDeal, setQuickViewDeal] = useState<FlashDeal | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('discount');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Ticking clock: the session window (and its countdown) is recomputed every
  // second, so the hero flips to "ended" and rolls to the next session without
  // a reload — no more stuck 00:00:00:00.
  const now = useNow(1000);
  const session = useMemo(() => getFlashSaleSession(new Date(now), discounts), [now, discounts]);
  const nextSession = useMemo(() => getNextFlashSaleSession(), []);
  // `session` is rebuilt every second, so its endTime is a fresh Date object
  // each tick. Keyed on the timestamp, the countdown's effect only re-subscribes
  // when the end time genuinely moves, instead of tearing down its interval once
  // a second.
  const endTimeMs = session.status === 'live' ? session.endTime.getTime() : null;
  const countdownTarget = useMemo(() => (endTimeMs === null ? null : new Date(endTimeMs)), [endTimeMs]);
  const countdown = useFlashCountdown(countdownTarget);
  const nextCountdown = useFlashCountdown(nextSession.startTime);

  useEffect(() => {
    let cancelled = false;
    async function fetchDeals() {
      setLoading(true);
      setError(null);
      try {
        // Scan the full catalog: promotions can sit on any product, not just
        // the newest page. One request, filtered client-side.
        const [productsRes, activeDiscounts] = await Promise.all([
          fetch(`${API_URL}/api/store/products?limit=2000`),
          getActiveDiscounts(),
        ]);
        // fetch only rejects on network failure — a 500 still resolves, and
        // parsing it as JSON would quietly yield zero deals.
        if (!productsRes.ok) throw new Error(`Store responded with ${productsRes.status}`);
        const data = await productsRes.json();
        if (cancelled) return;
        const all: any[] = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
        // Filter before anything else reads `deals`, so the hero counts, the
        // category chips and their tallies all agree with the grid.
        setDeals(sortDealsForDisplay(dealsWithImages(getFlashDeals(all, activeDiscounts))));
        setDiscounts(activeDiscounts);
      } catch (err) {
        // Never fall through to the empty state: "no deals today" and "we
        // couldn't reach the store" look identical to a shopper otherwise.
        if (!cancelled) {
          setDeals([]);
          setError(err instanceof Error ? err.message : 'Could not reach the store');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDeals();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(deals.map((d) => d.product.category).filter(Boolean)))],
    [deals]
  );

  // Reset pagination whenever the filter or sort changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, sortBy]);

  const visibleDeals = useMemo(() => {
    const filtered = activeCategory === 'All' ? deals : deals.filter((d) => d.product.category === activeCategory);
    return sortDeals(filtered, sortBy);
  }, [deals, activeCategory, sortBy]);

  const shownDeals = visibleDeals.slice(0, visibleCount);
  const hasMore = visibleDeals.length > visibleCount;

  const hasDeals = !loading && deals.length > 0;

  return (
    <div className="bg-[#FAFAFA]">
      {hasDeals ? (
        <Hero session={session} deals={deals} countdown={countdown} />
      ) : loading ? null : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <EmptyState nextSession={nextSession} countdown={nextCountdown} />
      )}

      {/* Deals grid — visible while loading too, otherwise the skeletons below
          are hidden by this very class and the page paints blank until a scan
          of the whole catalogue returns. */}
      <section id="deals" className={hasDeals || loading ? 'py-14 md:py-20' : 'hidden'}>
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-8 md:mb-10">
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
            <>
              {/* Toolbar: category chips + sort + count */}
              <ScrollReveal delay={50}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6 md:mb-8">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 border ${
                          activeCategory === cat
                            ? 'bg-[#C9A84C] border-[#C9A84C] text-[#1A1A1A] shadow-md shadow-[#C9A84C]/25'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B] hover:border-[#C9A84C]/50 hover:text-[#C9A84C]'
                        }`}
                      >
                        {cat}
                        <span className={`ml-1.5 text-[10px] ${activeCategory === cat ? 'text-[#1A1A1A]/70' : 'text-[#9B9B9B]'}`}>
                          {cat === 'All' ? deals.length : deals.filter((d) => d.product.category === cat).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-xs text-[#9B9B9B] hidden md:block">
                      {visibleDeals.length} deal{visibleDeals.length !== 1 ? 's' : ''}
                      {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
                    </p>
                    <div className="relative">
                      <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B9B] pointer-events-none" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortKey)}
                        aria-label="Sort deals"
                        className="appearance-none pl-9 pr-8 py-2 rounded-xl bg-white border border-[#E5E5E5] text-xs font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C] cursor-pointer"
                      >
                        {SORT_OPTIONS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B9B] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {shownDeals.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {shownDeals.map((deal, index) => (
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
              ) : (
                <div className="max-w-md mx-auto text-center rounded-2xl bg-white border border-[#E5E5E5] p-10 shadow-sm">
                  <p className="text-sm font-semibold text-[#1A1A1A] mb-1">No deals in {activeCategory} right now</p>
                  <p className="text-xs text-[#6B6B6B] mb-5">Try another category — the best markdowns move fast.</p>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('All')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-semibold hover:bg-[#C9A84C] hover:text-black transition-all duration-300"
                  >
                    View all deals
                  </button>
                </div>
              )}

              {hasMore && (
                <ScrollReveal delay={100}>
                  <div className="mt-10 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border-2 border-[#1A1A1A] text-[#1A1A1A] text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white transition-all duration-300"
                    >
                      Load more deals
                      <span className="text-xs opacity-60">({visibleDeals.length - visibleCount} more)</span>
                    </button>
                  </div>
                </ScrollReveal>
              )}

              {!loading && visibleDeals.length > 0 && (
                <ScrollReveal delay={200}>
                  <div className="mt-10 text-center">
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
            </>
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
