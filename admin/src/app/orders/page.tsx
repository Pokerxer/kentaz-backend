'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Package, Truck, CheckCircle, Clock, XCircle,
  Loader2, ChevronLeft, ChevronRight, RefreshCw, X,
  MapPin, User, CreditCard, Calendar, ChevronDown,
  AlertCircle, ArrowRight, RotateCcw, ShoppingCart,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { api, Order, OrderStatusCounts } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ── Config ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', icon: Clock,        bar: 'bg-yellow-400' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-400',   icon: Package,      bar: 'bg-blue-400'   },
  shipped:    { label: 'Shipped',    color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-400', icon: Truck,        bar: 'bg-purple-400' },
  delivered:  { label: 'Delivered',  color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-400',  icon: CheckCircle,  bar: 'bg-green-400'  },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-400',    icon: XCircle,      bar: 'bg-red-400'    },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;
const STATUSES = Object.keys(STATUS_CONFIG) as StatusKey[];

const NEXT_STATUS: Partial<Record<StatusKey, StatusKey>> = {
  pending:    'processing',
  processing: 'shipped',
  shipped:    'delivered',
};

// ── StatusBadge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── OrderDetail panel ─────────────────────────────────────────────

function OrderDetail({
  order,
  onClose,
  onStatusChange,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (updated: Order) => void;
}) {
  const [fullOrder, setFullOrder]     = useState<Order>(order);
  const [loadingFull, setLoadingFull] = useState(true);
  const [updating, setUpdating]       = useState(false);
  const [statusMenu, setStatusMenu]   = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    setLoadingFull(true);
    api.orders.getById(order._id)
      .then(o => setFullOrder(o))
      .catch(() => setFullOrder(order))
      .finally(() => setLoadingFull(false));
  }, [order._id]);

  async function handleStatus(status: StatusKey) {
    setStatusMenu(false);
    setUpdating(true);
    setUpdateError('');
    try {
      const updated = await api.orders.updateStatus(fullOrder._id, status);
      setFullOrder(updated);
      onStatusChange(updated);
    } catch (e: any) {
      setUpdateError(e.message || 'Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  const cfg = STATUS_CONFIG[fullOrder.status as StatusKey] ?? STATUS_CONFIG.pending;
  const nextStatus = NEXT_STATUS[fullOrder.status as StatusKey];
  const addr = fullOrder.shippingAddress;

  const subtotal = fullOrder.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {updateError && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {updateError}
          <button onClick={() => setUpdateError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400 font-medium">Order</p>
          <h2 className="font-bold text-gray-900">#{fullOrder._id.slice(-10).toUpperCase()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={fullOrder.status} />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Status actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {nextStatus && (
            <button
              onClick={() => handleStatus(nextStatus)}
              disabled={updating}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 ${STATUS_CONFIG[nextStatus].bar.replace('bg-', 'bg-').replace('-400', '-500')} hover:opacity-90`}
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Mark as {STATUS_CONFIG[nextStatus].label}
            </button>
          )}
          {fullOrder.status !== 'cancelled' && fullOrder.status !== 'delivered' && (
            <button
              onClick={() => handleStatus('cancelled')}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
          {/* Manual status picker */}
          <div className="relative ml-auto">
            <button
              onClick={() => setStatusMenu(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Set status <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {statusMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[150px]">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatus(s)}
                    className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${fullOrder.status === s ? 'font-semibold text-[#C9A84C]' : 'text-gray-700'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress timeline */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-0">
            {(['pending','processing','shipped','delivered'] as StatusKey[]).map((s, i, arr) => {
              const reached = STATUSES.indexOf(fullOrder.status as StatusKey) >= STATUSES.indexOf(s);
              const isCurrent = fullOrder.status === s;
              const cancelled = fullOrder.status === 'cancelled';
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`relative flex flex-col items-center flex-shrink-0`}>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                      cancelled ? 'border-gray-200 bg-white' :
                      isCurrent ? `border-current ${STATUS_CONFIG[s].bar.replace('bg-','border-').replace('-400','-500')} ${STATUS_CONFIG[s].bar} text-white` :
                      reached   ? 'border-green-400 bg-green-400 text-white' :
                                  'border-gray-200 bg-white'
                    }`}>
                      {reached && !isCurrent && !cancelled
                        ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                        : (() => { const Icon = STATUS_CONFIG[s].icon; return <Icon className={`w-3 h-3 ${isCurrent && !cancelled ? 'text-white' : 'text-gray-300'}`} />; })()}
                    </div>
                    <p className={`text-[10px] mt-1 font-medium whitespace-nowrap ${isCurrent && !cancelled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {STATUS_CONFIG[s].label}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${reached && !cancelled && fullOrder.status !== s ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {fullOrder.status === 'cancelled' && (
            <p className="text-xs text-red-500 text-center mt-2 font-medium">This order was cancelled</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              Items ({fullOrder.items.length})
            </h3>
          </div>
          {loadingFull ? (
            <div className="p-4 space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {fullOrder.items.map((item, i) => {
                const name = item.product?.name || item.name || 'Product';
                const img = item.product?.images?.[0]?.url;
                const variantLabel = [item.variant?.size, item.variant?.color].filter(Boolean).join(' / ');
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {img ? <img src={img} alt={name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400 m-auto mt-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                      {variantLabel && <p className="text-xs text-gray-400">{variantLabel}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                      <p className="text-xs text-gray-400">{formatPrice(item.price)} × {item.quantity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Totals */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span><span>{formatPrice(fullOrder.total)}</span>
            </div>
          </div>
        </div>

        {/* Customer + Shipping */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Customer
            </h3>
            <p className="text-sm font-semibold text-gray-900">{fullOrder.user?.name || 'Guest'}</p>
            {fullOrder.user?.email && <p className="text-xs text-gray-500">{fullOrder.user.email}</p>}
            {(fullOrder.user as any)?.phone && <p className="text-xs text-gray-500">{(fullOrder.user as any).phone}</p>}
          </div>

          {addr && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Shipping Address
              </h3>
              {(addr.firstName || addr.lastName) && (
                <p className="text-sm font-semibold text-gray-900">{[addr.firstName, addr.lastName].filter(Boolean).join(' ')}</p>
              )}
              {addr.phone && <p className="text-xs text-gray-500">{addr.phone}</p>}
              {addr.email && <p className="text-xs text-gray-500">{addr.email}</p>}
              <p className="text-sm text-gray-700 leading-relaxed">
                {[(addr.address || addr.street), addr.city, addr.state, addr.postalCode, addr.country || 'Nigeria'].filter(Boolean).join(', ')}
              </p>
              {addr.deliveryMethod && (
                <p className="text-xs text-gray-400 capitalize">
                  {addr.deliveryMethod === 'express' ? 'Express delivery (1-2 days)' : 'Standard delivery (3-5 days)'}
                </p>
              )}
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment
            </h3>
            {fullOrder.paystackRef && <p className="text-xs font-mono text-gray-600 break-all">{fullOrder.paystackRef}</p>}
            <p className="text-xs text-gray-500 capitalize">{fullOrder.paystackStatus || 'N/A'}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="text-xs text-gray-400 space-y-1 pb-2">
          <p>Placed: {formatDate(fullOrder.createdAt)}</p>
          <p>Updated: {formatDate(fullOrder.updatedAt)}</p>
          <p className="font-mono break-all">ID: {fullOrder._id}</p>
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState(() => searchParams.get('search') || '');
  const [searchInput,  setSearchInput]  = useState(() => searchParams.get('search') || '');
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [statusCounts, setStatusCounts] = useState<OrderStatusCounts>({});
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selected,     setSelected]     = useState<Order | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const LIMIT = 20;

  const fetchOrders = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const data = await api.orders.getAll({
        page: pg, limit: LIMIT,
        status: statusFilter || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setStatusCounts(data.statusCounts || {});
      setTotalRevenue(data.totalRevenue || 0);
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter, search, startDate, endDate]);

  useEffect(() => { setPage(1); }, [statusFilter, search, startDate, endDate]);
  useEffect(() => { fetchOrders(page); }, [fetchOrders, page]);

  function handleSearchChange(val: string) {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  }

  function handleStatusChange(updated: Order) {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
    setSelected(updated);
  }

  const totalCount = Object.values(statusCounts).reduce((s, v) => s + v.count, 0);

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6">

        {/* ── Left panel ──────────────────────────────────────── */}
        <div className={`flex flex-col flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-300 ${selected ? 'hidden lg:flex lg:w-[480px]' : 'w-full lg:w-[480px]'}`}>

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 space-y-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Orders</h1>
              <button onClick={() => fetchOrders(page)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-gray-900">{totalCount}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-sm font-black text-green-700">{formatPrice(totalRevenue)}</p>
                <p className="text-xs text-green-600">Revenue</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-amber-700">{statusCounts['pending']?.count ?? 0}</p>
                <p className="text-xs text-amber-600">Pending</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, email or order ID…"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50"
              />
            </div>

            {/* Date filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A84C] bg-gray-50" />
                <span className="text-gray-400 text-xs">–</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A84C] bg-gray-50" />
              </div>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setStatusFilter('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All ({totalCount})
              </button>
              {STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                const count = statusCounts[s]?.count ?? 0;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? `${cfg.bar} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {cfg.label} {count > 0 && <span className={`${statusFilter === s ? 'bg-white/30' : 'bg-gray-200'} px-1.5 py-0.5 rounded-full`}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <ShoppingCart className="w-8 h-8" />
                <p className="text-sm">No orders found</p>
              </div>
            ) : orders.map(order => {
              const cfg = STATUS_CONFIG[order.status as StatusKey] ?? STATUS_CONFIG.pending;
              const isSelected = selected?._id === order._id;
              return (
                <button
                  key={order._id}
                  onClick={() => setSelected(isSelected ? null : order)}
                  className={`w-full text-left px-5 py-4 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-amber-50/60 border-l-2 border-[#C9A84C]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">#{order._id.slice(-10).toUpperCase()}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-gray-700 mt-1 truncate">{order.user?.name || 'Guest'}</p>
                      <p className="text-xs text-gray-400 truncate">{order.user?.email || '—'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0">
              <p className="text-xs text-gray-400">Page {page} of {totalPages} · {total} orders</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────── */}
        {selected ? (
          <div className="flex-1 overflow-hidden bg-gray-50">
            <OrderDetail
              key={selected._id}
              order={selected}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 text-gray-300 flex-col gap-3">
            <ShoppingCart className="w-12 h-12" />
            <p className="text-sm font-medium">Select an order to view details</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
