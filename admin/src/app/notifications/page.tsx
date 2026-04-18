'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { api, Notification } from '@/lib/api';
import { useAdminStore } from '@/store/admin-store';
import {
  Bell, ShoppingBag, AlertTriangle, XCircle, UserPlus,
  Calendar, Settings2, CheckCheck, Trash2, Loader2,
  AlertCircle, ChevronRight, RefreshCw, BellOff, BarChart3,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────

type FilterType = 'all' | 'unread' | 'order' | 'low_stock' | 'out_of_stock' | 'customer' | 'booking' | 'system';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function groupByDate(notifications: Notification[]) {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const thisWeek  = new Date(today); thisWeek.setDate(today.getDate() - 6);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today',     items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older',     items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d >= today)     groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= thisWeek)  groups[2].items.push(n);
    else                     groups[3].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

// ── Type config ────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string; gradient: string }> = {
  order:        { icon: ShoppingBag,   color: 'text-indigo-600', bg: 'bg-indigo-100',  label: 'Order', gradient: 'from-indigo-500 to-indigo-600' },
  low_stock:    { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-100',   label: 'Low Stock', gradient: 'from-amber-400 to-amber-500' },
  out_of_stock: { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-100',     label: 'Out of Stock', gradient: 'from-red-500 to-red-600' },
  customer:     { icon: UserPlus,      color: 'text-emerald-600',bg: 'bg-emerald-100', label: 'Customer', gradient: 'from-emerald-500 to-emerald-600' },
  booking:      { icon: Calendar,      color: 'text-purple-600', bg: 'bg-purple-100',  label: 'Booking', gradient: 'from-purple-500 to-purple-600' },
  system:       { icon: Settings2,     color: 'text-gray-600',   bg: 'bg-gray-100',    label: 'System', gradient: 'from-gray-500 to-gray-600' },
};

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'unread',       label: 'Unread' },
  { key: 'order',        label: 'Orders' },
  { key: 'low_stock',    label: 'Low Stock' },
  { key: 'out_of_stock', label: 'Out of Stock' },
  { key: 'customer',     label: 'Customers' },
  { key: 'booking',      label: 'Bookings' },
];

// ── Stats Cards ─────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, color, delay }: { title: string; value: string | number; icon: React.ElementType; color: string; delay: number }) {
  return (
    <div 
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xl font-black text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{title}</p>
        </div>
      </div>
    </div>
  );
}

// ── Notification card ──────────────────────────────────────────

