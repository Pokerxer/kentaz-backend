'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Grid3X3, List, X, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Star, ArrowUpDown } from 'lucide-react';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductContent } from '@/components/shop/ProductContent';

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', navy: '#1e3a5f', red: '#dc2626',
  pink: '#ec4899', brown: '#92400e', green: '#16a34a', yellow: '#eab308',
  purple: '#9333ea', orange: '#ea580c', gray: '#6b7280', blue: '#2563eb',
  beige: '#d4b896', cream: '#f5f0e8', gold: '#d4a000', silver: '#9ca3af',
  teal: '#0d9488', maroon: '#7f1d1d', khaki: '#c3b091', olive: '#6b7c32',
  nude: '#e8c4a0', tan: '#d2b48c', mint: '#98d8c8', coral: '#ff7f7f',
};

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
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-gray-900 text-white text-xs rounded-full font-medium">
      {color && (
        <span className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: color }} />
      )}
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
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
      <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
      <div
        className="absolute h-1.5 bg-gray-900 rounded-full pointer-events-none"
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
        className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-gray-900 rounded-full shadow-md pointer-events-none"
        style={{ left: `${loP}%`, zIndex: 6 }}
      />
      <div
        className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-gray-900 rounded-full shadow-md pointer-events-none"
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="text-xs bg-gray-900 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
              {count}
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform duration-200", expanded && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
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
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={cn(
              "min-w-[2.5rem] px-3 py-2 text-sm rounded-lg border transition-colors",
              p === currentPage
                ? "bg-gray-900 text-white border-gray-900 font-medium"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const collectionParam = searchParams.get('collection');
  const categoryParam = searchParams.get('category');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    const seen = new Map<string, string>();
    for (const p of products) {
      for (const v of p.variants || []) {
        if (v.color) {
          const key = v.color.trim().toLowerCase();
          if (!seen.has(key)) seen.set(key, v.color.trim());
        }
      }
    }
    return Array.from(seen.entries())
      .map(([key, displayName]) => ({
        value: key,
        name: displayName,
        hex: COLOR_HEX_MAP[key] ?? null,
      }))
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

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/api/store/products?limit=200&page=1`);
        if (!res.ok) throw new Error('Failed to fetch products');
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
              fetch(`${apiUrl}/api/store/products?limit=200&page=${i + 2}`)
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

  useEffect(() => {
    if (collectionParam) setActiveCategory(collectionParam);
  }, [collectionParam]);

  useEffect(() => {
    if (categoryParam && categoryParam !== 'all') setActiveCategory(categoryParam);
  }, [categoryParam]);

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
      result = result.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());
    }

    // Use min price across all variants (not just first)
    result = result.filter(p => {
      const minPrice = getMinPrice(p);
      return minPrice === 0 || (minPrice >= priceRange[0] && minPrice <= priceRange[1]);
    });

    if (selectedColors.length > 0) {
      result = result.filter(p =>
        p.variants?.some(v => v.color && selectedColors.includes(v.color.toLowerCase()))
      );
    }

    if (selectedSizes.length > 0) {
      result = result.filter(p =>
        p.variants?.some(v => v.size && selectedSizes.includes(v.size))
      );
    }

    if (selectedRating !== null) {
      result = result.filter(p => (p.ratings?.avg || 0) >= selectedRating);
    }

    // Tokenized search with relevance scoring across name, category, subcategory, tags, description
    let searchScores: Map<string, number> | null = null;
    if (debouncedSearch.trim()) {
      const tokens = debouncedSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const scored = result.map(p => {
        const name = p.name.toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const subcat = (p.subcategory || '').toLowerCase();
        const tags = (p.tags || []).join(' ').toLowerCase();

        let score = 0;
        for (const token of tokens) {
          // Name: highest weight
          if (name === token) score += 40;
          else if (name.startsWith(token + ' ')) score += 25;
          else if (name.includes(token)) score += 15;
          // Category / subcategory
          if (cat === token || subcat === token) score += 10;
          else if (cat.includes(token) || subcat.includes(token)) score += 6;
          // Tags
          if (tags.split(' ').includes(token)) score += 8;
          else if (tags.includes(token)) score += 4;
          // Description: lowest weight
          if (desc.includes(token)) score += 1;
        }
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
    if (handle === 'all') {
      router.push('/products');
    } else {
      router.push(`/products?category=${encodeURIComponent(handle)}`);
    }
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
                  <button
                    onClick={() => { handleCategoryClick(category.handle); setShowFilterDrawer(false); }}
                    className={cn(
                      "w-full text-left flex items-center justify-between py-2 px-3 rounded-lg transition-all",
                      isActive ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <span className="text-sm">{category.name}</span>
                    <span className={cn("text-xs", isActive ? 'text-gray-300' : 'text-gray-400')}>{count}</span>
                  </button>
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
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Max</label>
              <input
                type="number"
                placeholder={`${priceStats.max.toLocaleString()}`}
                value={priceRange[1] === priceStats.max ? '' : priceRange[1]}
                onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value) || priceStats.max])}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                        ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2 scale-105"
                        : "border-gray-200 hover:border-gray-400"
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
                      "px-3 py-1.5 text-sm rounded-lg border transition-all",
                      isSelected
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-900 hover:bg-gray-50"
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
                  isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < option.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
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
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
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
                      label={opt?.name ?? c}
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
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors px-1 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Filter & Sort Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilterDrawer(true)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors lg:hidden whitespace-nowrap"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between sm:gap-4 gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {filteredAndSortedProducts.length} products
                </span>

                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    <span>Sort:</span>
                    <span className="text-gray-900">
                      {debouncedSearch.trim() && sortBy === 'featured'
                        ? 'Relevance'
                        : sortOptions.find(o => o.value === sortBy)?.label}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform duration-200", showSortDropdown && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                      >
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm transition-colors",
                              sortBy === option.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
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

            {/* Pagination */}
            {!loading && !error && totalResults > 0 && (
              <>
                <p className="mt-8 text-center text-sm text-gray-500">
                  Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {totalResults.toLocaleString()} products
                </p>
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
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setShowFilterDrawer(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 text-lg">Filters</h2>
                  {activeFilterCount > 0 && (
                    <span className="text-xs bg-gray-900 text-white rounded-full px-1.5 py-0.5 leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
  );
}

export default function ProductsPageWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProductsPage />
    </Suspense>
  );
}
