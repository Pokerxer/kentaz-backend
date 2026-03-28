'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Trash2, UserCheck, UserX, Loader2,
  ShoppingBag, TrendingUp, Package, Calendar, Mail,
  CheckCircle, XCircle, Banknote, CreditCard, ArrowLeftRight,
  ChevronLeft, ChevronRight, X, Eye, EyeOff, AlertCircle,
  Receipt, BarChart3, Clock,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { staffApi, posApi } from '@/lib/posApi';
import type { StaffMember, StaffStats, Sale } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';

function EditModal({
  staff,
  onSave,
  onClose,
}: {
  staff: StaffMember;
  onSave: (data: { name: string; email: string; isActive: boolean; password?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(staff.isActive);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload: any = { name, email, isActive };
      if (password) payload.password = password;
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Edit Staff</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue-400"
              />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Account Active</p>
              <p className="text-xs text-gray-400">Inactive staff cannot log in to POS</p>
            </div>
            <button
              type="button" onClick={() => setIsActive(a => !a)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    cash: { label: 'Cash', cls: 'bg-green-100 text-green-700', icon: <Banknote className="w-3 h-3" /> },
    card: { label: 'Card', cls: 'bg-blue-100 text-blue-700', icon: <CreditCard className="w-3 h-3" /> },
    transfer: { label: 'Transfer', cls: 'bg-purple-100 text-purple-700', icon: <ArrowLeftRight className="w-3 h-3" /> },
  };
  const m = map[method] ?? map.cash;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}

export default function StaffDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadStaff() {
    try {
      const { staff: s, stats: st } = await staffApi.getById(id);
      setStaff(s);
      setStats(st);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function loadSales(page: number) {
    setSalesLoading(true);
    try {
      const data = await posApi.getSales({ page, limit: 10, cashierId: id });
      setSales(data.sales);
      setSalesTotal(data.total);
      setSalesTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStaff(), loadSales(1)]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading) loadSales(salesPage);
  }, [salesPage]);

  async function handleSave(data: any) {
    await staffApi.update(id, data);
    showToast('Staff updated');
    await loadStaff();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await staffApi.delete(id);
      router.push('/staff');
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  async function toggleActive() {
    if (!staff) return;
    await staffApi.update(id, { isActive: !staff.isActive });
    showToast(`${staff.name} ${!staff.isActive ? 'activated' : 'deactivated'}`);
    await loadStaff();
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    </AdminLayout>
  );

  if (error || !staff) return (
    <AdminLayout>
      <div className="p-6 text-center text-red-500">{error || 'Staff not found'}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/staff" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Staff Detail</h1>
              <p className="text-sm text-gray-400">POS Staff Account</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Profile card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center gap-3 mb-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-black text-white">{staff.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{staff.name}</h2>
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full mt-1">
                    POS Staff
                  </span>
                </div>
                <button
                  onClick={toggleActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    staff.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {staff.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                  {staff.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Joined {new Date(staff.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Today summary */}
            {stats && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-500" /> Today
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-blue-700">{stats.today.totalSales}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Sales</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-green-700">{formatPrice(stats.today.totalRevenue)}</p>
                    <p className="text-xs text-green-600 mt-0.5">Revenue</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats + Sales */}
          <div className="lg:col-span-2 space-y-5">

            {/* All-time stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                  <Receipt className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-black text-gray-900">{stats.allTime.totalSales}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Sales</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <p className="text-xl font-black text-gray-900">{formatPrice(stats.allTime.totalRevenue)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Revenue</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                  <Package className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-black text-gray-900">{stats.allTime.totalItems}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Items Sold</p>
                </div>
              </div>
            )}

            {/* Recent sales */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" /> Sales History
                  <span className="text-xs text-gray-400 font-normal">({salesTotal} total)</span>
                </h3>
              </div>

              {salesLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : sales.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Receipt className="w-10 h-10 mx-auto opacity-20 mb-2" />
                  <p className="text-sm">No sales yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left border-b border-gray-100">
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sales.map(sale => (
                          <tr key={sale._id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/pos/sales/${sale._id}`} className="font-mono text-xs text-blue-600 hover:underline">
                                {sale.receiptNumber}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {new Date(sale.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {sale.items.reduce((s, i) => s + i.quantity, 0)} items
                            </td>
                            <td className="px-4 py-3"><PayBadge method={sale.paymentMethod} /></td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(sale.total)}</td>
                            <td className="px-4 py-3">
                              {sale.status === 'completed'
                                ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Done</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3 h-3" /> Voided</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile list */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {sales.map(sale => (
                      <Link key={sale._id} href={`/pos/sales/${sale._id}`} className="block p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-xs font-semibold text-gray-700">{sale.receiptNumber}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(sale.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${sale.status === 'voided' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {formatPrice(sale.total)}
                            </p>
                            <PayBadge method={sale.paymentMethod} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {salesTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">Page {salesPage} of {salesTotalPages}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                          disabled={salesPage === 1}
                          className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}
                          disabled={salesPage === salesTotalPages}
                          className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full text-sm shadow-lg z-50">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {showEdit && (
        <EditModal staff={staff} onSave={handleSave} onClose={() => setShowEdit(false)} />
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Delete {staff.name}?</h3>
            </div>
            <p className="text-sm text-gray-500">This will permanently delete the staff account. Their sales history will remain.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
