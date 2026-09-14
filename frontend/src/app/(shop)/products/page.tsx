'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Grid3X3, List, X, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Star, ArrowUpDown, BadgePercent, Check } from 'lucide-react';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { cn } from '@/lib/utils';
import { motion, MotionConfig, AnimatePresence } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { ProductContent } from '@/components/shop/ProductContent';

// Motion tokens — one rhythm for the whole page (ui-ux-pro-max §7)
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // easeOutQuint
const MICRO: Transition = { duration: 0.22, ease: EASE };          // taps, icon swaps
const ENTER: Transition = { duration: 0.42, ease: EASE };          // panel / section entrances
const SPRING_EDGE: Transition = { type: 'spring', damping: 26, stiffness: 240, mass: 0.9 };

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', navy: '#1e3a5f', red: '#dc2626',
  pink: '#ec4899', brown: '#92400e', green: '#16a34a', yellow: '#eab308',
  purple: '#9333ea', orange: '#ea580c', gray: '#6b7280', blue: '#2563eb',
  beige: '#d4b896', cream: '#f5f0e8', gold: '#d4a000', silver: '#9ca3af',
  teal: '#0d9488', maroon: '#7f1d1d', khaki: '#c3b091', olive: '#6b7c32',
  nude: '#e8c4a0', tan: '#d2b48c', mint: '#98d8c8', coral: '#ff7f7f',
};

// Vendors write the same colour many ways ("Black & Gold", "navy-blue",
// "Royal Blue", "black leather"). Split on word boundaries and collapse to a
// single canonical value so the sidebar offers ONE swatch per colour family
// instead of dozens of near-duplicates — and so filters actually match.
const COLOR_SPLIT_RE = /[\s/&,+()\-]+/;

function normalizeColor(raw: string): { value: string; name: string; hex: string | null } | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (COLOR_HEX_MAP[lower]) {
    return { value: lower, name: lower.charAt(0).toUpperCase() + lower.slice(1), hex: COLOR_HEX_MAP[lower] };
  }
  const known = lower.split(COLOR_SPLIT_RE).map(t => t.trim()).filter(Boolean).find(t => COLOR_HEX_MAP[t]);
  if (known) {
    return { value: known, name: known.charAt(0).toUpperCase() + known.slice(1), hex: COLOR_HEX_MAP[known] };
  }
  return { value: lower, name: trimmed, hex: null };
}

// The colour words inside a variant's value ("Black & Gold" → ['black', 'gold']),
// used to match canonical selections without string-equality misses.
function colorWords(value?: string): string[] {
  return (value || '').trim().toLowerCase().split(COLOR_SPLIT_RE).filter(Boolean);
}

// ─────────────────────────── Smart search ───────────────────────────
// Field weights for relevance scoring (ui-ux-pro-max §7: search, not just "contains").
const SEARCH_WEIGHT = { name: 50, phrase: 22, category: 14, color: 12, tags: 9, size: 4, description: 1 };

// Lightweight catalogue synonyms so intent matches even when wording differs.
const SEARCH_SYNONYMS: Record<string, string[]> = {
  trainers: ['sneaker', 'shoe'], sneakers: ['sneaker', 'shoe'],
  handbag: ['bag', 'purse', 'tote'], handbags: ['bag', 'purse', 'tote'],
  bag: ['handbag', 'purse', 'tote', 'clutch'], totes: ['tote', 'bag'],
  purse: ['bag', 'handbag'], clutch: ['bag', 'handbag', 'purse'],
  dress: ['gown', 'costume', 'outfit'], dresses: ['gown', 'outfit'],
  gown: ['dress', 'outfit'], gowns: ['dress', 'outfit'],
  costume: ['dress', 'outfit'], outfit: ['dress', 'costume'],
  shirt: ['tee', 't-shirt', 'blouse', 'top'], shirts: ['tee', 'top'],
  tshirt: ['shirt', 'tee', 'top'], teeshirt: ['shirt', 'tee', 'top'],
  tee: ['shirt', 'top'], tees: ['shirt', 'top'],
  blouse: ['shirt', 'top'], top: ['shirt', 'blouse', 'tee'],
  trousers: ['jeans', 'pants', 'chino'], pants: ['trousers', 'jeans'],
  jeans: ['denim', 'trousers'], denim: ['jeans'],
  jacket: ['coat', 'blazer'], coat: ['jacket', 'blazer'],
  fragrance: ['perfume', 'cologne', 'scent'], perfumes: ['perfume', 'fragrance'],
  scent: ['perfume'], cologne: ['perfume'],
  wig: ['human hair', 'weave'], wigs: ['human hair', 'weave'],
  weave: ['human hair', 'wig'],
  hoody: ['hoodie'], hoodies: ['hoodie'],
  earphone: ['headphone', 'earbud'], earphones: ['headphone', 'earbud'],
  earpod: ['earbud', 'headphone'],
  shades: ['sunglasses'], sunglasses: ['shades'],
  jewellery: ['jewelry', 'necklace', 'pendant'], jewelry: ['necklace', 'pendant'],
  pendant: ['necklace'], smartwatch: ['watch'], watches: ['watch', 'smartwatch'],
  sneaker: ['trainer', 'shoe'],
};

