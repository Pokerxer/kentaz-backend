'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { staffApi } from '@/lib/posApi';
import type { StaffMember, StaffStats } from '@/lib/posApi';
import {
  Plus, Pencil, Trash2, UserCheck, UserX, Loader2,
  X, Eye, EyeOff, Users, ShieldCheck, CheckCircle, AlertCircle,
  Search, TrendingUp, ShoppingBag, Package, CalendarDays,
  ChevronRight,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`${sz} ${colors[idx]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── StaffModal ─────────────────────────────────────────────────

function StaffModal({
  staff,
  onSave,
  onClose,
}: {
  staff: StaffMember | null;
  onSave: (data: { name: string; email: string; password: string; isActive: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(staff?.name || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff && !password) { setError('Password is required for new staff'); return; }
    setLoading(true);
    setError('');
    try {
      await onSave({ name, email, password, isActive });
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
          <h3 className="font-bold text-gray-900">{staff ? 'Edit Staff' : 'Add Staff'}</h3>
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
              type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@kentaz.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password {staff && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={staff ? '••••••••' : 'Min 6 characters'} minLength={staff ? 0 : 6}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue-400"
              />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {staff && (
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
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {staff ? 'Save Changes' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── StaffDetail ────────────────────────────────────────────────

function StaffDetail({
  staffId,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  staffId: string;
  onEdit: (s: StaffMember) => void;
  onDelete: (id: string, name: string) => void;
  onToggleActive: (s: StaffMember) => void;
}) {
  const [data, setData] = useState<{ staff: StaffMember; stats: StaffStats } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    staffApi.getById(staffId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-sm">Could not load staff details.</p>
      </div>
    );
  }

  const { staff, stats } = data;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Profile header */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <Avatar name={staff.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{staff.name}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${staff.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {staff.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                {staff.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{staff.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
              <CalendarDays className="w-3.5 h-3.5" />
              Joined {new Date(staff.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onEdit(staff)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => onToggleActive(staff)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-medium transition ${
              staff.isActive
                ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
          >
            {staff.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            {staff.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(staff._id, staff.name)}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Today</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Revenue</span>
            </div>
            <p className="text-xl font-bold text-amber-800">{fmt(stats.today.totalRevenue)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Transactions</span>
            </div>
            <p className="text-xl font-bold text-blue-800">{stats.today.totalSales}</p>
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">All Time</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 col-span-3 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Revenue</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{fmt(stats.allTime.totalRevenue)}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Sales</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{stats.allTime.totalSales}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Items</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{stats.allTime.totalItems}</p>
          </div>
        </div>

        {/* Avg per sale */}
        {stats.allTime.totalSales > 0 && (
          <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600">Avg. Transaction Value</p>
              <p className="text-lg font-bold text-violet-800 mt-0.5">
                {fmt(stats.allTime.totalRevenue / stats.allTime.totalSales)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-violet-600">Avg. Items / Sale</p>
              <p className="text-lg font-bold text-violet-800 mt-0.5">
                {(stats.allTime.totalItems / stats.allTime.totalSales).toFixed(1)}
              </p>
            </div>
          </div>
        )}

        {/* POS access note */}
        <div className="mt-5 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600">Staff can only access the POS terminal — no admin panel access.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function StaffPage() {
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [filtered, setFiltered] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState(0); // force re-fetch after edits

  const [modalStaff, setModalStaff] = useState<StaffMember | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadStaff() {
    setLoading(true);
    try {
      const data = await staffApi.getAll();
      setAllStaff(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStaff(); }, []);

  // debounced search
  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const q = search.toLowerCase();
      setFiltered(q ? allStaff.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : allStaff);
    }, 250);
  }, [search, allStaff]);

  // auto-select first
  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0]._id);
  }, [filtered]);

  async function handleSave(data: { name: string; email: string; password: string; isActive: boolean }) {
    if (modalStaff === 'new') {
      const created = await staffApi.create({ name: data.name, email: data.email, password: data.password });
      showToast('Staff created');
      await loadStaff();
      setSelectedId(created._id);
    } else if (modalStaff) {
      const payload: any = { name: data.name, email: data.email, isActive: data.isActive };
      if (data.password) payload.password = data.password;
      await staffApi.update((modalStaff as StaffMember)._id, payload);
      showToast('Staff updated');
      await loadStaff();
      setDetailKey(k => k + 1);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await staffApi.delete(deleteTarget.id);
      showToast('Staff deleted');
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      await loadStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(s: StaffMember) {
    try {
      await staffApi.update(s._id, { isActive: !s.isActive });
      showToast(`${s.name} ${!s.isActive ? 'activated' : 'deactivated'}`);
      await loadStaff();
      setDetailKey(k => k + 1);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex">

        {/* ── Left panel ── */}
        <div className={`w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white ${selectedId ? 'hidden md:flex' : 'flex'}`}>

          {/* Left header */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Staff
                {!loading && <span className="text-xs font-normal text-gray-400">({allStaff.length})</span>}
              </h1>
              <button
                onClick={() => setModalStaff('new')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Staff list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm">{search ? 'No results' : 'No staff yet'}</p>
              </div>
            ) : (
              filtered.map(s => (
                <button
                  key={s._id}
                  onClick={() => setSelectedId(s._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition ${
                    selectedId === s._id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${selectedId ? 'flex' : 'hidden md:flex'}`}>

          {/* Mobile back button */}
          {selectedId && (
            <div className="md:hidden px-4 pt-4 pb-2">
              <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
                ← Back to staff
              </button>
            </div>
          )}

          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Users className="w-14 h-14 opacity-10" />
              <p className="font-medium text-sm">Select a staff member</p>
            </div>
          ) : (
            <StaffDetail
              key={`${selectedId}-${detailKey}`}
              staffId={selectedId}
              onEdit={s => setModalStaff(s)}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onToggleActive={handleToggleActive}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full text-sm shadow-lg z-50">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg z-50 max-w-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Staff modal */}
      {modalStaff !== null && (
        <StaffModal
          staff={modalStaff === 'new' ? null : (modalStaff as StaffMember)}
          onSave={handleSave}
          onClose={() => setModalStaff(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-gray-900">Delete {deleteTarget.name}?</h3>
            </div>
            <p className="text-sm text-gray-600">This staff member will no longer be able to log in to POS.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
