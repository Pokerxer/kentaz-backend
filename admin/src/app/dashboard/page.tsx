'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown,
  Package, RefreshCw, Plus, ArrowRight, Clock, PackageCheck,
  AlertCircle, Monitor, CreditCard, Banknote, ArrowLeftRight,
  AlertTriangle, Calendar, BarChart3, ShoppingBag, Loader2,
  ChevronRight,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import {
  api, DashboardStats, DashboardTrendDay, DashboardLowStock,
  DashboardPosSale, Order,
} from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ── helpers ──────────────────────────────────────────────────────

function pct(n: number) {
  const abs = Math.abs(n);
  return `${n >= 0 ? '+' : '-'}${abs}%`;
}

function TrendBadge({ value, label }: { value: number; label: string }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pct(value)} {label}
    </span>
  );
}

const orderStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle   },
  processing: { label: 'Processing', color: 'text-blue-600',   bg: 'bg-blue-100',   icon: Clock         },
  shipped:    { label: 'Shipped',    color: 'text-purple-600', bg: 'bg-purple-100', icon: Package       },
  delivered:  { label: 'Delivered',  color: 'text-green-600',  bg: 'bg-green-100',  icon: PackageCheck  },
  cancelled:  { label: 'Cancelled',  color: 'text-red-600',    bg: 'bg-red-100',    icon: AlertCircle   },
};

const paymentIcon: Record<string, React.ElementType> = {
  cash: Banknote, card: CreditCard, transfer: ArrowLeftRight,
};

// ── sparkline (pure CSS bars) ────────────────────────────────────

