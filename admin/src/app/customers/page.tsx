'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search, Loader2, User, MapPin, ShoppingCart,
  Calendar, Package, CheckCircle, Clock, XCircle, Truck,
  ChevronLeft, ChevronRight, X, RefreshCw, Users,
  ToggleLeft, ToggleRight, Heart,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  api, User as UserType, CustomerOrder, CustomerBooking,
} from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

const ORDER_STATUS = {
  pending:    { label: 'Pending',    color: 'text-yellow-600 bg-yellow-50', icon: Clock       },
  processing: { label: 'Processing', color: 'text-blue-600 bg-blue-50',     icon: Package     },
  shipped:    { label: 'Shipped',    color: 'text-purple-600 bg-purple-50', icon: Truck       },
  delivered:  { label: 'Delivered',  color: 'text-green-600 bg-green-50',   icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'text-red-600 bg-red-50',       icon: XCircle     },
} as const;

const BOOKING_STATUS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function Avatar({ name, avatar, size = 'md' }: { name: string; avatar?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  if (avatar) return <img src={avatar} alt={name} className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-white font-bold">{name?.charAt(0)?.toUpperCase() || '?'}</span>
    </div>
  );
}

function CustomerDetail({
  customer, onClose, onToggleActive,
}: {
  customer: UserType;
  onClose: () => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [orders,   setOrders]   = useState<CustomerOrder[]>([]);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [stats,    setStats]    = useState<{ totalSpend: number; totalOrders: number; lastOrderDate: string | null }>({ totalSpend: 0, totalOrders: 0, lastOrderDate: null });
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState(false);
  const [tab,      setTab]      = useState<'orders' | 'bookings' | 'addresses'>('orders');

  useEffect(() => {
    setLoading(true);
    api.users.getById(customer._id)
      .then(res => { setOrders(res.orders); setBookings(res.bookings); setStats(res.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer._id]);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await api.users.toggleActive(customer._id);
      onToggleActive(customer._id, res.isActive);
    } catch {}
    finally { setToggling(false); }
  }

  const isActive = customer.isActive !== false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} avatar={customer.avatar} size="lg" />
          <div>
            <h2 className="font-bold text-gray-900">{customer.name}</h2>
            <p className="text-sm text-gray-500">{customer.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                {customer.role}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggle} disabled={toggling}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
          >
            {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <p className="text-xl font-black text-amber-700">{loading ? '—' : stats.totalOrders}</p>
            <p className="text-xs text-amber-600 mt-0.5">Orders</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-sm font-black text-green-700 leading-tight mt-1">{loading ? '—' : formatPrice(stats.totalSpend)}</p>
            <p className="text-xs text-green-600 mt-0.5">Total Spend</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-4 text-center">
            <p className="text-xl font-black text-purple-700">{loading ? '—' : bookings.length}</p>
            <p className="text-xs text-purple-600 mt-0.5">Bookings</p>
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pb-4 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Joined {formatDate(customer.createdAt)}</span>
          </div>
          {stats.lastOrderDate && (
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <span>Last order {formatDate(stats.lastOrderDate)}</span>
            </div>
          )}
          {(customer.wishlist?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-gray-400" />
              <span>{customer.wishlist!.length} item{customer.wishlist!.length !== 1 ? 's' : ''} in wishlist</span>
            </div>
          )}
          {(customer.addresses?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{customer.addresses!.length} saved address{customer.addresses!.length !== 1 ? 'es' : ''}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(['orders', 'bookings', 'addresses'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-[#C9A84C] text-[#C9A84C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
              <span className="ml-1.5 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-600">
                {t === 'orders' ? orders.length : t === 'bookings' ? bookings.length : (customer.addresses?.length ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : tab === 'orders' ? (
            orders.length === 0
              ? <div className="text-center py-10 text-gray-400 text-sm">No orders yet</div>
              : <div className="space-y-2">
                  {orders.map(order => {
                    const cfg = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] ?? ORDER_STATUS.pending;
                    const Icon = cfg.icon;
                    return (
                      <div key={order._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''} · {formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                          <p className={`text-xs font-medium capitalize ${cfg.color.split(' ')[0]}`}>{cfg.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
          ) : tab === 'bookings' ? (
            bookings.length === 0
              ? <div className="text-center py-10 text-gray-400 text-sm">No bookings yet</div>
              : <div className="space-y-2">
                  {bookings.map(b => (
                    <div key={b._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 capitalize">{b.serviceType}</p>
                        <p className="text-xs text-gray-400">{formatDate(b.date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(b.amount)}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
          ) : (
            !customer.addresses || customer.addresses.length === 0
              ? <div className="text-center py-10 text-gray-400 text-sm">No saved addresses</div>
              : <div className="space-y-3">
                  {customer.addresses.map((addr, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${addr.isDefault ? 'border-[#C9A84C] bg-amber-50/30' : 'border-gray-100 bg-gray-50'}`}>
                      {addr.isDefault && <span className="text-xs font-semibold text-[#C9A84C] mb-1 block">Default</span>}
                      <p className="text-sm text-gray-700">
                        {[addr.street, addr.city, addr.state, addr.country, addr.postalCode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const [customers,  setCustomers]  = useState<UserType[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState(() => searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [selected,   setSelected]   = useState<UserType | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const LIMIT = 25;

  const fetchCustomers = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const data = await api.users.getAll({ role: 'customer', page: pg, limit: LIMIT, search: search || undefined });
      setCustomers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { fetchCustomers(page); }, [fetchCustomers, page]);

  function handleSearchChange(val: string) {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  }

  function handleToggleActive(id: string, isActive: boolean) {
    setCustomers(prev => prev.map(c => c._id === id ? { ...c, isActive } : c));
    setSelected(prev => prev?._id === id ? { ...prev, isActive } : prev);
  }

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6">

        {/* Left panel */}
        <div className={`flex flex-col flex-shrink-0 border-r border-gray-200 bg-white transition-all ${selected ? 'hidden lg:flex lg:w-[420px]' : 'w-full lg:w-[420px]'}`}>
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Customers</h1>
                <p className="text-xs text-gray-400 mt-0.5">{total.toLocaleString()} total</p>
              </div>
              <button onClick={() => fetchCustomers(page)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <Users className="w-8 h-8" />
                <p className="text-sm">No customers found</p>
              </div>
            ) : customers.map(customer => {
              const isSelected = selected?._id === customer._id;
              const isActive = customer.isActive !== false;
              return (
                <button
                  key={customer._id}
                  onClick={() => setSelected(isSelected ? null : customer)}
                  className={`w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-amber-50/60 border-l-2 border-[#C9A84C]' : ''}`}
                >
                  <Avatar name={customer.name} avatar={customer.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                      {!isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium flex-shrink-0">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(customer.createdAt)}</p>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0">
              <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
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

        {/* Right panel */}
        {selected ? (
          <div className="flex-1 overflow-hidden bg-gray-50">
            <CustomerDetail
              key={selected._id}
              customer={selected}
              onClose={() => setSelected(null)}
              onToggleActive={handleToggleActive}
            />
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 text-gray-300 flex-col gap-3">
            <Users className="w-12 h-12" />
            <p className="text-sm font-medium">Select a customer to view details</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