// Crude singularization ("dresses" → "dress", "boxes" → "box") so searches
// match either form.
function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ves') && word.length > 4) return word.slice(0, -3) + 'f';
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

function wordForms(word: string): string[] {
  const set = new Set<string>([word, singularize(word)]);
  return [...set];
}

// Expand one query token into forgiving variants: synonyms + singular forms.
function expandToken(token: string): string[] {
  const out = new Set<string>();
  const add = (w: string) => wordForms(w).forEach(f => out.add(f));
  add(token);
  (SEARCH_SYNONYMS[token] || []).forEach(add);
  const sing = singularize(token);
  if (sing !== token) (SEARCH_SYNONYMS[sing] || []).forEach(add);
  return [...out];
}

// Classic Levenshtein distance for typo tolerance. Returns 9 (an impossible
// edit count) for words that differ too much in length so callers never treat
// a length-mismatch as a close typo.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

const SEARCH_TOKENIZE_RE = /[\s,/()\-]+/;
function tokenize(text: string): string[] {
  return text.toLowerCase().split(SEARCH_TOKENIZE_RE).map(t => t.trim()).filter(Boolean);
}

// Quality (0..1) of the best match for a query token against a word list.
// Exact word = 1 · prefix = 0.85 · close typo (edit ≤ 1-2) = 0.8.
function bestTokenMatch(tokens: string[], queryForms: string[]): number {
  for (const doc of tokens) {
    for (const q of queryForms) {
      if (doc === q) return 1;
    }
  }
  let best = 0;
  for (const doc of tokens) {
    for (const q of queryForms) {
      if (q.length >= 3 && doc.startsWith(q)) best = Math.max(best, 0.85);
      else if (doc[0] === q[0]) {
        // Fuzzy tier scoped by word length + first-letter guard: only ever
        // match close typos, never different words ("blue" ≠ "blouse").
        const threshold =
          q.length >= 9 ? 3 :
          q.length >= 7 ? 2 :
          q.length >= 5 ? 1 : 0;
        if (threshold > 0 && levenshtein(doc, q) <= threshold) best = Math.max(best, 0.8);
      }
    }
  }
  return best;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', 'One Size'];

// How many products to show per page. 24 divides evenly into the 2/3/4-column grids.
const PAGE_SIZE = 24;

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Best Selling', value: 'bestselling' },
];

const ratingOptions = [
  { value: 4, label: '4 Stars & Up', stars: 4 },
  { value: 3, label: '3 Stars & Up', stars: 3 },
  { value: 2, label: '2 Stars & Up', stars: 2 },
];

interface ProductVariant {
  _id?: string;
  size?: string;
  color?: string;
  price: number;
  stock?: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  images?: { url: string }[];
  variants: ProductVariant[];
  category?: string;
  subcategory?: string;
  tags?: string[];
  featured?: boolean;
  ratings?: { avg: number; count: number };
  createdAt?: string;
}

