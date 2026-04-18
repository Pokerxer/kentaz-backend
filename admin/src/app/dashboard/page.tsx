'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import {
  api, AnalyticsData, AnalyticsTopProduct,
} from '@/lib/api';
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, BarChart3, Users, AlertCircle,
  RotateCcw, Tag, UserCheck, Package, Clock,
  ChevronRight, Eye,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Helpers ────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '12m';

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function pctLabel(n: number) {
  if (n == null || isNaN(n)) return '0%';
  return `${n >= 0 ? '+' : ''}${n}%`;
}

// ── Sub-components ─────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-2xl ${className}`} />;
}

function TrendBadge({ value }: { value: number | undefined }) {
  const v = value ?? 0;
  const up = v >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pctLabel(v)}
    </span>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, trend, accent,
}: {
  icon: React.ElementType; label: string; value: string;
  sub?: string; trend?: number; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${accent}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-xs mt-1">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
          <span className="text-gray-400">Total</span>
          <span className="font-semibold text-gray-900">
            {fmt(payload.reduce((s: number, p: any) => s + (p.value || 0), 0))}
          </span>
        </div>
      )}
    </div>
  );
}

function BarRow({
  label, value, total, color, showValue = false,
}: {
  label: string; value: number; total: number; color: string; showValue?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 truncate pr-2">{label}</span>
        <span className="font-medium text-gray-800 flex-shrink-0">
          {showValue ? fmt(value) : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, { dot: string; bar: string; badge: string; text: string }> = {
  pending:    { dot: 'bg-amber-400',   bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700',   text: 'Pending'    },
  processing: { dot: 'bg-blue-400',    bar: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700',     text: 'Processing' },
  shipped:    { dot: 'bg-purple-400',  bar: 'bg-purple-400',  badge: 'bg-purple-50 text-purple-700', text: 'Shipped'    },
  delivered:  { dot: 'bg-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700', text: 'Delivered'},
  cancelled:  { dot: 'bg-red-400',     bar: 'bg-red-400',     badge: 'bg-red-50 text-red-600',       text: 'Cancelled'  },
};
const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

function OrderStatusSection({ breakdown, onStatusClick, selectedStatus }: { 
  breakdown: Record<string, number>; 
  onStatusClick?: (status: string | null) => void;
  selectedStatus?: string | null;
}) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
          <ShoppingCart className="w-5 h-5 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-400">No orders yet</p>
        <p className="text-xs text-gray-300">Orders will appear here once placed</p>
      </div>
    );
  }

  const active = (breakdown.pending || 0) + (breakdown.processing || 0) + (breakdown.shipped || 0);

  return (
    <div className="space-y-3">
      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
        <button 
          onClick={() => onStatusClick?.(null)}
          className={`text-center hover:bg-gray-50 rounded-lg -m-1 p-1 transition-colors ${!selectedStatus ? 'bg-gray-50' : ''}`}
        >
          <p className="text-lg font-black text-gray-900">{total}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Total</p>
        </button>
        <button 
          onClick={() => onStatusClick?.('active')}
          className={`text-center border-x border-gray-100 hover:bg-gray-50 -mx-1 p-1 transition-colors ${selectedStatus === 'active' ? 'bg-gray-50' : ''}`}
        >
          <p className="text-lg font-black text-amber-600">{active}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Active</p>
        </button>
        <button 
          onClick={() => onStatusClick?.('delivered')}
          className={`text-center hover:bg-gray-50 rounded-lg -m-1 p-1 transition-colors ${selectedStatus === 'delivered' ? 'bg-gray-50' : ''}`}
        >
          <p className="text-lg font-black text-emerald-600">{breakdown.delivered || 0}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Delivered</p>
        </button>
      </div>

      {/* Per-status rows */}
      {STATUS_ORDER.map(key => {
        const count = breakdown[key] || 0;
        const pct = Math.round((count / total) * 100);
        const cfg = STATUS_COLORS[key];
        const isSelected = selectedStatus === key;
        return (
          <button
            key={key}
            onClick={() => onStatusClick?.(key)}
            className={`w-full flex items-center gap-2.5 py-1 px-1 -mx-1 rounded-lg transition-colors text-left ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">{cfg.text}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-5 text-right flex-shrink-0">{count}</span>
            <span className="text-[10px] text-gray-400 w-7 text-right flex-shrink-0">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

const CATEGORY_COLORS = [
  'bg-[#C9A84C]', 'bg-indigo-500', 'bg-emerald-500',
  'bg-blue-500',  'bg-violet-500', 'bg-rose-500',
];

function TopCategoriesSection({ categories }: { categories: { name: string; revenue: number; qty: number }[] }) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
          <BarChart3 className="w-5 h-5 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-400">No sales data</p>
        <p className="text-xs text-gray-300">Categories appear once sales are recorded</p>
      </div>
    );
  }

  const totalRevenue = categories.reduce((s, c) => s + c.revenue, 0);
  const maxRevenue   = categories[0]?.revenue || 1;

  return (
    <div className="space-y-3">
      {/* Total footer */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <span className="text-[11px] text-gray-400">Total revenue</span>
        <span className="text-xs font-bold text-gray-900">{fmt(totalRevenue)}</span>
      </div>

      {categories.map((c, i) => {
        const pct = Math.round((c.revenue / totalRevenue) * 100);
        const barPct = Math.round((c.revenue / maxRevenue) * 100);
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <div key={`${c.name}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-700 font-medium truncate pr-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                {c.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-gray-400">{c.qty.toLocaleString()} sold</span>
                <span className="font-semibold text-gray-900">{fmt(c.revenue)}</span>
                <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductRow({ product, rank, max, mode }: {
  product: AnalyticsTopProduct; rank: number; max: number; mode: 'revenue' | 'qty';
}) {
  const val = mode === 'revenue' ? product.revenue : product.qty;
  const pct = max > 0 ? Math.round((val / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">{rank}</span>
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="w-9 h-9 rounded-xl object-cover bg-gray-100 flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-800 truncate pr-2">{product.name}</p>
          <p className="text-xs font-semibold text-gray-900 flex-shrink-0">
            {mode === 'revenue' ? fmt(product.revenue) : `${product.qty.toLocaleString()} sold`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {mode === 'revenue' ? `${product.qty.toLocaleString()} sold` : fmt(product.revenue)}
          </span>
        </div>
      </div>
    </div>
  );
}

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped:    'bg-purple-50 text-purple-700',
  delivered:  'bg-emerald-50 text-emerald-700',
  cancelled:  'bg-red-50 text-red-600',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RecentOrdersSection({ orders, onOrderClick, filterStatus }: { 
  orders: { _id: string; total: number; status: string; createdAt: string; itemCount: number; customer: string }[];
  onOrderClick?: (orderId: string) => void;
  filterStatus?: string | null;
}) {
  const filteredOrders = filterStatus && filterStatus !== 'active' 
    ? orders.filter(o => o.status === filterStatus)
    : filterStatus === 'active'
    ? orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status))
    : orders;

  if (filteredOrders.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <ShoppingCart className="w-8 h-8 text-gray-200" />
      <p className="text-sm text-gray-400">{orders.length > 0 ? 'No orders match this filter' : 'No orders yet'}</p>
    </div>
  );
  return (
    <div className="divide-y divide-gray-50">
      {filteredOrders.map(o => (
        <button
          key={o._id}
          onClick={() => onOrderClick?.(o._id)}
          className="w-full flex items-center justify-between py-2.5 gap-3 hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors group text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{o.customer}</p>
              <p className="text-[10px] text-gray-400">{o.itemCount} item{o.itemCount !== 1 ? 's' : ''} · {timeAgo(o.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${ORDER_STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'}`}>
              {o.status}
            </span>
            <span className="text-xs font-semibold text-gray-900">{fmt(o.total)}</span>
            <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
          </div>
        </button>
      ))}
    </div>
  );
}

function TopCashiersSection({ cashiers }: { cashiers: { name: string; revenue: number; count: number }[] }) {
  if (cashiers.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <Users className="w-8 h-8 text-gray-200" />
      <p className="text-sm text-gray-400">No POS data</p>
    </div>
  );
  const max = cashiers[0]?.revenue || 1;
  return (
    <div className="space-y-3">
      {cashiers.map((c, i) => {
        const pct = Math.round((c.revenue / max) * 100);
        return (
          <div key={c.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-700 font-medium truncate pr-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {c.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-gray-400">{c.count} sales</span>
                <span className="font-semibold text-gray-900">{fmt(c.revenue)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LowStockSection({ items }: { items: { _id: string; name: string; category: string; totalStock: number; minStock: number; image: string | null }[] }) {
  if (items.length === 0) return (
    <div className="flex items-center gap-2 text-xs text-emerald-600 py-1">
      <Package className="w-4 h-4" />
      All products are well stocked
    </div>
  );
  return (
    <div className="divide-y divide-gray-50">
      {items.map(p => {
        const pct = p.minStock > 0 ? Math.min(Math.round((p.totalStock / p.minStock) * 100), 100) : 0;
        const urgent = p.totalStock === 0;
        return (
          <div key={p._id} className="flex items-center gap-3 py-2.5">
            {p.image ? (
              <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-3.5 h-3.5 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-800 truncate pr-2">{p.name}</p>
                <span className={`text-[10px] font-bold flex-shrink-0 ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
                  {urgent ? 'Out of stock' : `${p.totalStock} left`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-red-400' : 'bg-amber-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '12m', label: '12M' },
];


export default function DashboardPage() {
  const [period, setPeriod]         = useState<Period>('30d');
  const [data, setData]             = useState<AnalyticsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productTab, setProductTab] = useState<'revenue' | 'qty'>('revenue');
  const [trendChart, setTrendChart] = useState<'area' | 'bar'>('area');
  const [error, setError]           = useState('');
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(curr => curr === status ? null : status);
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders?order=${orderId}`);
  };

  const load = useCallback(async (p: Period, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else { setLoading(true); setData(null); }
      const result = await api.analytics.get(p);
      setData(result);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const xInterval = period === '7d' ? 0 : period === '30d' ? 5 : period === '90d' ? 14 : 0;

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-52" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-72" />
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={() => load(period)}
          className="px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#b8933e] transition-colors"
        >
          Retry
        </button>
      </div>
    </AdminLayout>
  );

  const s              = data!.summary;
  const totalPm        = Object.values(data!.paymentMethods).reduce((a, b) => a + b, 0);
  const periodLabel    = PERIODS.find(p => p.key === period)?.label ?? period;
  const totalCustomers = data!.totalCustomers ?? 0;
  const refunds        = data!.refunds        ?? { count: 0, total: 0 };
  const totalDiscounts = data!.totalDiscounts ?? 0;
  const avgItemsPerTx  = data!.avgItemsPerTx  ?? 0;
  const topCashiers    = data!.topCashiers    ?? [];
  const recentOrders   = data!.recentOrders   ?? [];
  const lowStock       = data!.lowStock       ?? [];

  const sortedProducts = productTab === 'revenue'
    ? [...data!.topProducts].sort((a, b) => b.revenue - a.revenue)
    : [...data!.topProducts].sort((a, b) => b.qty - a.qty);
  const maxProdVal = productTab === 'revenue'
    ? (sortedProducts[0]?.revenue || 1)
    : (sortedProducts[0]?.qty || 1);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    period === p.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(period, true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label={`Revenue (${periodLabel})`}
            value={fmt(s.totalRevenue)}
            sub={`Online ${fmt(s.orderRevenue)} · POS ${fmt(s.posRevenue)}`}
            trend={s.vsRevenue}
            accent="bg-[#C9A84C]"
          />
          <KpiCard
            icon={ShoppingCart}
            label={`Transactions (${periodLabel})`}
            value={s.totalTransactions.toLocaleString()}
            trend={s.vsTransactions}
            accent="bg-blue-500"
          />
          <KpiCard
            icon={BarChart3}
            label="Avg. Transaction"
            value={fmt(s.avgTransactionValue)}
            accent="bg-violet-500"
          />
          <KpiCard
            icon={Users}
            label={`New Customers (${periodLabel})`}
            value={s.newCustomers.toLocaleString()}
            trend={s.vsCustomers}
            accent="bg-emerald-500"
          />
        </div>

        {/* ── Secondary KPI row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={UserCheck}
            label="Total Customers"
            value={totalCustomers.toLocaleString()}
            sub={`${s.newCustomers} new this period`}
            accent="bg-sky-500"
          />
          <KpiCard
            icon={RotateCcw}
            label={`Refunds (${periodLabel})`}
            value={refunds.count.toLocaleString()}
            sub={refunds.count > 0 ? `${fmt(refunds.total)} returned` : 'No refunds'}
            accent="bg-rose-500"
          />
          <KpiCard
            icon={Tag}
            label={`Discounts (${periodLabel})`}
            value={fmt(totalDiscounts)}
            sub="Total discount given (POS)"
            accent="bg-orange-500"
          />
          <KpiCard
            icon={Package}
            label="Avg Items / Sale"
            value={avgItemsPerTx.toLocaleString()}
            sub="Per POS transaction"
            accent="bg-teal-500"
          />
        </div>

        {/* ── Revenue trend + channel / payment breakdown ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Revenue trend chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-semibold text-gray-700">Revenue Trend</p>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setTrendChart('area')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${trendChart === 'area' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Area
                </button>
                <button
                  onClick={() => setTrendChart('bar')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${trendChart === 'bar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Bar
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">Online orders vs POS sales</p>
            <ResponsiveContainer width="100%" height={220}>
              {trendChart === 'area' ? (
                <AreaChart data={data!.trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={xInterval} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="orders" name="Online" stackId="rev" stroke="#6366f1" strokeWidth={2} fill="url(#gradOrders)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="pos" name="POS" stackId="rev" stroke="#C9A84C" strokeWidth={2} fill="url(#gradPos)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              ) : (
                <BarChart data={data!.trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={xInterval} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="orders" name="Online" stackId="rev" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pos" name="POS" stackId="rev" fill="#C9A84C" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-2 bg-indigo-500 rounded-sm inline-block" />
                Online Orders
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-2 bg-[#C9A84C] rounded-sm inline-block" />
                POS Sales
              </span>
            </div>
          </div>

          {/* Right column: channel split + payment methods */}
          <div className="flex flex-col gap-5">

            {/* Sales channel split */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Sales Channel</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      Online Orders
                    </span>
                    <span className="font-semibold text-gray-800">{fmt(s.orderRevenue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${s.totalRevenue ? Math.round(s.orderRevenue / s.totalRevenue * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#C9A84C] inline-block" />
                      POS Sales
                    </span>
                    <span className="font-semibold text-gray-800">{fmt(s.posRevenue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                      style={{ width: `${s.totalRevenue ? Math.round(s.posRevenue / s.totalRevenue * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1">
              <p className="text-sm font-semibold text-gray-700 mb-4">Payment Methods (POS)</p>
              {totalPm === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No POS data</p>
              ) : (
                <div className="space-y-3">
                  <BarRow label="Cash"     value={data!.paymentMethods.cash}     total={totalPm} color="bg-emerald-400" />
                  <BarRow label="Card"     value={data!.paymentMethods.card}     total={totalPm} color="bg-blue-400" />
                  <BarRow label="Transfer" value={data!.paymentMethods.transfer} total={totalPm} color="bg-violet-400" />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Top products + order status + categories ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Top products */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Top Products</p>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setProductTab('revenue')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    productTab === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  By Revenue
                </button>
                <button
                  onClick={() => setProductTab('qty')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    productTab === 'qty' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  By Sales
                </button>
              </div>
            </div>
            {sortedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <BarChart3 className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">No sales data for this period</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sortedProducts.map((p, i) => (
                  <ProductRow key={p._id} product={p} rank={i + 1} max={maxProdVal} mode={productTab} />
                ))}
              </div>
            )}
          </div>

          {/* Order status + top categories */}
          <div className="flex flex-col gap-5">

            {/* Order status */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">
                  Order Pipeline
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">all time</span>
                </p>
                {selectedStatus && (
                  <button 
                    onClick={() => setSelectedStatus(null)}
                    className="text-[10px] text-[#C9A84C] hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <OrderStatusSection 
                breakdown={data!.orderStatusBreakdown} 
                onStatusClick={handleStatusFilter}
                selectedStatus={selectedStatus}
              />
            </div>

            {/* Top categories */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1">
              <p className="text-sm font-semibold text-gray-700 mb-4">Top Categories</p>
              <TopCategoriesSection categories={data!.topCategories} />
            </div>

          </div>
        </div>

        {/* ── Recent Orders + Top Cashiers ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-700">Recent Orders</p>
                {selectedStatus && (
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                    {selectedStatus}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {selectedStatus && (
                  <button 
                    onClick={() => setSelectedStatus(null)}
                    className="text-[10px] text-[#C9A84C] hover:underline"
                  >
                    Clear
                  </button>
                )}
                <a href="/orders" className="text-[10px] text-gray-400 hover:text-[#C9A84C] flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </a>
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="w-3 h-3" /> Live
                </span>
              </div>
            </div>
            <RecentOrdersSection orders={recentOrders} onOrderClick={handleOrderClick} filterStatus={selectedStatus} />
          </div>

          {/* Top Cashiers */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Top Cashiers
              <span className="ml-1.5 text-[10px] font-normal text-gray-400">{periodLabel}</span>
            </p>
            <TopCashiersSection cashiers={topCashiers} />
          </div>

        </div>

        {/* ── Low Stock Alerts ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Low Stock Alerts</p>
            {lowStock.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {lowStock.length} item{lowStock.length !== 1 ? 's' : ''} need restocking
              </span>
            )}
          </div>
          <LowStockSection items={lowStock} />
        </div>

      </div>
    </AdminLayout>
  );
}
