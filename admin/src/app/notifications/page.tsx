'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { api, Notification } from '@/lib/api';
import { useAdminStore } from '@/store/admin-store';
import {
  Bell, ShoppingBag, AlertTriangle, XCircle, UserPlus,
  Calendar, Settings2, CheckCheck, Trash2, Loader2,
  AlertCircle, ChevronRight, RefreshCw, BellOff,
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

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  order:        { icon: ShoppingBag,   color: 'text-indigo-600', bg: 'bg-indigo-100',  label: 'Order' },
  low_stock:    { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-100',   label: 'Low Stock' },
  out_of_stock: { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-100',     label: 'Out of Stock' },
  customer:     { icon: UserPlus,      color: 'text-emerald-600',bg: 'bg-emerald-100', label: 'Customer' },
  booking:      { icon: Calendar,      color: 'text-purple-600', bg: 'bg-purple-100',  label: 'Booking' },
  system:       { icon: Settings2,     color: 'text-gray-600',   bg: 'bg-gray-100',    label: 'System' },
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

// ── Notification card ──────────────────────────────────────────

function NotificationCard({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const Icon = cfg.icon;

  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
  };

  return (
    <div
      className={`group flex gap-4 p-4 rounded-2xl border transition-all ${
        notification.isRead
          ? 'bg-white border-gray-100 hover:border-gray-200'
          : 'bg-blue-50/40 border-blue-100 hover:border-blue-200'
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notification.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{notification.message}</p>

        {/* Actions row */}
        <div className="flex items-center gap-3 mt-2">
          {notification.link && (
            <Link
              href={notification.link}
              onClick={handleClick}
              className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color} hover:underline`}
            >
              View details
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            {!notification.isRead && (
              <button
                onClick={() => onRead(notification._id)}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                title="Mark as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(notification._id)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadNotifications(Math.max(0,
        (prev => prev - 1)(notifications.filter(n => !n.isRead).length - 1)
      ));
    } catch {}
  }, [notifications, setUnreadNotifications]);

  const handleDelete = useCallback(async (id: string) => {
    const n = notifications.find(x => x._id === id);
    try {
      await api.notifications.delete(id);
      setNotifications(prev => prev.filter(x => x._id !== id));
      if (n && !n.isRead) setUnreadNotifications(Math.max(0, notifications.filter(x => !x.isRead).length - 1));
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

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={() => load()}
          className="px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium"
        >
          Retry
        </button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
            {readCount > 0 && (
              <button
                onClick={handleClearRead}
                disabled={clearing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Clear read
              </button>
            )}
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {FILTER_TABS.map(tab => {
            const count = tabCounts[tab.key];
            if (count === 0 && tab.key !== 'all' && tab.key !== 'unread') return null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
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
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <BellOff className="w-8 h-8 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                {filter === 'unread' ? 'All caught up!' : 'No notifications'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
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
                className="text-sm text-[#C9A84C] hover:underline"
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map(n => (
                    <NotificationCard
                      key={n._id}
                      notification={n}
                      onRead={handleRead}
                      onDelete={handleDelete}
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
            Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && ` · `}
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="hover:text-gray-600 underline">
                View all {notifications.length}
              </button>
            )}
          </p>
        )}

      </div>
    </AdminLayout>
  );
}
