'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  LayoutGrid,
  LayoutList,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Download,
  Printer,
  X,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuthStore } from '@/store/auth-store';

function exportProductsCSV(products: Product[]) {
  const headers = ['Name', 'Category', 'Subcategory', 'Status', 'SKU', 'Price', 'Stock', 'Tags'];
  const rows = products.map(p => [
    p.name || '',
    p.category || '',
    (p as any).subcategory || '',
    p.status || '',
    p.variants?.[0]?.sku || '',
    p.variants?.[0]?.price?.toString() || '',
    p.variants?.reduce((s, v) => s + (v.stock || 0), 0).toString() || '0',
    p.tags?.join('; ') || '',
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'name' | 'category' | 'subcategory' | 'status' | 'price' | 'stock';
type SortOrder = 'asc' | 'desc';

const columnConfig: Record<SortKey, { label: string; sortable: boolean }> = {
  name:        { label: 'Product', sortable: true },
  category:    { label: 'Category', sortable: true },
  subcategory: { label: 'Subcategory', sortable: true },
  status:      { label: 'Status', sortable: true },
  price:       { label: 'Price', sortable: true },
  stock:       { label: 'Stock', sortable: true },
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-500',
};

const LIMIT = 100;

function readPage(value: string | null) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readSortKey(value: string | null): SortKey {
  return value && value in columnConfig ? value as SortKey : 'name';
}

function readSortOrder(value: string | null): SortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(() => readPage(searchParams.get('page')));
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') || '');
  const [subcategoryFilter, setSubcategoryFilter] = useState(() => searchParams.get('subcategory') || '');
  const [categories, setCategories] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => searchParams.get('view') === 'grid' ? 'grid' : 'list');
  const [sortKey, setSortKey] = useState<SortKey>(() => readSortKey(searchParams.get('sort')));
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => readSortOrder(searchParams.get('order')));
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const requestId = useRef(0);

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const data = await api.products.getAll({ limit: 10000 });
      const list = Array.isArray(data) ? data : (data.products ?? []);
      exportProductsCSV(list);
    } catch {
      setMsg({ text: 'Failed to export products', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const fetchProducts = useCallback(async (currentPage: number) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const params: Record<string, any> = { page: currentPage, limit: LIMIT };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (subcategoryFilter) params.subcategory = subcategoryFilter;
      const data = await api.products.getAll(params);
      if (currentRequest !== requestId.current) return;
      const list = Array.isArray(data) ? (data as any) : (data.products ?? []);
      const nextTotalPages = Math.max(1, Array.isArray(data) ? 1 : (data.totalPages ?? 1));
      setProducts(list);
      setTotal(Array.isArray(data) ? list.length : (data.total ?? list.length));
      setTotalPages(nextTotalPages);
      if (currentPage > nextTotalPages) setPage(nextTotalPages);
    } catch {
      if (currentRequest === requestId.current) setMsg({ text: 'Failed to load products', type: 'error' });
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, subcategoryFilter]);

  // Search only after the cashier pauses typing. This avoids a request and a
  // history update for every key press while keeping the field responsive.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch !== search) {
        setSearch(nextSearch);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, search]);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (subcategoryFilter) params.set('subcategory', subcategoryFilter);
    if (view === 'grid') params.set('view', view);
    if (sortKey !== 'name') params.set('sort', sortKey);
    if (sortOrder !== 'asc') params.set('order', sortOrder);
    return params.toString();
  }, [page, search, statusFilter, categoryFilter, subcategoryFilter, view, sortKey, sortOrder]);

  const returnTo = `${pathname}${listQuery ? `?${listQuery}` : ''}`;
  const productHref = useCallback((id: string, edit = false) => {
    const destination = `/products/${id}${edit ? '/edit' : ''}`;
    return `${destination}?from=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);

  // The URL is the durable list state. It survives details, edits, refreshes,
  // copied links and browser Back without adding a history entry per filter.
  useEffect(() => {
    const nextUrl = `${pathname}${listQuery ? `?${listQuery}` : ''}`;
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    if (nextUrl !== currentUrl) router.replace(nextUrl, { scroll: false });
  }, [pathname, listQuery, router, searchParams]);

  // Selection only ever means "these rows, as shown". Carrying it across a
  // filter or page change would let you print tags for products you can no
  // longer see.
  useEffect(() => {
    setSelected(new Set());
  }, [page, search, statusFilter, categoryFilter, subcategoryFilter]);
  useEffect(() => { fetchProducts(page); }, [fetchProducts, page]);

  useEffect(() => {
    api.categories.getAll()
      .then(data => {
        const cats = Array.isArray(data) ? data : [];
        setCategories(cats.map((c: any) => c.name || c).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  const sortedProducts = useMemo(() => {
    const result = [...products];
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'subcategory':
          aVal = (a as any).subcategory || '';
          bVal = (b as any).subcategory || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'price':
          aVal = Math.min(...(a.variants?.map(v => v.price || 0) || [0]));
          bVal = Math.min(...(b.variants?.map(v => v.price || 0) || [0]));
          break;
        case 'stock':
          aVal = a.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
          bVal = b.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
          break;
        default:
          return 0;
      }
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [products, sortKey, sortOrder]);

  const getStockCount = (product: Product) =>
    product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

  const getMinPrice = (product: Product) => {
    const prices = product.variants?.map(v => v.price).filter(p => p > 0) || [];
    return prices.length ? Math.min(...prices) : 0;
  };

  const getStockBadge = (product: Product) => {
    const stock = getStockCount(product);
    if (stock === 0) return { label: 'Out of stock', color: 'bg-red-100 text-red-600' };
    if (stock <= 5) return { label: `Low stock`, color: 'bg-amber-100 text-amber-700' };
    return null;
  };

  const paginationItems = useMemo(() => {
    const visible = new Set([1, totalPages, page - 1, page, page + 1]);
    const pages = Array.from(visible)
      .filter(value => value >= 1 && value <= totalPages)
      .sort((a, b) => a - b);
    const items: Array<number | string> = [];
    pages.forEach((value, index) => {
      const previous = pages[index - 1];
      if (previous && value - previous > 1) items.push(`ellipsis-${previous}`);
      items.push(value);
    });
    return items;
  }, [page, totalPages]);

  const Pagination = () =>
    totalPages > 1 ? (
      <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-700">{((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)}</span> of{' '}
          <span className="font-medium text-gray-700">{total}</span>
        </p>
        <nav className="flex items-center gap-1" aria-label="Product pages">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {paginationItems.map(item => typeof item === 'number' ? (
            <button
              key={item}
              onClick={() => setPage(item)}
              aria-label={`Page ${item}`}
              aria-current={page === item ? 'page' : undefined}
              className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                page === item
                  ? 'bg-[#C9A84C] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="w-7 text-center text-gray-400" aria-hidden="true">…</span>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    ) : null;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#C9A84C] rounded-full" />
              Products
            </h1>
            <p className="text-gray-500 mt-1 ml-5">Manage your product catalogue</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link
                href="/products/new"
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all shadow-lg shadow-[#C9A84C]/20 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            )}
            <button
              onClick={handleExportAll}
              disabled={products.length === 0 || exporting}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
            </button>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            msg.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-green-50 text-green-700 border-green-100'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Filters + View Toggle */}
        <div className="mb-5 space-y-3">
          {/* Row 1: search + view toggle */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Clear product search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-[#C9A84C] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="List view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-[#C9A84C] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Row 2: status + category + subcategory — scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#C9A84C] text-white shadow-md shadow-[#C9A84C]/20'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
            {categories.length > 0 && (
              <div className="relative flex-none">
                <select
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 cursor-pointer min-w-[140px]"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}
            <input
              type="text"
              placeholder="Subcategory..."
              value={subcategoryFilter}
              onChange={e => { setSubcategoryFilter(e.target.value); setPage(1); }}
              className="flex-none px-3 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] w-36 bg-white"
            />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-[#C9A84C]" />
              Product Catalogue
            </h2>
            {!loading && <span className="text-sm text-gray-400">{total} products</span>}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No products found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new product</p>
              <Link
                href="/products/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            </div>
          ) : view === 'list' ? (
            // ── List view ──────────────────────────────────────────────
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all products on this page"
                        checked={sortedProducts.length > 0 && selected.size === sortedProducts.length}
                        ref={el => {
                          if (el) el.indeterminate = selected.size > 0 && selected.size < sortedProducts.length;
                        }}
                        onChange={e =>
                          setSelected(e.target.checked ? new Set(sortedProducts.map(p => p._id)) : new Set())
                        }
                        className="h-4 w-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]/30"
                      />
                    </th>
                    {Object.entries(columnConfig).map(([key, config]) => (
                      <th key={key}
                        className={`px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase
                          ${key === 'subcategory' ? 'hidden lg:table-cell' : ''}
                          ${key === 'status' ? 'hidden sm:table-cell' : ''}
                          ${config.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                        onClick={() => config.sortable && handleSort(key as SortKey)}
                      >
                        <span className="flex items-center gap-1">
                          {config.label}
                          {config.sortable && sortKey === key && (
                            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedProducts.map(product => {
                    const stockBadge = getStockBadge(product);
                    return (
                      <tr
                        key={product._id}
                        className={`transition-colors ${selected.has(product._id) ? 'bg-[#C9A84C]/5' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${product.name}`}
                            checked={selected.has(product._id)}
                            onChange={() => toggleSelected(product._id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]/30"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
                              {product.images?.[0]?.url ? (
                                <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-300">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={productHref(product._id, true)}
                                className="font-medium text-gray-900 hover:text-[#C9A84C] transition-colors line-clamp-1"
                              >
                                {product.name}
                              </Link>
                              {product.variants?.[0]?.sku ? (
                                <p className="text-xs text-gray-400 font-mono">{product.variants[0].sku}</p>
                              ) : (
                                <p className="text-xs text-gray-400">{product.variants?.length ?? 0} variant{product.variants?.length !== 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium whitespace-nowrap">
                            {product.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {(product as any).subcategory ? (
                            <span className="inline-flex items-center px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                              {(product as any).subcategory}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColors[product.status] || 'bg-gray-100 text-gray-600'}`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {formatPrice(getMinPrice(product))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 whitespace-nowrap">{getStockCount(product)} units</span>
                            {stockBadge && (
                              <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge.color}`}>
                                <AlertTriangle className="h-3 w-3" />
                                {stockBadge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={productHref(product._id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="View">
                              <Eye className="h-4 w-4" />
                            </Link>
                            {isAdmin && (
                              <Link href={productHref(product._id, true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#C9A84C] transition-colors" title="Edit">
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // ── Grid view ──────────────────────────────────────────────
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedProducts.map(product => {
                const stockBadge = getStockBadge(product);
                return (
                  <div
                    key={product._id}
                    className={`group relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                      selected.has(product._id)
                        ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C]/10'
                        : 'border-gray-100 hover:border-[#C9A84C]/30 hover:shadow-lg'
                    }`}
                  >
                    <label className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm cursor-pointer">
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={selected.has(product._id)}
                        onChange={() => toggleSelected(product._id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]/30 block"
                      />
                    </label>

                    {/* Image */}
                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-200">
                          <Package className="h-10 w-10" />
                        </div>
                      )}

                      {/* Status badge — sits bottom-left; the select checkbox
                          owns the top-left corner. */}
                      <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColors[product.status] || 'bg-gray-100 text-gray-600'}`}>
                        {product.status}
                      </span>

                      {/* Stock warning */}
                      {stockBadge && (
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-0.5 ${stockBadge.color}`}>
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {stockBadge.label}
                        </span>
                      )}

                      {/* Action overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Link
                          href={productHref(product._id)}
                          className="p-2 bg-white rounded-xl text-gray-700 hover:text-[#C9A84C] shadow-md transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <Link
                            href={productHref(product._id, true)}
                            className="p-2 bg-white rounded-xl text-gray-700 hover:text-[#C9A84C] shadow-md transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <Link href={productHref(product._id, true)} className="text-sm font-semibold text-gray-900 hover:text-[#C9A84C] transition-colors leading-tight line-clamp-2">
                        {product.name}
                      </Link>
                      <p className="text-xs text-gray-400">{product.category || 'Uncategorized'}</p>
                      {(product as any).subcategory && (
                        <span className="text-[10px] text-violet-600 font-medium">{(product as any).subcategory}</span>
                      )}
                      {product.variants?.[0]?.sku && (
                        <p className="text-[10px] text-gray-400 font-mono truncate">{product.variants[0].sku}</p>
                      )}
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-[#C9A84C]">{formatPrice(getMinPrice(product))}</span>
                        <span className="text-xs text-gray-400">{getStockCount(product)} units</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{selected.size}</span> selected
          </span>
          <div className="flex-1" />
          <Link
            href={`/products/tags?ids=${Array.from(selected).join(',')}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print tags
          </Link>
        </div>
      )}
    </AdminLayout>
  );
}
