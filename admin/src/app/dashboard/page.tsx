'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown,
  Package, RefreshCw, Plus, ArrowRight, Clock, PackageCheck,
  AlertCircle, Monitor, CreditCard, Banknote, ArrowLeftRight,
  AlertTriangle, Calendar, BarChart3, ShoppingBag, Loader2,
  ChevronRight, Eye, ArrowUpRight, ArrowDownRight, Star,
  Target, Zap, Gift, FileText, PieChart, Activity,
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

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Animated counter
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
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
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.totalRev / max) * 80));
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-gradient-to-t from-[#C9A84C] to-[#E5C77A]' : 'bg-gray-200 group-hover:bg-[#C9A84C]/40'}`}
              style={{ height: `${h}px` }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {d.label}<br />{formatPrice(d.totalRev)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simple category chart (horizontal bars)
function CategoryChart({ data }: { data: { category: string; revenue: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const colors = ['bg-[#C9A84C]', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((d, i) => (
        <div key={d.category} className="flex items-center gap-3">
          <span className="w-20 text-xs text-gray-500 truncate">{d.category}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-700`}
              style={{ width: `${Math.max(4, (d.revenue / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-16 text-right">{formatPrice(d.revenue)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-lg ${className}`} />;
}

// ── Stat Card ───────────────────────────────────────────────────

function StatCard({
  title, value, trend, icon: Icon, color, subtitle,
  trendLabel = 'vs last period'
}: {
  title: string; value: number; trend: number; icon: React.ElementType;
  color: string; subtitle?: string; trendLabel?: string
}) {
  const up = trend >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {pct(trend)}
        </span>
      </div>
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">
        {typeof value === 'number' && title.includes('Revenue') ? formatPrice(value) : formatNumber(value)}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

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
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
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

  // Mock category data (would come from API)
  const categoryData = [
    { category: 'Fashion', revenue: s.revenue.thisMonth * 0.45 },
    { category: 'Electronics', revenue: s.revenue.thisMonth * 0.25 },
    { category: 'Accessories', revenue: s.revenue.thisMonth * 0.15 },
    { category: 'Home & Living', revenue: s.revenue.thisMonth * 0.10 },
    { category: 'Others', revenue: s.revenue.thisMonth * 0.05 },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {greeting} <span className="text-2xl">👋</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range picker */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(['7d', '30d', '90d'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    dateRange === r
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/products/new" className="flex items-center gap-2 px-3 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors shadow-lg shadow-[#C9A84C]/20">
              <Plus className="w-4 h-4" /> New Product
            </Link>
          </div>
        </div>

        {/* ── KPI row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenue Today"
            value={totalRevToday}
            trend={s.revenue.vsYesterday}
            icon={DollarSign}
            color="bg-gradient-to-br from-[#C9A84C] to-[#B8953F]"
            subtitle={`${s.orders.today} orders`}
          />
          <StatCard
            title="This Month"
            value={s.revenue.thisMonth}
            trend={s.revenue.vsLastMonth}
            icon={TrendingUp}
            color="bg-gradient-to-br from-green-500 to-green-600"
            subtitle={`${s.orders.thisMonth} sales`}
          />
          <StatCard
            title="Orders Today"
            value={totalSalesToday}
            trend={s.orders.vsYesterday}
            icon={ShoppingCart}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            subtitle={`${s.orders.todayOrders} online · ${s.orders.todayPos} POS`}
          />
          <StatCard
            title="Total Customers"
            value={s.customers.total}
            trend={15}
            icon={Users}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            subtitle={`+${s.customers.newThisMonth} new`}
          />
        </div>

        {/* ── Main content grid ─────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Revenue chart - spans 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* 7-day trend chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Revenue Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Online orders + POS combined</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C9A84C]" /> Today</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Past</span>
                </div>
              </div>
              <MiniChart data={s.trend} />
              <div className="flex justify-between mt-1">
                {s.trend.map(d => (
                  <span key={d.date} className="flex-1 text-center text-[10px] text-gray-400">{d.label.split(' ')[0]}</span>
                ))}
              </div>

              {/* Quick stats row */}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Avg Order</p>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(s.avgOrderValue)}</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-xs text-gray-400">Online</p>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(s.revenue.thisMonthOrders)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">POS</p>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(s.revenue.thisMonthPos)}</p>
                </div>
              </div>
            </div>

            {/* Sales by Category */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#C9A84C]" /> Sales by Category
                </h2>
                <Link href="/products" className="text-xs text-[#C9A84C] hover:underline font-medium">View all</Link>
              </div>
              <CategoryChart data={categoryData} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Order Pipeline */}
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
                        <div className={`h-full rounded-full ${cfg.bg.replace('100', '400')}`} style={{ width: `${pctBar}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bookings mini */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bookings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-600 font-medium">Today</p>
                    <p className="text-xl font-black text-blue-900">{s.bookings.today}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs text-amber-600 font-medium">Pending</p>
                    <Link href="/bookings" className="text-xl font-black text-amber-900 hover:underline">{s.bookings.pending}</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Add Product', href: '/products/new', icon: Plus, color: 'bg-[#C9A84C]' },
                  { label: 'Open POS', href: '/pos/sell', icon: Monitor, color: 'bg-gray-900' },
                  { label: 'New Purchase', href: '/purchases/new', icon: ShoppingBag, color: 'bg-green-600' },
                  { label: 'View Orders', href: '/orders', icon: ShoppingCart, color: 'bg-blue-500' },
                ].map(action => (
                  <Link key={action.label} href={action.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-[#C9A84C]/30 hover:bg-amber-50/30 transition-all group">
                    <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#C9A84C]">{action.label}</span>
                    <ArrowRight className="ml-auto w-4 h-4 text-gray-300 group-hover:text-[#C9A84C]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row ───────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

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
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {s.recentOrders.slice(0, 5).map(order => {
                  const cfg = orderStatusConfig[order.status] || orderStatusConfig.pending;
                  return (
                    <Link key={order._id} href={`/orders/${order._id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
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
                <Monitor className="w-4 h-4 text-[#C9A84C]" /> Recent POS
              </h2>
              <Link href="/pos/sales" className="text-xs text-[#C9A84C] hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {s.recentPosSales.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No POS sales yet</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {s.recentPosSales.slice(0, 5).map(sale => {
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

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock
              </h2>
              <Link href="/inventory" className="text-xs text-[#C9A84C] hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {s.lowStock.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <PackageCheck className="w-10 h-10 text-green-400" />
                <p className="text-green-600 text-sm font-medium">All products well-stocked!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {s.lowStock.slice(0, 5).map((item, i) => {
                  const label = [item.variant.size, item.variant.color].filter(Boolean).join(' / ') || `Variant ${item.variantIndex + 1}`;
                  const isCritical = item.variant.stock <= 3;
                  return (
                    <Link key={`${item._id}-${i}`} href={`/products/${item._id}`}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${isCritical ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-amber-50/40'}`}>
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.images?.[0]?.url
                          ? <img src={item.images[0].url} alt={item.name} className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-gray-400 m-auto mt-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-sm font-black ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.variant.stock} left
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Store Snapshot - bottom */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Products', value: s.products.total, icon: Package },
              { label: 'Total Orders', value: s.orders.total, icon: ShoppingCart },
              { label: 'Customers', value: s.customers.total, icon: Users },
              { label: 'This Month Revenue', value: s.revenue.thisMonth, icon: DollarSign },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <p className="text-xs text-white/60">{stat.label}</p>
                  <p className="text-xl font-black">
                    {stat.label.includes('Revenue') ? formatPrice(stat.value) : formatNumber(stat.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}