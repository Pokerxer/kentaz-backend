'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api, AnalyticsData } from '@/lib/api';
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Package, AlertCircle, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

type Period = '7d' | '30d' | '90d' | '12m';

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-xl ${className}`} />;
}

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months',
};

const PIE_COLORS = ['#C9A84C', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', processing: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444',
};

export default function AnalyticsPage() {
  const [period, setPeriod]   = useState<Period>('30d');
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.analytics.get(period);
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;

  const trendData = (data?.trend ?? []).map(p => ({
    name: p.date ?? p.period ?? '',
    Revenue: p.revenue ?? 0,
    Orders: p.orders ?? 0,
  }));

  const categoryData = (data?.topCategories ?? []).map(c => ({
    name: c.name,
    value: c.revenue,
  }));

  const statusData = Object.entries(data?.orderStatusBreakdown ?? {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value,
  }));

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sales performance and store insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p ? 'bg-[#C9A84C] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={load} className="ml-auto text-red-600 font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: DollarSign,   label: 'Revenue',       value: loading ? null : fmt(summary?.revenue ?? 0),          trend: summary?.vsRevenue,       accent: 'bg-amber-500' },
          { icon: ShoppingCart, label: 'Orders',        value: loading ? null : (summary?.orders ?? 0).toString(),   trend: summary?.vsTransactions,  accent: 'bg-blue-500' },
          { icon: Users,        label: 'Customers',     value: loading ? null : (data?.totalCustomers ?? 0).toString(), trend: undefined,              accent: 'bg-emerald-500' },
          { icon: Package,      label: 'Avg Order',     value: loading ? null : fmt(summary?.avgOrderValue ?? 0),    trend: undefined,                accent: 'bg-purple-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.accent}`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              {card.trend != null && !loading && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${card.trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {card.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {card.trend >= 0 ? '+' : ''}{card.trend}%
                </span>
              )}
            </div>
            {loading
              ? <Skeleton className="h-8 w-24 mb-1" />
              : <p className="text-2xl font-bold text-gray-900">{card.value}</p>}
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#C9A84C]" /> Revenue Trend
          </h2>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : trendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-gray-400">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="Revenue" stroke="#C9A84C" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order Status</h2>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : statusData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-gray-400">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase()] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Tooltip formatter={(v: number) => [`${v} orders`, '']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products + Categories */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top Products</h2>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data?.topProducts ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {(data?.topProducts ?? []).slice(0, 8).map((p, i) => {
                const max = data!.topProducts[0].revenue;
                return (
                  <div key={p._id ?? i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium truncate pr-3">{p.name}</span>
                      <span className="text-gray-500 flex-shrink-0">{fmt(p.revenue)} · {p.qty} sold</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${max > 0 ? Math.round((p.revenue / max) * 100) : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by Category</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : categoryData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No category data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" fill="#C9A84C" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
