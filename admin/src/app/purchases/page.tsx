'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Loader2,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  TrendingDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { purchaseApi, Purchase } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:            { label: 'Pending',            color: 'bg-amber-100 text-amber-700',  icon: Clock },
  received:           { label: 'Received',           color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  partially_returned: { label: 'Part. Returned',     color: 'bg-blue-100 text-blue-700',    icon: RotateCcw },
  returned:           { label: 'Returned',           color: 'bg-gray-100 text-gray-500',    icon: RotateCcw },
  cancelled:          { label: 'Cancelled',          color: 'bg-red-50 text-red-500',       icon: XCircle },
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Received' },
  { value: 'partially_returned', label: 'Part. Returned' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
];

type SortKey = 'purchaseDate' | 'supplier' | 'reference' | 'items' | 'totalCost' | 'status';
type SortOrder = 'asc' | 'desc';

const columnConfig: Record<SortKey, { label: string; sortable: boolean }> = {
  purchaseDate: { label: 'Date', sortable: true },
  supplier:     { label: 'Supplier', sortable: true },
  reference:   { label: 'Ref', sortable: true },
  items:       { label: 'Items', sortable: true },
  totalCost:   { label: 'Total Cost', sortable: true },
  status:      { label: 'Status', sortable: true },
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<{ pending: number; received: number; last30DaysCost: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const LIMIT = 20;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const fetchPurchases = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: currentPage, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (search) params.supplier = search;
      const data = await purchaseApi.getAll(params);
      setPurchases(data.purchases);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    purchaseApi.getStats().then(s => {
      setStats({
        pending: s.byStatus.pending.count,
        received: s.byStatus.received.count,
        last30DaysCost: s.last30Days.totalCost,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [statusFilter, search]);
  useEffect(() => { fetchPurchases(page); }, [fetchPurchases, page]);

  const sortedPurchases = useMemo(() => {
    const result = [...purchases];
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case 'purchaseDate':
          aVal = new Date(a.purchaseDate).getTime();
          bVal = new Date(b.purchaseDate).getTime();
          break;
        case 'supplier':
          aVal = a.supplier || '';
          bVal = b.supplier || '';
          break;
        case 'reference':
          aVal = a.reference || '';
          bVal = b.reference || '';
          break;
        case 'items':
          aVal = a.items.length;
          bVal = b.items.length;
          break;
        case 'totalCost':
          aVal = a.totalCost || 0;
          bVal = b.totalCost || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
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
  }, [purchases, sortKey, sortOrder]);

  const handleReceive = async (id: string) => {
    setActionLoading(id);
    try {
      await purchaseApi.receive(id);
      setMsg('Purchase marked as received and stock updated.');
      fetchPurchases(page);
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setMsg(err.message || 'Failed to receive purchase');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this purchase? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await purchaseApi.cancel(id);
      fetchPurchases(page);
    } catch (err: any) {
      setMsg(err.message || 'Failed to cancel purchase');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#C9A84C] rounded-full" />
              Purchases
            </h1>
            <p className="text-gray-500 mt-1 ml-5">Record supplier purchases and restock inventory</p>
          </div>
          <Link
            href="/purchases/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all shadow-lg shadow-[#C9A84C]/20"
          >
            <Plus className="h-4 w-4" />
            New Purchase
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-3 shadow-md shadow-amber-400/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm text-gray-500">Pending Deliveries</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.pending ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-3 shadow-md shadow-green-500/20">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm text-gray-500">Total Received</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.received ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center mb-3 shadow-md shadow-[#C9A84C]/20">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm text-gray-500">Spend (Last 30 Days)</p>
            <p className="text-2xl font-bold text-gray-900">{stats ? formatPrice(stats.last30DaysCost) : '—'}</p>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            msg.includes('Failed') || msg.includes('Cannot')
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            {msg}
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#C9A84C] text-white shadow-md shadow-[#C9A84C]/20'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#C9A84C]" />
              Purchase Orders
            </h2>
            {!loading && <span className="text-sm text-gray-400">{total} records</span>}
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C] mx-auto" />
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No purchases yet</p>
                      <p className="text-gray-400 text-sm mt-1">Record your first supplier purchase to get started</p>
                      <Link
                        href="/purchases/new"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        New Purchase
                      </Link>
                    </td>
                  </tr>
                ) : (
                  sortedPurchases.map(purchase => {
                    const cfg = statusConfig[purchase.status];
                    const StatusIcon = cfg.icon;
                    const isActioning = actionLoading === purchase._id;

                    return (
                      <tr key={purchase._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(purchase.purchaseDate)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{purchase.supplier}</p>
                          {purchase.notes && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{purchase.notes}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {purchase.reference || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                          <p className="text-xs text-gray-400">
                            {purchase.items.reduce((s, i) => s + i.quantity, 0)} units total
                          </p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatPrice(purchase.totalCost)}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/purchases/${purchase._id}`}
                              className="text-sm text-[#C9A84C] hover:underline font-medium"
                            >
                              View
                            </Link>
                            {['received', 'partially_returned'].includes(purchase.status) && (
                              <Link
                                href={`/purchases/${purchase._id}`}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Return
                              </Link>
                            )}
                            {purchase.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleReceive(purchase._id)}
                                  disabled={!!actionLoading}
                                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                >
                                  {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                  Receive
                                </button>
                                <button
                                  onClick={() => handleCancel(purchase._id)}
                                  disabled={!!actionLoading}
                                  className="text-sm text-gray-400 hover:text-red-500 font-medium disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
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