function getMinPrice(product: Product): number {
  const prices = (product.variants || [])
    .map(v => v.price)
    .filter((x): x is number => typeof x === 'number' && x > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function FilterChip({ label, onRemove, color }: { label: string; onRemove: () => void; color?: string }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={MICRO}
      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-[#2D2D2D] text-white text-xs rounded-full font-medium"
    >
      {color && (
        <span className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: color }} />
      )}
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

function DualRangeSlider({ min, max, value, onChange, step = 1000 }: {
  min: number; max: number; value: [number, number];
  onChange: (val: [number, number]) => void; step?: number;
}) {
  const [lo, hi] = value;
  const range = Math.max(max - min, 1);
  const loP = ((lo - min) / range) * 100;
  const hiP = ((hi - min) / range) * 100;

  return (
    <div className="relative flex items-center h-6 my-2">
      <div className="absolute w-full h-1.5 bg-[#E5E5E5] rounded-full" />
      <div
        className="absolute h-1.5 bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] rounded-full pointer-events-none"
        style={{ left: `${loP}%`, right: `${100 - hiP}%` }}
      />
      <input
        type="range" min={min} max={max} step={step} value={lo}
        onChange={e => onChange([Math.min(+e.target.value, hi - step), hi])}
        className="absolute w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: lo >= hi - step ? 5 : 3 }}
      />
      <input
        type="range" min={min} max={max} step={step} value={hi}
        onChange={e => onChange([lo, Math.max(+e.target.value, lo + step)])}
        className="absolute w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: 4 }}
      />
      <div
        className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#C9A84C] rounded-full shadow-md pointer-events-none"
        style={{ left: `${loP}%`, zIndex: 6 }}
      />
      <div
        className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#C9A84C] rounded-full shadow-md pointer-events-none"
        style={{ left: `${hiP}%`, zIndex: 6 }}
      />
    </div>
  );
}

function FilterSection({
  title, expanded, onToggle, children, count,
}: {
  title: string; expanded: boolean; onToggle: () => void;
  children: React.ReactNode; count?: number;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-alt transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[#2D2D2D] tracking-tight">{title}</h3>
          {count !== undefined && count > 0 && (
            <motion.span
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={SPRING_EDGE}
              className="text-xs bg-[#C9A84C] text-[#1A1A1A] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none font-bold"
            >
              {count}
            </motion.span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform duration-300", expanded && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
            animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
            exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
            transition={MICRO}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Build a compact page list with ellipses, e.g. [1, '...', 4, 5, 6, '...', 12].
function getPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number; totalPages: number; onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getPageRange(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-4" aria-label="Pagination">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-gray-600 hover:bg-surface-alt hover:text-[#2D2D2D] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-gray-600 transition-colors shadow-sm"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </motion.button>

      <div className="flex items-center gap-1.5">
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400 select-none">…</span>
          ) : (
            <motion.button
              key={p}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              className={cn(
                "min-w-[2.5rem] px-3 py-2 text-sm rounded-lg border transition-colors relative",
                p === currentPage
                  ? "border-transparent text-[#1A1A1A] font-medium shadow-md shadow-black/10"
                  : "border-border bg-surface text-gray-600 hover:bg-surface-alt hover:text-[#2D2D2D]"
              )}
            >
              {p === currentPage && (
                <motion.span
                  layoutId="active-page"
                  transition={SPRING_EDGE}
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#C9A84C] to-[#E8D48A]"
                  aria-hidden
                />
              )}
              <span className="relative z-10">{p}</span>
            </motion.button>
          )
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-gray-600 hover:bg-surface-alt hover:text-[#2D2D2D] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-gray-600 transition-colors shadow-sm"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </nav>
  );
}

function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const collectionParam = searchParams.get('collection');
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam || '');
  const [activeCategory, setActiveCategory] = useState(collectionParam || categoryParam || 'all');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const priceInitialized = useRef(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
    colors: true,
    sizes: false,
    rating: false,
  });

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: { name: string; handle: string }[] = [];
    for (const p of products) {
      const name = p.category?.trim();
      if (!name || name.toLowerCase() === 'other') continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        cats.push({ name, handle: name });
      }
    }
    cats.sort((a, b) => a.name.localeCompare(b.name));
    return [{ name: 'All', handle: 'all' }, ...cats];
  }, [products]);

  const priceStats = useMemo(() => {
    const prices = products.flatMap(p =>
      (p.variants || []).map(v => v.price).filter((x): x is number => typeof x === 'number' && x > 0)
    );
    if (!prices.length) return { min: 0, max: 1000000 };
    return {
      min: Math.floor(Math.min(...prices) / 1000) * 1000,
      max: Math.ceil(Math.max(...prices) / 1000) * 1000,
    };
  }, [products]);

  const colorOptions = useMemo(() => {
    // Group messy vendor colour strings into canonical families.
    const groups = new Map<string, { name: string; hex: string | null }>();
    for (const p of products) {
      for (const v of p.variants || []) {
        const c = normalizeColor(v.color || '');
        if (!c) continue;
        const existing = groups.get(c.value);
        if (!existing || (!existing.hex && c.hex)) groups.set(c.value, c);
      }
    }
    return Array.from(groups.entries())
      .map(([value, o]) => ({ value, name: o.name, hex: o.hex }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const sizeOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      for (const v of p.variants || []) {
        if (v.size) seen.add(v.size.trim());
      }
    }
    return Array.from(seen).sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a);
      const bi = SIZE_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  // Debounce search input by 300ms to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch all products via pagination (API caps at 200/page)
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    let cancelled = false;

    // Serverless functions (Vercel) can drop the first request on a cold
    // start, surfacing as TypeError "Failed to fetch". Retry with backoff.
    async function fetchRetry(url: string, attempts = 3): Promise<Response> {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        if (attempts <= 1 || cancelled) throw err;
        await new Promise(r => setTimeout(r, 1200 * (4 - attempts)));
        return fetchRetry(url, attempts - 1);
      }
    }

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRetry(`${apiUrl}/api/store/products?limit=200&offset=0`);
        const data = await res.json();

        const first: any[] = data.products || (Array.isArray(data) ? data : []);
        const total: number = data.total || first.length;
        const totalPages = Math.ceil(total / 200);

        // Hide products where every variant has stock=0
        const hasStock = (p: any) =>
          !(p.variants?.length > 0) || p.variants.some((v: any) => (v.stock ?? 0) > 0);

        // Hide products with no real image (no thumbnail and no image URLs)
        const hasImage = (p: any) =>
          Boolean(p.thumbnail?.trim()) ||
          (Array.isArray(p.images) && p.images.some((img: any) => img?.url?.trim()));

        const isVisible = (p: any) => hasStock(p) && hasImage(p);

        // Drop duplicate _ids (the paginated API can return overlapping items),
        // which would otherwise cause React duplicate-key errors in the grid.
        const dedupeById = (arr: any[]) => {
          const seen = new Set<string>();
          return arr.filter(p => p?._id && !seen.has(p._id) && seen.add(p._id));
        };

        if (cancelled) return;
        setProducts(dedupeById(first.filter(isVisible)));

        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              fetchRetry(`${apiUrl}/api/store/products?limit=200&offset=${(i + 1) * 200}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(d => (d.products || []) as any[])
                .catch(() => [] as any[])
            )
          );
          if (!cancelled) {
            setProducts(dedupeById([...first, ...rest.flat()].filter(isVisible)));
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch products:', err);
          setError('Failed to load products. Please try again.');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // Initialize price range from actual product prices (runs once after first load)
  useEffect(() => {
    if (products.length > 0 && !priceInitialized.current) {
      priceInitialized.current = true;
      setPriceRange([priceStats.min, priceStats.max]);
    }
  }, [products, priceStats]);

  // Keep the category in sync with the URL in BOTH directions: clicking a
  // category pushes a new URL, and back/forward navigation or a direct link
  // must restore the category (or reset to 'all' when the param is absent).
  useEffect(() => {
    setActiveCategory(collectionParam || categoryParam || 'all');
  }, [collectionParam, categoryParam]);

  // A search arriving in the URL (navbar search box, shared link, back/forward)
  // must populate the page's own search box and filter immediately.
  useEffect(() => {
    const fromUrl = searchParam || '';
    if (fromUrl !== searchQuery) {
      setSearchQuery(fromUrl);
      setDebouncedSearch(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam]);

  // Mirror the applied search back into the URL (replace, so typing doesn't
  // spam history) — keeps the search shareable and back-button aware. The
  // category is preserved so the two filters stay in one URL.
  useEffect(() => {
    if (debouncedSearch === (searchParam || '')) return;
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : '/products');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => {
      const cat = (p.category || 'other').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== 'all') {
      // Homepage category cards send comma-joined raw category names so every
      // variant in a display bucket matches; OR them case-insensitively.
      const wanted = activeCategory
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      result = result.filter(p => wanted.includes((p.category || '').trim().toLowerCase()));
    }

    // Use min price across all variants (not just first)
    result = result.filter(p => {
      const minPrice = getMinPrice(p);
      return minPrice === 0 || (minPrice >= priceRange[0] && minPrice <= priceRange[1]);
    });

    // Colour + size are matched PER-VARIANT: a product only qualifies when one of
    // its variants carries every selected filter at the same time. Filtering each
    // field independently lets products through where "Black" lives in one variant
    // and "M" in another — i.e. combinations that don't actually exist.
    const colorSel = selectedColors.map(c => c.trim().toLowerCase()).filter(Boolean);
    const sizeSel = selectedSizes.map(s => s.trim().toLowerCase()).filter(Boolean);

    if (colorSel.length > 0 || sizeSel.length > 0) {
      result = result.filter(p => {
        const variants = p.variants || [];
        return variants.some(v => {
          if (colorSel.length > 0) {
            const words = colorWords(v.color);
            if (words.length === 0 || !words.some(w => colorSel.includes(w))) return false;
          }
          if (sizeSel.length > 0) {
            const s = (v.size || '').trim().toLowerCase();
            if (!s || !sizeSel.includes(s)) return false;
          }
          return true;
        });
      });
    }

    if (selectedRating !== null) {
      result = result.filter(p => (p.ratings?.avg || 0) >= selectedRating);
    }

    // Smart search: tokenized relevance across name, category, tags, description,
    // AND colour + size (from variants). Typo-tolerant, synonym-aware, and it
    // understands plural/singular forms. e.g. "dres", "blak handbag", "gold dress".
    let searchScores: Map<string, number> | null = null;
    if (debouncedSearch.trim()) {
      const queryForms = tokenize(debouncedSearch).map(expandToken);
      const phrase = debouncedSearch.toLowerCase().trim();

      const scored = result.map(p => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const subcat = (p.subcategory || '').toLowerCase();
        const tags = (p.tags || [])
          .map(t => typeof t === 'string' ? t : String((t as { value?: string })?.value ?? ''))
          .join(' ').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const colorText = (p.variants || [])
          .flatMap(v => [normalizeColor(v.color || '')?.value ?? '', ...colorWords(v.color)])
          .filter(Boolean).join(' ');
        const sizeText = (p.variants || []).map(v => (v.size || '')).join(' ').toLowerCase();

        const nameTokens = tokenize(name);
        const catTokens = tokenize(`${cat} ${subcat}`);
        const tagsTokens = tokenize(tags);
        const colorTokens = colorWords(colorText);
        const sizeTokens = tokenize(sizeText);
        const descTokens = tokenize(desc);

        let score = 0;
        for (const forms of queryForms) {
          score += bestTokenMatch(nameTokens, forms) * SEARCH_WEIGHT.name;
          score += bestTokenMatch(catTokens, forms) * SEARCH_WEIGHT.category;
          score += bestTokenMatch(tagsTokens, forms) * SEARCH_WEIGHT.tags;
          score += bestTokenMatch(colorTokens, forms) * SEARCH_WEIGHT.color;
          score += bestTokenMatch(sizeTokens, forms) * SEARCH_WEIGHT.size;
          score += bestTokenMatch(descTokens, forms) * SEARCH_WEIGHT.description;
        }
        // Phrase bonus: the whole query appears in the product name.
        if (phrase.length >= 4 && name.includes(phrase)) score += SEARCH_WEIGHT.phrase;

        return { p, score };
      }).filter(({ score }) => score > 0);

      searchScores = new Map(scored.map(({ p, score }) => [p._id, score]));
      result = scored.map(({ p }) => p);
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => getMinPrice(a) - getMinPrice(b));
        break;
      case 'price_desc':
        result.sort((a, b) => getMinPrice(b) - getMinPrice(a));
        break;
      case 'bestselling':
        result.sort((a, b) => (b.tags?.includes('bestseller') ? 1 : 0) - (a.tags?.includes('bestseller') ? 1 : 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      default: // featured
        if (searchScores) {
          // When searching with "featured" sort, rank by relevance instead
          result.sort((a, b) => (searchScores!.get(b._id) || 0) - (searchScores!.get(a._id) || 0));
        } else {
          result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        }
    }

    return result;
  }, [products, activeCategory, debouncedSearch, sortBy, priceRange, selectedColors, selectedSizes, selectedRating]);

  const totalResults = filteredAndSortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  // Reset to the first page whenever the result set changes (filters/sort/search).
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, debouncedSearch, sortBy, priceRange, selectedColors, selectedSizes, selectedRating]);

  // Clamp the current page if filtering shrinks the result set below it.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(
    () => filteredAndSortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredAndSortedProducts, currentPage]
  );

  const rangeStart = totalResults === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalResults);

  const handlePageChange = (page: number) => {
    const next = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCategoryClick = (handle: string) => {
    setActiveCategory(handle);
    // Preserve the active search so switching category doesn't silently drop it.
    const params = new URLSearchParams();
    if (handle !== 'all') params.set('category', handle);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  };

  const handleCompareToggle = useCallback((product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p._id === product._id);
      if (exists) return prev.filter(p => p._id !== product._id);
      if (prev.length >= 4) return prev;
      return [...prev, product];
    });
  }, []);

  const isPriceFiltered = priceRange[0] > priceStats.min || priceRange[1] < priceStats.max;

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSortBy('featured');
    setPriceRange([priceStats.min, priceStats.max]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedRating(null);
    router.push('/products');
  };

  const hasActiveFilters = Boolean(
    searchQuery || activeCategory !== 'all' || isPriceFiltered ||
    selectedColors.length > 0 || selectedSizes.length > 0 || selectedRating !== null
  );

  const activeFilterCount = [
    searchQuery ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    isPriceFiltered ? 1 : 0,
    selectedColors.length > 0 ? 1 : 0,
    selectedSizes.length > 0 ? 1 : 0,
    selectedRating !== null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const filterContent = (
    <>
      <FilterSection
        title="Categories"
        expanded={expandedSections.categories}
        onToggle={() => setExpandedSections(s => ({ ...s, categories: !s.categories }))}
      >
        <div className="px-4 pb-4">
          <ul className="space-y-1">
            {categories.map((category) => {
              const count = categoryCounts[category.handle.toLowerCase()] || 0;
              const isActive = activeCategory.toLowerCase() === category.handle.toLowerCase();
              return (
                <li key={category.handle}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { handleCategoryClick(category.handle); setShowFilterDrawer(false); }}
                    className={cn(
                      "w-full text-left flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                      isActive
                        ? 'bg-[#C9A84C]/10 text-[#A16207] font-semibold'
                        : 'text-gray-600 hover:bg-[#F5F5F0] hover:text-[#2D2D2D]'
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="text-sm">{category.name}</span>
                    <span className={cn("text-xs tabular-nums", isActive ? 'text-[#C9A84C] font-bold' : 'text-gray-400')}>{count}</span>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </div>
      </FilterSection>

      <FilterSection
        title="Price"
        expanded={expandedSections.price}
        onToggle={() => setExpandedSections(s => ({ ...s, price: !s.price }))}
        count={isPriceFiltered ? 1 : 0}
      >
        <div className="px-4 pb-4 space-y-4">
          <DualRangeSlider
            min={priceStats.min}
            max={priceStats.max}
            value={priceRange}
            onChange={setPriceRange}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Min</label>
              <input
                type="number"
                placeholder={`${priceStats.min.toLocaleString()}`}
                value={priceRange[0] === priceStats.min ? '' : priceRange[0]}
                onChange={e => setPriceRange([parseInt(e.target.value) || priceStats.min, priceRange[1]])}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Max</label>
              <input
                type="number"
                placeholder={`${priceStats.max.toLocaleString()}`}
                value={priceRange[1] === priceStats.max ? '' : priceRange[1]}
                onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value) || priceStats.max])}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>₦{priceStats.min.toLocaleString()}</span>
            <span>₦{priceStats.max.toLocaleString()}</span>
          </div>
        </div>
      </FilterSection>

      {colorOptions.length > 0 && (
        <FilterSection
          title="Colors"
          expanded={expandedSections.colors}
          onToggle={() => setExpandedSections(s => ({ ...s, colors: !s.colors }))}
          count={selectedColors.length}
        >
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((color) => {
                const isSelected = selectedColors.includes(color.value);
                return (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColors(prev =>
                      isSelected ? prev.filter(c => c !== color.value) : [...prev, color.value]
                    )}
                    className={cn(
                      "relative w-9 h-9 rounded-full border-2 transition-all duration-150 hover:scale-110",
                      isSelected
                        ? "border-[#2D2D2D] ring-2 ring-[#2D2D2D] ring-offset-2 scale-105"
                        : "border-border hover:border-[#A16207]"
                    )}
                    style={{ backgroundColor: color.hex ?? '#e5e7eb' }}
                    title={color.name}
                    aria-label={`${color.name}${isSelected ? ' (selected)' : ''}`}
                  >
                    {!color.hex && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                        {color.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterSection>
      )}

      {sizeOptions.length > 0 && (
        <FilterSection
          title="Sizes"
          expanded={expandedSections.sizes}
          onToggle={() => setExpandedSections(s => ({ ...s, sizes: !s.sizes }))}
          count={selectedSizes.length}
        >
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSizes(prev =>
                      isSelected ? prev.filter(s => s !== size) : [...prev, size]
                    )}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-all duration-150",
                      isSelected
                        ? "bg-[#2D2D2D] text-white border-[#2D2D2D] shadow-sm"
                        : "bg-surface text-gray-600 border-border hover:border-[#2D2D2D] hover:bg-[#F5F5F0]"
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterSection>
      )}

      <FilterSection
        title="Rating"
        expanded={expandedSections.rating}
        onToggle={() => setExpandedSections(s => ({ ...s, rating: !s.rating }))}
        count={selectedRating !== null ? 1 : 0}
      >
        <div className="px-4 pb-4 space-y-1">
          {ratingOptions.map((option) => {
            const isSelected = selectedRating === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSelectedRating(isSelected ? null : option.value)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left",
                  isSelected ? "bg-[#C9A84C]/10" : "hover:bg-[#F5F5F0]"
                )}
              >
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < option.stars ? "fill-[#C9A84C] text-[#C9A84C]" : "text-[#E5E5E5]")} />
                  ))}
                </div>
                <span className="text-sm text-gray-600">{option.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

          {/* Page hero */}
          <motion.header
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={ENTER}
            className="mb-8 lg:mb-10"
          >
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#C9A84C]">
              The Collection
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#2D2D2D] tracking-tight leading-tight">
              Shop Kentaz
            </h1>
            <span className="mt-3 block h-[3px] w-16 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A]" aria-hidden />
            <p className="mt-3 text-sm sm:text-base text-muted max-w-xl leading-relaxed">
              Luxury fashion, beauty &amp; lifestyle — every piece curated for the modern Nigerian.
            </p>

            <motion.a
              href="/flash-sale"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ENTER, delay: 0.15 }}
              className="group mt-5 inline-flex items-center gap-2.5 bg-gradient-to-r from-[#C9A84C] via-[#A68A3D] to-[#C9A84C] text-white text-xs sm:text-sm font-bold pl-4 pr-3 py-3 rounded-full shadow-lg shadow-[#C9A84C]/30 hover:shadow-xl hover:shadow-[#C9A84C]/40 hover:brightness-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              <BadgePercent className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Flash Sale live — up to 50% off handpicked pieces</span>
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.a>
          </motion.header>

          <div className="flex flex-col lg:flex-row gap-8">

          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#2D2D2D] tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#C9A84C]" />
                  Filters
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-muted hover:text-[#A16207] transition-colors font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {filterContent}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div ref={topRef} className="flex-1 min-w-0 scroll-mt-8">

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative group">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors group-focus-within:text-[#C9A84C]" />
                <input
                  type="text"
                  placeholder="Search by colour, brand, name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 text-sm sm:text-base border border-border rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent focus:shadow-[0_0_0_4px_rgba(201,168,76,0.15)] transition-[border-color,box-shadow] shadow-sm"
                />
                {searchQuery && (
                  <motion.button
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={SPRING_EDGE}
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-alt rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Active Filter Chips */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={MICRO}
                  className="flex flex-wrap items-center gap-2 mb-4"
                >
                {activeCategory !== 'all' && (
                  <FilterChip
                    label={activeCategory}
                    onRemove={() => handleCategoryClick('all')}
                  />
                )}
                {isPriceFiltered && (
                  <FilterChip
                    label={`₦${priceRange[0].toLocaleString()} – ₦${priceRange[1].toLocaleString()}`}
                    onRemove={() => setPriceRange([priceStats.min, priceStats.max])}
                  />
                )}
{selectedColors.map(c => {
                  const opt = colorOptions.find(o => o.value === c);
                  return (
                    <FilterChip
                      key={c}
                      label={opt?.name ?? c.charAt(0).toUpperCase() + c.slice(1)}
                      color={opt?.hex ?? undefined}
                      onRemove={() => setSelectedColors(prev => prev.filter(x => x !== c))}
                    />
                  );
                })}
                {selectedSizes.map(s => (
                  <FilterChip
                    key={s}
                    label={s}
                    onRemove={() => setSelectedSizes(prev => prev.filter(x => x !== s))}
                  />
                ))}
                {selectedRating !== null && (
                  <FilterChip
                    label={`${selectedRating}★ & up`}
                    onRemove={() => setSelectedRating(null)}
                  />
                )}
                {searchQuery && (
                  <FilterChip
                    label={`"${searchQuery}"`}
                    onRemove={() => setSearchQuery('')}
                  />
                )}
                <motion.button
                  layout
                  onClick={clearFilters}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="text-xs text-muted hover:text-[#A16207] transition-colors px-1 font-semibold"
                >
                  Clear all
                </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter & Sort Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowFilterDrawer(true)}
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-surface hover:bg-surface-alt transition-colors lg:hidden whitespace-nowrap shadow-sm"
                >
                  <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-semibold">Filters</span>
                  <AnimatePresence>
                    {activeFilterCount > 0 && (
                      <motion.span
                        key="count"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={SPRING_EDGE}
                        className="bg-[#C9A84C] text-[#1A1A1A] text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none font-bold"
                      >
                        {activeFilterCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              <div className="flex items-center justify-between sm:gap-5 gap-2">
                <motion.span
                  key={`${filteredAndSortedProducts.length}-${currentPage}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={MICRO}
                  className="text-sm text-muted whitespace-nowrap tabular-nums"
                >
                  {filteredAndSortedProducts.length} <span className="text-[#9CA3AF]">products</span>
                </motion.span>

                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-semibold transition-colors rounded-lg px-1 py-1",
                      showSortDropdown ? "text-[#2D2D2D]" : "text-gray-600 hover:text-[#2D2D2D]"
                    )}
                    aria-expanded={showSortDropdown}
                  >
                    <ArrowUpDown className="h-4 w-4 text-[#C9A84C]" />
                    <span className="hidden sm:inline">Sort:</span>
                    <span className="text-[#2D2D2D]">
                      {debouncedSearch.trim() && sortBy === 'featured'
                        ? 'Relevance'
                        : sortOptions.find(o => o.value === sortBy)?.label}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-[#C9A84C] transition-transform duration-200", showSortDropdown && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={MICRO}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl shadow-black/5 border border-border py-2 z-50 overflow-hidden"
                      >
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2",
                              sortBy === option.value
                                ? 'bg-[#C9A84C]/10 text-[#A16207] font-semibold'
                                : 'text-gray-600 hover:bg-[#F5F5F0] hover:text-[#2D2D2D]'
                            )}
                          >
                            {option.label}
                            {sortBy === option.value && (
                              <Check className="h-4 w-4 text-[#C9A84C]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center bg-[#F5F5F0] rounded-lg p-1 border border-border">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === 'grid'
                        ? 'bg-[#2D2D2D] text-white shadow-sm'
                        : 'text-gray-500 hover:text-[#2D2D2D]'
                    )}
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === 'list'
                        ? 'bg-[#2D2D2D] text-white shadow-sm'
                        : 'text-gray-500 hover:text-[#2D2D2D]'
                    )}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products — crossfades + slides in whenever filters/sort/page change */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeCategory}|${priceRange.join('-')}|${selectedColors.join(',')}|${selectedSizes.join(',')}|${selectedRating ?? 'any'}|${sortBy}|${debouncedSearch.trim()}|${currentPage}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={MICRO}
              >
                <ProductContent
                  products={paginatedProducts}
                  loading={loading}
                  error={error}
                  viewMode={viewMode}
                  hasActiveFilters={false}
                  searchQuery={searchQuery}
                  activeCategory={activeCategory}
                  priceRange={priceRange}
                  selectedColors={selectedColors}
                  selectedSizes={selectedSizes}
                  selectedRating={selectedRating}
                  compareList={compareList}
                  onCompareToggle={handleCompareToggle}
                  onQuickView={(p: any) => { setQuickViewProduct(p); setIsQuickViewOpen(true); }}
                  onClearFilters={clearFilters}
                  setSearchQuery={setSearchQuery}
                  setActiveCategory={handleCategoryClick}
                  setPriceRange={setPriceRange}
                  setSelectedColors={setSelectedColors}
                  setSelectedSizes={setSelectedSizes}
                  setSelectedRating={setSelectedRating}
                />
              </motion.div>
            </AnimatePresence>

            {/* Pagination */}
            {!loading && !error && totalResults > 0 && (
              <>
                <motion.p
                  key={`${rangeStart}-${rangeEnd}-${totalResults}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={MICRO}
                  className="mt-8 text-center text-sm text-muted tabular-nums"
                >
                  Showing <span className="text-[#2D2D2D] font-semibold">{rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}</span> of{' '}
                  <span className="text-[#2D2D2D] font-semibold">{totalResults.toLocaleString()}</span> products
                </motion.p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setShowFilterDrawer(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={SPRING_EDGE}
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[#2D2D2D] text-lg tracking-tight">Filters</h2>
                  {activeFilterCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={SPRING_EDGE}
                      className="text-xs bg-[#C9A84C] text-[#1A1A1A] rounded-full px-1.5 py-0.5 leading-none font-bold"
                    >
                      {activeFilterCount}
                    </motion.span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-muted hover:text-[#A16207] transition-colors font-medium"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className="p-2 hover:bg-surface-alt rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label="Close filters"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {filterContent}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
        </div>
    </MotionConfig>
  );
}

export default function ProductsPageWithSuspense() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-4 w-4 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] mx-auto animate-spin" />
          <p className="mt-3 text-sm text-muted">Loading the collection…</p>
        </div>
      </div>
    }>
      <ProductsPage />
    </Suspense>
  );
}
