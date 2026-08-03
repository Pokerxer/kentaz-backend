'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Zap, ArrowRight, Clock } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { FlashSaleCard } from '@/components/shop/FlashSaleCard';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import {
  FLASH_SALE,
  getFlashDeals,
  getFlashSaleSession,
  sortDealsForDisplay,
  useFlashCountdown,
} from '@/lib/flashSale';
import type { FlashDeal } from '@/lib/flashSale';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function CountdownBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center">
        <span className="text-2xl md:text-3xl font-bold text-[#C9A84C] tabular-nums animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
          {value}
        </span>
      </div>
      <span className="mt-1.5 text-[10px] uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

export function FlashSaleSection() {
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewDeal, setQuickViewDeal] = useState<FlashDeal | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const session = useMemo(() => getFlashSaleSession(), []);
  const countdown = useFlashCountdown(session.status === 'live' ? session.endTime : null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDeals() {
      try {
        // Scan the full catalog: promotions can sit on any product, not just
        // the newest page. One request, filtered client-side.
        const res = await fetch(`${API_URL}/api/store/products?limit=2000`);
        const data = await res.json();
        if (cancelled) return;
        const all: any[] = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
        setDeals(sortDealsForDisplay(getFlashDeals(all)).slice(0, FLASH_SALE.maxHomepageItems));
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

  // No active deals — hide the section entirely instead of showing an empty dark band.
  if (!loading && deals.length === 0) return null;

  return (
    <section className="relative py-16 md:py-24 bg-[#121212] overflow-hidden">
      {/* Ambient gold glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C9A84C]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10 md:mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold tracking-widest uppercase mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Live Now
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                <span className="animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
                  {session.title}
                </span>
              </h2>
              <p className="text-white/40 text-sm md:text-base max-w-xl">{session.tagline}</p>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex flex-col items-center mr-1">
                <Clock className="h-5 w-5 text-[#C9A84C] mb-2" />
              </div>
              <CountdownBox value={countdown ? pad(countdown.hours) : '--'} label="Hours" />
              <span className="text-2xl font-bold text-white/20">:</span>
              <CountdownBox value={countdown ? pad(countdown.minutes) : '--'} label="Mins" />
              <span className="text-2xl font-bold text-white/20">:</span>
              <CountdownBox value={countdown ? pad(countdown.seconds) : '--'} label="Secs" />
            </div>
          </div>
        </ScrollReveal>

        {/* Deals */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white/5 aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {deals.map((deal, index) => (
              <ScrollReveal key={deal.product._id} direction="up" delay={index * 60}>
                <FlashSaleCard
                  deal={deal}
                  variant="dark"
                  onQuickView={(d) => {
                    setQuickViewDeal(d);
                    setIsQuickViewOpen(true);
                  }}
                />
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* CTA */}
        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <Link
              href="/flash-sale"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] text-[#1A1A1A] font-semibold hover:shadow-[0_8px_30px_rgba(201,168,76,0.35)] transition-all duration-300"
            >
              <Zap className="h-5 w-5 fill-current" />
              <span>See All Flash Deals</span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

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
    </section>
  );
}
