'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
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
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

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

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [exporting, setExporting] = useState(false);

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
    setLoading(true);
    try {
      const params: Record<string, any> = { page: currentPage, limit: LIMIT };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (subcategoryFilter) params.subcategory = subcategoryFilter;
      const data = await api.products.getAll(params);
      const list = Array.isArray(data) ? (data as any) : (data.products ?? []);
      setProducts(list);
      setTotal(Array.isArray(data) ? list.length : (data.total ?? list.length));
      setTotalPages(Array.isArray(data) ? 1 : (data.totalPages ?? 1));
    } catch {
      setMsg({ text: 'Failed to load products', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, subcategoryFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, subcategoryFilter]);
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

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product._id);
    try {
      await api.products.delete(product._id);
      setMsg({ text: `"${product.name}" deleted.`, type: 'success' });
      fetchProducts(page);
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to delete product', type: 'error' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setMsg(null), 4000);
    }
  };

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

  const Pagination = () =>
    totalPages > 1 ? (
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    ) : null;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#C9A84C] rounded-full" />
              Products
            </h1>
            <p className="text-gray-500 mt-1 ml-5">Manage your product catalogue</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/products/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all shadow-lg shadow-[#C9A84C]/20"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
            <button
              onClick={handleExportAll}
              disabled={products.length === 0 || exporting}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-40"
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
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#C9A84C] text-white shadow-md shadow-[#C9A84C]/20'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
            {categories.length > 0 && (
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 cursor-pointer min-w-[160px]"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
            <input
              type="text"
              placeholder="Subcategory..."
              value={subcategoryFilter}
              onChange={e => setSubcategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] w-40"
            />
            {/* View toggle */}
            <div className="ml-auto flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
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
                    {Object.entries(columnConfig).map(([key, config]) => (
                      <th key={key}
                        className={`px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase ${config.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
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
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedProducts.map(product => {
                    const stockBadge = getStockBadge(product);
                    const isDeleting = deletingId === product._id;
                    return (
                      <tr
                        key={product._id}
                        className={`hover:bg-gray-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}
                      >
                        <td className="px-6 py-4">
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
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.variants?.[0]?.sku ? (
                                <p className="text-xs text-gray-400 font-mono">{product.variants[0].sku}</p>
                              ) : (
                                <p className="text-xs text-gray-400">{product.variants?.length ?? 0} variant{product.variants?.length !== 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {product.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(product as any).subcategory ? (
                            <span className="inline-flex items-center px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                              {(product as any).subcategory}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColors[product.status] || 'bg-gray-100 text-gray-600'}`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatPrice(getMinPrice(product))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{getStockCount(product)} units</span>
                            {stockBadge && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge.color}`}>
                                <AlertTriangle className="h-3 w-3" />
                                {stockBadge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/products/${product._id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="View">
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link href={`/products/${product._id}/edit`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#C9A84C] transition-colors" title="Edit">
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(product)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                              title="Delete"
                            >
                              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
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
                const isDeleting = deletingId === product._id;
                return (
                  <div
                    key={product._id}
                    className={`group relative bg-white rounded-2xl border border-gray-100 hover:border-[#C9A84C]/30 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col ${isDeleting ? 'opacity-50' : ''}`}
                  >
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

                      {/* Status badge */}
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColors[product.status] || 'bg-gray-100 text-gray-600'}`}>
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
                          href={`/products/${product._id}`}
                          className="p-2 bg-white rounded-xl text-gray-700 hover:text-[#C9A84C] shadow-md transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/products/${product._id}/edit`}
                          className="p-2 bg-white rounded-xl text-gray-700 hover:text-[#C9A84C] shadow-md transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={isDeleting}
                          className="p-2 bg-white rounded-xl text-gray-700 hover:text-red-600 shadow-md transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{product.name}</p>
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
    </AdminLayout>
  );
}
