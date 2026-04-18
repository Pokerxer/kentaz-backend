'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Grid3X3, List, X, SlidersHorizontal, ChevronDown, Star, ArrowUpDown, TrendingUp, Clock, Award, Flame } from 'lucide-react';
import { ProductCard, ProductListView } from '@/components/shop/ProductCard';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductContent } from '@/components/shop/ProductContent';

const categories = [
  { name: 'All', handle: 'all' },
  { name: 'Male Fashion', handle: 'Male Fashion' },
  { name: 'Female Fashion', handle: 'Female Fashion' },
  { name: 'Kiddies Fashion', handle: 'Kiddies Fashion' },
  { name: 'Skincare', handle: 'Skincare' },
  { name: 'Luxury Hair', handle: 'Luxury Hair' },
  { name: 'Bags & Purses', handle: 'Bags & Purses' },
  { name: 'Shoes', handle: 'Shoes' },
  { name: 'Accessories', handle: 'Accessories' },
  { name: 'Perfumes', handle: 'Perfumes' },
  { name: 'Gift Items', handle: 'Gift Items' },
];

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Best Selling', value: 'bestselling' },
];

const colorOptions = [
  { name: 'Black', value: 'black', hex: '#000000' },
  { name: 'White', value: 'white', hex: '#FFFFFF' },
  { name: 'Navy', value: 'navy', hex: '#1e3a5f' },
  { name: 'Red', value: 'red', hex: '#dc2626' },
  { name: 'Pink', value: 'pink', hex: '#ec4899' },
  { name: 'Brown', value: 'brown', hex: '#92400e' },
  { name: 'Green', value: 'green', hex: '#16a34a' },
  { name: 'Yellow', value: 'yellow', hex: '#eab308' },
  { name: 'Purple', value: 'purple', hex: '#9333ea' },
  { name: 'Orange', value: 'orange', hex: '#ea580c' },
  { name: 'Gray', value: 'gray', hex: '#6b7280' },
  { name: 'Blue', value: 'blue', hex: '#2563eb' },
];

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

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
  tags?: string[];
  ratings?: { avg: number; count: number };
  createdAt?: string;
}