function NotificationCard({
  notification,
  onRead,
  onDelete,
  index,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const Icon = cfg.icon;

  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
  };

  return (
    <div
      className={`group opacity-0 animate-fade-in-up bg-white rounded-2xl border p-4 transition-all duration-300 hover:shadow-lg ${
        notification.isRead
          ? 'border-gray-100 hover:border-gray-200'
          : 'border-blue-100 hover:border-blue-200'
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${cfg.gradient} shadow-md group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-bold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                {notification.title}
              </p>
              {!notification.isRead && (
                <span className="inline-block w-2 h-2 rounded-full bg-[#C9A84C] flex-shrink-0 animate-pulse" />
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notification.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{notification.message}</p>

          {/* Actions row */}
          <div className="flex items-center gap-3 mt-3">
            {notification.link && (
              <Link
                href={notification.link}
                onClick={handleClick}
                className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.color} hover:underline`}
              >
                View details
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              {!notification.isRead && (
                <button
                  onClick={() => onRead(notification._id)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Mark as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDelete(notification._id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function NotificationsPage() {
  const { setUnreadNotifications } = useAdminStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState<FilterType>('all');
  const [clearing,   setClearing]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { notifications: data, unreadCount } = await api.notifications.getAll();
      setNotifications(data);
      setUnreadNotifications(unreadCount);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUnreadNotifications]);

  useEffect(() => { load(); }, [load]);

  const handleRead = useCallback(async (id: string) => {
    const wasUnread = notifications.find(n => n._id === id && !n.isRead);
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      if (wasUnread) {
        const { count } = await api.notifications.getUnreadCount();
        setUnreadNotifications(count);
      }
    } catch {}
  }, [notifications, setUnreadNotifications]);

  const handleDelete = useCallback(async (id: string) => {
    const n = notifications.find(x => x._id === id);
    try {
      await api.notifications.delete(id);
      setNotifications(prev => prev.filter(x => x._id !== id));
      if (n && !n.isRead) {
        const { count } = await api.notifications.getUnreadCount();
        setUnreadNotifications(count);
      }
    } catch {}
  }, [notifications, setUnreadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifications(0);
    } catch {}
  }, [setUnreadNotifications]);

  const handleClearRead = useCallback(async () => {
    setClearing(true);
    try {
      await api.notifications.clearRead();
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch {
    } finally {
      setClearing(false);
    }
  }, []);

  // ── Filtered list ────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    if (filter === 'all')    return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const unreadCount  = notifications.filter(n => !n.isRead).length;
  const readCount    = notifications.filter(n =>  n.isRead).length;
  const groups       = groupByDate(filtered);

  // Tab counts
  const tabCounts: Record<FilterType, number> = {
    all:          notifications.length,
    unread:       unreadCount,
    order:        notifications.filter(n => n.type === 'order').length,
    low_stock:    notifications.filter(n => n.type === 'low_stock').length,
    out_of_stock: notifications.filter(n => n.type === 'out_of_stock').length,
    customer:     notifications.filter(n => n.type === 'customer').length,
    booking:      notifications.filter(n => n.type === 'booking').length,
    system:       notifications.filter(n => n.type === 'system').length,
  };

  // Type distribution for stats
  const typeCounts = {
    orders: notifications.filter(n => n.type === 'order').length,
    stock: notifications.filter(n => n.type === 'low_stock' || n.type === 'out_of_stock').length,
    customers: notifications.filter(n => n.type === 'customer').length,
    bookings: notifications.filter(n => n.type === 'booking').length,
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />)}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">{error}</p>
        <button
          onClick={() => load()}
          className="px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] hover:shadow-lg hover:shadow-[#C9A84C]/20 transition-all"
        >
          Try Again
        </button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">Stay updated with your store</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20 transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
            {readCount > 0 && (
              <button
                onClick={handleClearRead}
                disabled={clearing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Clear read
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <StatsCard
                title="Unread"
                value={unreadCount}
                icon={Bell}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
                delay={0}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <StatsCard
                title="Orders"
                value={typeCounts.orders}
                icon={ShoppingBag}
                color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                delay={50}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="Stock Alerts"
                value={typeCounts.stock}
                icon={AlertTriangle}
                color="bg-gradient-to-br from-amber-400 to-amber-500"
                delay={100}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <StatsCard
                title="Customers"
                value={typeCounts.customers}
                icon={UserPlus}
                color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                delay={150}
              />
            </div>
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 scrollbar-hide">
          {FILTER_TABS.map(tab => {
            const count = tabCounts[tab.key];
            if (count === 0 && tab.key !== 'all' && tab.key !== 'unread') return null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  filter === tab.key
                    ? 'bg-gradient-to-r from-[#C9A84C] to-[#B8953F] text-white shadow-lg shadow-[#C9A84C]/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-gray-100">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <BellOff className="w-10 h-10 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-bold text-lg">
                {filter === 'unread' ? 'All caught up!' : 'No notifications'}
              </p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                {filter === 'unread'
                  ? 'You have no unread notifications.'
                  : filter === 'all'
                  ? 'Notifications will appear here when events occur.'
                  : `No ${FILTER_TABS.find(t => t.key === filter)?.label.toLowerCase()} notifications.`}
              </p>
            </div>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] transition-all"
              >
                View all notifications
              </button>
            )}
          </div>
        )}

        {/* ── Notification groups ── */}
        {groups.length > 0 && (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                  {group.label}
                </p>
                <div className="space-y-3">
                  {group.items.map((n, idx) => (
                    <NotificationCard
                      key={n._id}
                      notification={n}
                      onRead={handleRead}
                      onDelete={handleDelete}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer summary ── */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-8 pb-4">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> notification{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && ` · `}
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="hover:text-[#C9A84C] underline">
                View all {notifications.length}
              </button>
            )}
          </p>
        )}

      </div>
    </AdminLayout>
  );
}