function MiniChart({ data }: { data: DashboardTrendDay[] }) {
  const max = Math.max(...data.map(d => d.totalRev), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.totalRev / max) * 64));
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-[#C9A84C]' : 'bg-[#C9A84C]/30 group-hover:bg-[#C9A84C]/60'}`}
              style={{ height: `${h}px` }}
            />
            {/* tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {d.label}<br />{formatPrice(d.totalRev)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-lg ${className}`} />;
}

// ── Main page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,      setStats]      = useState<DashboardStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await api.dashboard.getStats();
      setStats(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button onClick={() => load()} className="px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium">
          Retry
        </button>
      </div>
    </AdminLayout>
  );

  // Guard: backend may not have been restarted yet (old format won't have .revenue)
  if (!stats || !stats.revenue) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="w-12 h-12 text-amber-400" />
          <p className="text-gray-700 font-medium">Dashboard data is updating</p>
          <p className="text-gray-500 text-sm">Restart the backend server then refresh.</p>
          <button onClick={() => load(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  const s = stats;
  const totalRevToday = s.revenue.today;
  const totalSalesToday = s.orders.today;
  const trendMax = Math.max(...(s.trend ?? []).map(d => d.totalRev), 1);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/products/new" className="flex items-center gap-2 px-3 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors">
              <Plus className="w-4 h-4" /> New Product
            </Link>
          </div>
        </div>

        {/* ── KPI row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue today */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <TrendBadge value={s.revenue.vsYesterday} label="vs yesterday" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Revenue Today</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{formatPrice(totalRevToday)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Orders {formatPrice(s.revenue.todayOrders)} · POS {formatPrice(s.revenue.todayPos)}
              </p>
            </div>
          </div>

          {/* This month */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <TrendBadge value={s.revenue.vsLastMonth} label="vs last mo." />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">This Month</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{formatPrice(s.revenue.thisMonth)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {s.orders.thisMonth} sales · avg {formatPrice(s.avgOrderValue)}
              </p>
            </div>
          </div>

          {/* Orders today */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <TrendBadge value={s.orders.vsYesterday} label="vs yesterday" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Orders Today</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{totalSalesToday}</p>
              <p className="text-xs text-gray-400 mt-1">
                {s.orders.todayOrders} online · {s.orders.todayPos} POS
              </p>
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                +{s.customers.newThisMonth} this mo.
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Customers</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{s.customers.total.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{s.products.total} products in store</p>
            </div>
          </div>
        </div>

        {/* ── Revenue trend + Order pipeline ────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* 7-day trend chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Revenue — Last 7 Days</h2>
                <p className="text-xs text-gray-400 mt-0.5">Online orders + POS combined</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C9A84C]" /> Today</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C9A84C]/30" /> Past</span>
              </div>
            </div>
            <MiniChart data={s.trend} />
            <div className="flex justify-between mt-1">
              {s.trend.map(d => (
                <span key={d.date} className="flex-1 text-center text-[10px] text-gray-400">{d.label.split(' ')[0]}</span>
              ))}
            </div>
            {/* Breakdown row */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Online Orders</p>
                <p className="text-sm font-bold text-gray-900">{formatPrice(s.revenue.thisMonthOrders)}</p>
                <p className="text-xs text-gray-400">{s.orders.thisMonth - s.orders.todayPos} orders this month</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Point of Sale</p>
                <p className="text-sm font-bold text-gray-900">{formatPrice(s.revenue.thisMonthPos)}</p>
                <p className="text-xs text-gray-400">{s.orders.todayPos} POS today</p>
              </div>
            </div>
          </div>

          {/* Order status pipeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Order Pipeline</h2>
              <Link href="/orders" className="text-xs text-[#C9A84C] hover:underline font-medium">View all</Link>
            </div>
            <div className="space-y-3">
              {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(status => {
                const cfg = orderStatusConfig[status];
                const count = s.orders.statusBreakdown[status] ?? 0;
                const total = Object.values(s.orders.statusBreakdown).reduce((a, b) => a + b, 0) || 1;
                const pctBar = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className="text-sm text-gray-700">{cfg.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('-100', '-400')}`} style={{ width: `${pctBar}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bookings mini */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bookings</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">Today</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{s.bookings.today}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-700">Pending</span>
                </div>
                <Link href="/bookings" className="text-sm font-bold text-amber-600 hover:underline">{s.bookings.pending}</Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent orders + POS sales ─────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Recent Online Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" /> Recent Orders
              </h2>
              <Link href="/orders" className="text-xs text-[#C9A84C] hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {s.recentOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No orders yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {s.recentOrders.map(order => {
                  const cfg = orderStatusConfig[order.status] || orderStatusConfig.pending;
                  return (
                    <Link
                      key={order._id}
                      href={`/orders/${order._id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {(order as any).user?.name || order.shippingAddress?.city || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-400">#{order._id.slice(-8)} · {order.items?.length ?? 0} items</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                        <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent POS Sales */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#C9A84C]" /> Recent POS Sales
              </h2>
              <Link href="/pos/sales" className="text-xs text-[#C9A84C] hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {s.recentPosSales.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No POS sales yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {s.recentPosSales.map(sale => {
                  const PayIcon = paymentIcon[sale.paymentMethod] ?? CreditCard;
                  return (
                    <div key={sale._id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <PayIcon className="w-4 h-4 text-[#C9A84C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sale.customerName || sale.cashierName}
                        </p>
                        <p className="text-xs text-gray-400">{sale.receiptNumber} · {sale.items?.length ?? 0} items</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(sale.total)}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{sale.paymentMethod}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Low stock alerts + Quick actions ──────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Low stock */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
              </h2>
              <Link href="/inventory" className="text-xs text-[#C9A84C] hover:underline font-medium flex items-center gap-1">
                View inventory <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {s.lowStock.length === 0 ? (
              <div className="py-12 text-center text-green-600 text-sm font-medium">All products well-stocked!</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {s.lowStock.map((item, i) => {
                  const label = [item.variant.size, item.variant.color].filter(Boolean).join(' / ') || `Variant ${item.variantIndex + 1}`;
                  return (
                    <Link
                      key={`${item._id}-${i}`}
                      href={`/products/${item._id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/40 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.images?.[0]?.url
                          ? <img src={item.images[0].url} alt={item.name} className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-gray-400 m-auto mt-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{label} · {item.category}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`text-sm font-black ${item.variant.stock <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.variant.stock} left
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions + summary */}
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-3">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Add Product',    href: '/products/new',  icon: Plus,         bg: 'bg-[#C9A84C]'   },
                  { label: 'View Orders',    href: '/orders',         icon: ShoppingCart, bg: 'bg-blue-500'    },
                  { label: 'Open POS',       href: '/pos/sell',       icon: Monitor,      bg: 'bg-gray-900'    },
                  { label: 'New Purchase',   href: '/purchases',      icon: ShoppingBag,  bg: 'bg-green-600'   },
                  { label: 'View Inventory', href: '/inventory',      icon: BarChart3,    bg: 'bg-purple-500'  },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-[#C9A84C]/30 hover:bg-[#C9A84C]/5 transition-all group">
                    <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center flex-shrink-0`}>
                      <a.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#C9A84C] transition-colors">{a.label}</span>
                    <ArrowRight className="ml-auto w-3.5 h-3.5 text-gray-300 group-hover:text-[#C9A84C]" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Store snapshot */}
            <div className="bg-gradient-to-br from-[#C9A84C] to-[#B8953F] rounded-2xl p-5 text-white">
              <h2 className="font-bold mb-3 text-white/90 text-sm uppercase tracking-wide">Store Snapshot</h2>
              <div className="space-y-3">
                {[
                  { label: 'Total Products',  value: s.products.total.toLocaleString(), icon: Package    },
                  { label: 'All-time Orders', value: s.orders.total.toLocaleString(),   icon: ShoppingCart },
                  { label: 'All Customers',   value: s.customers.total.toLocaleString(),icon: Users      },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <row.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm text-white/80">{row.label}</span>
                    </div>
                    <span className="font-bold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