function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", expanded && "rotate-180")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const [activeCategory, setActiveCategory] = useState(collectionParam || categoryParam || 'all');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
    colors: true,
    sizes: false,
    rating: false,
    availability: true,
  });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    fetch(`${apiUrl}/api/store/products?limit=100`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        const productsArray = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
        setProducts(productsArray);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setError('Failed to load products');
        setProducts([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (collectionParam) {
      setActiveCategory(collectionParam);
    }
  }, [collectionParam]);

  useEffect(() => {
    if (categoryParam && categoryParam !== 'all') {
      setActiveCategory(categoryParam);
    }
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
    const counts: Record<string, number> = { all: (products || []).length };
    (products || []).forEach(p => {
      const cat = p.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    const productsList = products || [];
    let result = [...productsList];

    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }

    result = result.filter(p => {
      const price = p.variants?.[0]?.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
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

    if (inStockOnly) {
      result = result.filter(p => 
        p.variants?.some(v => (v.stock || 0) > 0) || !p.variants || p.variants.length === 0
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0));
        break;
      case 'bestselling':
        result.sort((a, b) => (b.tags?.includes('bestseller') ? 1 : 0) - (a.tags?.includes('bestseller') ? 1 : 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      default:
        result.sort((a, b) => (b.tags?.includes('featured') ? 1 : 0) - (a.tags?.includes('featured') ? 1 : 0));
    }

    return result;
  }, [products, activeCategory, searchQuery, sortBy, priceRange, selectedColors, selectedSizes, selectedRating, inStockOnly]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSortBy('featured');
    setPriceRange([0, 100000]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedRating(null);
    setInStockOnly(false);
    router.push('/products');
  };

  const hasActiveFilters = Boolean(searchQuery || activeCategory !== 'all' || 
    priceRange[0] > 0 || priceRange[1] < 100000 || 
    selectedColors.length > 0 || selectedSizes.length > 0 || 
    selectedRating !== null || inStockOnly);

  const activeFilterCount = [
    searchQuery ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    priceRange[0] > 0 || priceRange[1] < 100000 ? 1 : 0,
    selectedColors.length > 0 ? 1 : 0,
    selectedSizes.length > 0 ? 1 : 0,
    selectedRating !== null ? 1 : 0,
    inStockOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const filterContent = (
    <>
      <FilterSection title="Categories" expanded={expandedSections.categories} onToggle={() => setExpandedSections(s => ({ ...s, categories: !s.categories }))}>
        <div className="px-4 pb-4">
          <ul className="space-y-1">
            {categories.map((category) => {
              const count = categoryCounts[category.handle] || 0;
              const isActive = activeCategory === category.handle;
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

      <FilterSection title="Price" expanded={expandedSections.price} onToggle={() => setExpandedSections(s => ({ ...s, price: !s.price }))}>
        <div className="px-4 pb-4 space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>₦{priceRange[0].toLocaleString()}</span>
            <span>₦{priceRange[1].toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100000"
            step="1000"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange[0] || ''}
              onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="number"
              placeholder="Max"
              value={priceRange[1] === 100000 ? '' : priceRange[1] || ''}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Colors" expanded={expandedSections.colors} onToggle={() => setExpandedSections(s => ({ ...s, colors: !s.colors }))}>
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {colorOptions.map((color) => {
              const isSelected = selectedColors.includes(color.value);
              return (
                <button
                  key={color.value}
                  onClick={() => setSelectedColors(prev => isSelected ? prev.filter(c => c !== color.value) : [...prev, color.value])}
                  className={cn(
                    "relative w-10 h-10 rounded-full border-2 transition-all hover:scale-110",
                    isSelected ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2" : "border-gray-200"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  aria-label={`${color.name} color${isSelected ? ' (selected)' : ''}`}
                />
              );
            })}
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Sizes" expanded={expandedSections.sizes} onToggle={() => setExpandedSections(s => ({ ...s, sizes: !s.sizes }))}>
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSizes(prev => isSelected ? prev.filter(s => s !== size) : [...prev, size])}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg border transition-all",
                    isSelected 
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm" 
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-900 hover:bg-gray-50"
                  )}
                  aria-label={`${size} size${isSelected ? ' (selected)' : ''}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Rating" expanded={expandedSections.rating} onToggle={() => setExpandedSections(s => ({ ...s, rating: !s.rating }))}>
        <div className="px-4 pb-4 space-y-3">
          {ratingOptions.map((option) => {
            const isSelected = selectedRating === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSelectedRating(isSelected ? null : option.value)}
                className={cn("w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left", isSelected ? "bg-gray-100" : "hover:bg-gray-50")}
                aria-label={`${option.label}${isSelected ? ' (selected)' : ''}`}
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

      <FilterSection title="Availability" expanded={expandedSections.availability} onToggle={() => setExpandedSections(s => ({ ...s, availability: !s.availability }))}>
        <div className="px-4 pb-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="peer w-5 h-5 rounded border border-gray-300 checked:border-gray-900 checked:bg-gray-900 transition-all appearance-none cursor-pointer"
              />
              <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="text-sm text-gray-600">In Stock Only</span>
          </label>
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
              <div className="space-y-4">
                {filterContent}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter & Sort Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <button
                  onClick={() => setShowFilterDrawer(true)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors lg:hidden whitespace-nowrap"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {hasActiveFilters && (
                  <span className="hidden lg:inline-flex items-center gap-1.5 text-sm text-gray-500 whitespace-nowrap">
                    <X className="h-3.5 w-3.5" />
                    {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                  </span>
                )}
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
                    <span className="text-gray-900">{sortOptions.find(o => o.value === sortBy)?.label}</span>
                    <ChevronDown className={cn("h-4 w-4 text-gray-400", showSortDropdown && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                      >
                        {sortOptions.map((option) => {
                          const isSelected = sortBy === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                              className={cn(
                                "w-full text-left px-4 py-2 text-sm transition-colors",
                                isSelected ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn("p-2 rounded-md", viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 rounded-md", viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500')}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            <ProductContent
              products={filteredAndSortedProducts}
              loading={loading}
              error={error}
              viewMode={viewMode}
              hasActiveFilters={hasActiveFilters}
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              priceRange={priceRange}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              selectedRating={selectedRating}
              inStockOnly={inStockOnly}
              compareList={compareList}
              onCompareToggle={handleCompareToggle}
              onQuickView={(p: any) => { setQuickViewProduct(p); setIsQuickViewOpen(true); }}
              onClearFilters={clearFilters}
              setSearchQuery={setSearchQuery}
              setActiveCategory={setActiveCategory}
              setPriceRange={setPriceRange}
              setSelectedColors={setSelectedColors}
              setSelectedSizes={setSelectedSizes}
              setSelectedRating={setSelectedRating}
              setInStockOnly={setInStockOnly}
            />
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
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 flex items-center justify-between p-4 safe-area-pb">
                <h2 className="font-semibold text-gray-900 text-lg">Filters</h2>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
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
