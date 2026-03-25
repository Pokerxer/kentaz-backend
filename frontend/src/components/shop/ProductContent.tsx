'use client';

import { ProductCard, ProductListView } from '@/components/shop/ProductCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { X } from 'lucide-react';
import React from 'react';

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

type ProductContentProps = any;

export function ProductContent(props: ProductContentProps) {
  const {
    products,
    loading = false,
    error = null,
    viewMode = 'grid',
    hasActiveFilters = false,
    searchQuery = '',
    activeCategory = 'all',
    priceRange = [0, 100000],
    selectedColors = [],
    selectedSizes = [],
    selectedRating = null,
    inStockOnly = false,
    showCompare = false,
    compareList = [],
    onCompareToggle,
    onQuickView,
    onClearFilters,
    setSearchQuery = () => {},
    setActiveCategory = () => {},
    setPriceRange = () => {},
    setSelectedColors = () => {},
    setSelectedSizes = () => {},
    setSelectedRating = () => {},
    setInStockOnly = () => {},
  } = props;
  return (
    <>
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-100">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              {activeCategory}
              <button onClick={() => setActiveCategory('all')} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(priceRange[0] > 0 || priceRange[1] < 100000) && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              ₦{priceRange[0].toLocaleString()} - ₦{priceRange[1].toLocaleString()}
              <button onClick={() => setPriceRange([0, 100000])} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedColors.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              {selectedColors.length} color{selectedColors.length > 1 ? 's' : ''}
              <button onClick={() => setSelectedColors([])} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSizes.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              {selectedSizes.join(', ')}
              <button onClick={() => setSelectedSizes([])} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedRating !== null && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              {selectedRating}+ stars
              <button onClick={() => setSelectedRating(null)} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {inStockOnly && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              In Stock
              <button onClick={() => setInStockOnly(false)} className="ml-1 hover:text-gray-900">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {error ? (
        <div className="text-center py-16">
          <p className="text-red-500">{error}</p>
        </div>
      ) : products.length === 0 && !loading ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <p className="text-lg font-medium text-gray-900 mb-2">No products found</p>
          <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 rounded-xl" />
                <div className="mt-4 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto" />
                </div>
              </div>
            ))
          ) : (
            products.map((product: Product) => (
              <ProductCard
                key={product._id}
                product={product}
                showCompare={true}
                isComparing={compareList.some((p: Product) => p._id === product._id)}
                onCompareToggle={onCompareToggle}
                onQuickView={onQuickView}
              />
            ))
          )}
        </div>
      ) : (
        <ProductListView
          products={products}
          loading={loading}
          onQuickView={onQuickView}
        />
      )}
    </>
  );
}
