'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Loader2, Package, TrendingUp, TrendingDown, AlertTriangle,
  ArrowUpDown, RotateCcw, Trash2, History, DollarSign, Box,
  ChevronDown, ChevronLeft, ChevronRight, ArrowRight, Calendar,
  BarChart3, Flame, Snail, Tag, ShoppingCart, RefreshCw,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { api, InventoryRecord, InventoryStats, InventoryAnalytics } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

type SortKey = 'createdAt' | 'product' | 'type' | 'quantity' | 'newStock' | 'notes' | 'performedBy';
type SortOrder = 'asc' | 'desc';

const typeConfig: Record<string, { label: string; color: string; icon: any; sign: string }> = {
  in:          { label: 'Stock In',   color: 'bg-green-100 text-green-700',   icon: TrendingUp,   sign: '+' },
  out:         { label: 'Stock Out',  color: 'bg-red-100 text-red-700',       icon: TrendingDown,  sign: '-' },
  adjustment:  { label: 'Adjustment', color: 'bg-blue-100 text-blue-700',     icon: ArrowUpDown,   sign: ''  },
  return:      { label: 'Return',     color: 'bg-purple-100 text-purple-700', icon: RotateCcw,     sign: '+' },
  damage:      { label: 'Damaged',    color: 'bg-red-100 text-red-700',       icon: Trash2,        sign: '-' },
  initial:     { label: 'Initial',    color: 'bg-gray-100 text-gray-700',     icon: Package,       sign: ''  },
  sale:        { label: 'Sale',       color: 'bg-orange-100 text-orange-700', icon: DollarSign,    sign: '-' },
};

const columnConfig: Record<SortKey, { label: string; sortable: boolean }> = {
  createdAt:    { label: 'Date', sortable: true },
  product:     { label: 'Product', sortable: true },
  type:        { label: 'Type', sortable: true },
  quantity:    { label: 'Qty', sortable: true },
  newStock:    { label: 'Stock Change', sortable: true },
  notes:       { label: 'Notes', sortable: false },
  performedBy: { label: 'By', sortable: true },
};

const typeOptions = [
  { value: '',           label: 'All Types'    },
  { value: 'in',        label: 'Stock In'     },
  { value: 'out',       label: 'Stock Out'    },
  { value: 'adjustment',label: 'Adjustment'   },
  { value: 'return',    label: 'Return'       },
  { value: 'damage',    label: 'Damage'       },
  { value: 'initial',   label: 'Initial Stock'},
];

const CAT_COLORS = [
  'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
  'bg-rose-500',  'bg-cyan-500', 'bg-orange-500','bg-indigo-500',
];

function SkeletonRow() {
  return (
    <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
  );
}

