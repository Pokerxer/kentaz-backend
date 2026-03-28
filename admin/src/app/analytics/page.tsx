'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  api, AnalyticsData, AnalyticsTopProduct,
} from '@/lib/api';
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, BarChart3, Users, Loader2, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
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
  return `${n >= 0 ? '+' : ''}${n}%`;
}

// ── Sub-components ─────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-2xl ${className}`} />;
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pctLabel(value)}
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

function ProductRow({ product, rank, maxRevenue }: {
  product: AnalyticsTopProduct; rank: number; maxRevenue: number;
}) {
  const pct = maxRevenue > 0 ? Math.round((product.revenue / maxRevenue) * 100) : 0;
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
          <p className="text-xs font-semibold text-gray-900 flex-shrink-0">{fmt(product.revenue)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{product.qty.toLocaleString()} sold</span>
        </div>
      </div>
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

const STATUS_CONFIG = [
  { key: 'pending',    label: 'Pending',    color: 'bg-yellow-400' },
  { key: 'processing', label: 'Processing', color: 'bg-blue-400' },
  { key: 'shipped',    label: 'Shipped',    color: 'bg-purple-400' },
  { key: 'delivered',  label: 'Delivered',  color: 'bg-emerald-400' },
  { key: 'cancelled',  label: 'Cancelled',  color: 'bg-red-400' },
];

export default function AnalyticsPage() {
  const [period, setPeriod]       = useState<Period>('30d');
  const [data, setData]           = useState<AnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async (p: Period, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else { setLoading(true); setData(null); }
      const result = await api.analytics.get(p);
      setData(result);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  // X-axis tick interval for charts
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

  const s            = data!.summary;
  const totalPm      = Object.values(data!.paymentMethods).reduce((a, b) => a + b, 0);
  const totalOrders  = Object.values(data!.orderStatusBreakdown).reduce((a, b) => a + b, 0);
  const topCatMax    = data!.topCategories[0]?.revenue || 1;
  const maxProdRev   = data!.topProducts[0]?.revenue || 1;
  const periodLabel  = PERIODS.find(p => p.key === period)?.label ?? period;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <div className="flex items-center gap-2">
            {/* Period selector */}
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

        {/* ── Revenue trend + channel / payment breakdown ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Area chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-semibold text-gray-700 mb-1">Revenue Trend</p>
            <p className="text-xs text-gray-400 mb-4">Online orders vs POS sales</p>
            <ResponsiveContainer width="100%" height={220}>
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
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval={xInterval}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="orders"
                  name="Online"
                  stackId="rev"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradOrders)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="pos"
                  name="POS"
                  stackId="rev"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  fill="url(#gradPos)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-0.5 bg-indigo-500 rounded inline-block" />
                Online Orders
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-0.5 bg-[#C9A84C] rounded inline-block" />
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
            <p className="text-sm font-semibold text-gray-700 mb-4">Top Products by Revenue</p>
            {data!.topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <BarChart3 className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">No sales data for this period</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data!.topProducts.map((p, i) => (
                  <ProductRow key={p._id} product={p} rank={i + 1} maxRevenue={maxProdRev} />
                ))}
              </div>
            )}
          </div>

          {/* Order status + top categories */}
          <div className="flex flex-col gap-5">

            {/* Order status */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Order Status
                {totalOrders > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">({totalOrders} total)</span>
                )}
              </p>
              {totalOrders === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No orders this period</p>
              ) : (
                <div className="space-y-2.5">
                  {STATUS_CONFIG.map(cfg => (
                    <div key={cfg.key} className="flex items-center gap-2.5 text-xs">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.color}`} />
                      <span className="text-gray-500 w-20">{cfg.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cfg.color}`}
                          style={{ width: `${Math.round((data!.orderStatusBreakdown[cfg.key] || 0) / totalOrders * 100)}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-700 w-6 text-right">
                        {data!.orderStatusBreakdown[cfg.key] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top categories */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1">
              <p className="text-sm font-semibold text-gray-700 mb-4">Top Categories (POS)</p>
              {data!.topCategories.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No data this period</p>
              ) : (
                <div className="space-y-2.5">
                  {data!.topCategories.map(c => (
                    <BarRow
                      key={c.name}
                      label={c.name}
                      value={c.revenue}
                      total={topCatMax}
                      color="bg-indigo-400"
                      showValue
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