export default function InventoryPage() {
  const [stats,         setStats]         = useState<InventoryStats | null>(null);
  const [analytics,     setAnalytics]     = useState<InventoryAnalytics | null>(null);
  const [inventory,     setInventory]     = useState<InventoryRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);
  const [period,        setPeriod]        = useState(30);
  const [sortKey,       setSortKey]       = useState<SortKey>('createdAt');
  const [sortOrder,     setSortOrder]     = useState<SortOrder>('desc');

  const LIMIT = 50;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await api.inventory.getStats();
      setStats(data);
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const data = await api.inventory.getAnalytics(period);
      setAnalytics(data);
    } catch {}
    finally { setAnalyticsLoading(false); }
  }, [period]);

  const fetchInventory = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: currentPage, limit: LIMIT };
      if (typeFilter) params.type = typeFilter;
      if (startDate)  params.startDate = startDate;
      if (endDate)    params.endDate   = endDate;
      const data = await api.inventory.getAll(params);
      setInventory(data.inventory || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, startDate, endDate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { setPage(1); }, [typeFilter, startDate, endDate]);
  useEffect(() => { fetchInventory(page); }, [fetchInventory, page]);

  const filteredInventory = useMemo(() => {
    let result = inventory.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.product?.name?.toLowerCase().includes(q) ||
        item.product?.category?.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'product':
          aVal = a.product?.name || '';
          bVal = b.product?.name || '';
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'quantity':
          aVal = a.quantity || 0;
          bVal = b.quantity || 0;
          break;
        case 'newStock':
          aVal = (a.newStock || 0) - (a.previousStock || 0);
          bVal = (b.newStock || 0) - (b.previousStock || 0);
          break;
        case 'notes':
          aVal = a.notes || '';
          bVal = b.notes || '';
          break;
        case 'performedBy':
          aVal = a.performedBy?.name || '';
          bVal = b.performedBy?.name || '';
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
  }, [inventory, searchQuery, sortKey, sortOrder]);

  const healthTotal = analytics
    ? analytics.stockHealth.inStock + analytics.stockHealth.lowStock + analytics.stockHealth.outOfStock
    : 0;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#C9A84C] rounded-full" />
              Inventory
            </h1>
            <p className="text-gray-500 mt-1 ml-5">Stock levels, movements and performance</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Period:</span>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === d
                    ? 'bg-[#C9A84C] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >{d}d</button>
            ))}
          </div>
        </div>

        {/* Top KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Stock',     value: stats?.totalStock.toLocaleString() ?? '—',    icon: Package,       bg: 'from-[#C9A84C] to-[#B8953F]',   shadow: 'shadow-[#C9A84C]/20' },
            { label: 'Inventory Value', value: formatPrice(stats?.totalValue ?? 0),            icon: DollarSign,    bg: 'from-green-500 to-green-600',    shadow: 'shadow-green-500/20' },
            { label: 'Low Stock',       value: String(stats?.lowStockProducts ?? '—'),         icon: AlertTriangle, bg: 'from-amber-500 to-amber-600',    shadow: 'shadow-amber-500/20' },
            { label: 'Out of Stock',    value: String(stats?.outOfStockProducts ?? '—'),       icon: Box,           bg: 'from-red-500 to-red-600',        shadow: 'shadow-red-500/20' },
          ].map((card, i) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center shadow-lg ${card.shadow} mb-3`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? <span className="block h-7 w-24 bg-gray-100 rounded animate-pulse mt-1" /> : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Today activity + stock health */}
        {!statsLoading && stats && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-xl text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-medium">{stats.todayIn} in</span>
              <span className="text-green-500">today</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-sm">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-red-700 font-medium">{stats.todayOut} out</span>
              <span className="text-red-500">today</span>
            </div>
          </div>
        )}

        {/* ── Analytics section ─────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Best Performing Products */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Top Products
              </h2>
              <span className="text-xs text-gray-400">Last {period} days · by revenue</span>
            </div>
            {analyticsLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !analytics || analytics.topProducts.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">No sales data for this period</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {analytics.topProducts.map((p, i) => (
                  <Link
                    key={String(p._id)}
                    href={`/products/${p._id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-amber-50/40 transition-colors"
                  >
                    <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-[#C9A84C]' : 'text-gray-400'}`}>
                      {i + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-gray-400 m-auto mt-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatPrice(p.netRevenue)}</p>
                      <p className="text-xs text-gray-400">
                        {p.netSold} sold
                        {p.unitsRefunded > 0 && <span className="text-orange-400"> · -{p.unitsRefunded} ret.</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 w-16">
                      <p className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-500' : p.stock <= 10 ? 'text-amber-500' : 'text-green-600'}`}>
                        {p.stock === 0 ? 'Out' : `${p.stock} left`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" /> By Category
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Last {period} days</p>
            </div>
            {analyticsLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !analytics || analytics.topCategories.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">No data</div>
            ) : (
              <div className="p-5 space-y-4">
                {analytics.topCategories.map((cat, i) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${CAT_COLORS[i % CAT_COLORS.length]}`} />
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{formatPrice(cat.netRevenue)}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{cat.share}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CAT_COLORS[i % CAT_COLORS.length]}`}
                        style={{ width: `${cat.share}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{cat.netSold} units · {cat.productCount} product{cat.productCount !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Slow movers + Stock health */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Slow Movers */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Snail className="w-4 h-4 text-gray-400" /> Slow Movers
              </h2>
              <span className="text-xs text-gray-400">In stock · 0 sales in {period}d</span>
            </div>
            {analyticsLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !analytics || analytics.slowMovers.length === 0 ? (
              <div className="p-10 text-center text-green-600 text-sm font-medium">All products moved in this period!</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {analytics.slowMovers.map(p => (
                  <Link
                    key={String(p._id)}
                    href={`/products/${p._id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-gray-400 m-auto mt-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-semibold text-amber-600">{p.stock} units</span>
                      <p className="text-xs text-gray-400">in stock</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Stock Health */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" /> Stock Health
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">All variants</p>
            </div>
            {analyticsLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : analytics ? (
              <div className="p-5 space-y-5">
                {[
                  { label: 'Healthy (>10)',    value: analytics.stockHealth.inStock,    color: 'bg-green-500',  text: 'text-green-700'  },
                  { label: 'Low Stock (≤10)',  value: analytics.stockHealth.lowStock,   color: 'bg-amber-400',  text: 'text-amber-700'  },
                  { label: 'Out of Stock',     value: analytics.stockHealth.outOfStock, color: 'bg-red-500',    text: 'text-red-700'    },
                ].map(row => {
                  const pct = healthTotal > 0 ? Math.round((row.value / healthTotal) * 100) : 0;
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm text-gray-600">{row.label}</span>
                        <span className={`text-sm font-bold ${row.text}`}>{row.value} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-gray-100 grid grid-cols-3 text-center">
                  <div>
                    <p className="text-lg font-black text-gray-900">{healthTotal}</p>
                    <p className="text-xs text-gray-400">Total variants</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#C9A84C]">{stats?.totalProducts ?? '—'}</p>
                    <p className="text-xs text-gray-400">Products</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900">{stats?.totalStock ?? '—'}</p>
                    <p className="text-xs text-gray-400">Units</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Movements table ───────────────────────────────── */}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or category…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 transition-all"
            />
          </div>

          <div className="w-full sm:w-44 relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 appearance-none cursor-pointer"
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 text-sm"
              />
            </div>
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 text-sm"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-[#C9A84C]" /> Stock Movements
            </h2>
            {!loading && <span className="text-sm text-gray-500">{total.toLocaleString()} records</span>}
          </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C] mx-auto" />
                  </td></tr>
                ) : filteredInventory.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No inventory records found
                  </td></tr>
                ) : filteredInventory.map(record => {
                  const config = typeConfig[record.type] || typeConfig.adjustment;
                  const TypeIcon = config.icon;
                  const stockChange = record.newStock - record.previousStock;
                  return (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(record.createdAt)}</td>
                      <td className="px-6 py-4">
                        <Link href={`/products/${record.product?._id}`} className="font-medium text-gray-900 hover:text-[#C9A84C] transition-colors">
                          {record.product?.name || 'Unknown Product'}
                        </Link>
                        <p className="text-xs text-gray-400">{record.product?.category}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}>
                          <TypeIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{config.sign}{record.quantity}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-gray-500">{record.previousStock}</span>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className={`font-semibold ${stockChange > 0 ? 'text-green-600' : stockChange < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            {record.newStock}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[180px] truncate">{record.notes || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{record.performedBy?.name || 'System'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${pageNum === page ? 'bg-[#C9A84C] text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
