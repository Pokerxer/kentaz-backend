'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api } from '@/lib/api';
import type { Discount, Product } from '@/lib/api';
import {
  Percent, Plus, Search, Loader2, X, ChevronRight,
  CheckCircle, AlertCircle, Save, Trash2, Copy,
  RotateCcw, Zap, Package,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpired(d: Discount) {
  if (!d.endDate) return false;
  return new Date(d.endDate) < new Date();
}

function isNotStarted(d: Discount) {
  if (!d.startDate) return false;
  return new Date(d.startDate) > new Date();
}

function discountStatus(d: Discount): 'active' | 'inactive' | 'expired' | 'scheduled' {
  if (!d.isActive) return 'inactive';
  if (isExpired(d)) return 'expired';
  if (isNotStarted(d)) return 'scheduled';
  if (d.usageLimit !== null && d.usageCount >= d.usageLimit) return 'expired';
  return 'active';
}

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
  scheduled: 'bg-blue-100 text-blue-600',
};

const BLANK: Omit<Discount, '_id' | 'usageCount' | 'createdAt' | 'updatedAt'> = {
  code: '',
  description: '',
  type: 'percentage',
  value: 10,
  minOrderValue: 0,
  maxDiscount: null,
  applicableTo: 'all',
  categories: [],
  products: [],
  usageLimit: null,
  perCustomerLimit: null,
  isActive: true,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
};

// ── DiscountForm ───────────────────────────────────────────────

function DiscountForm({
  initial,
  allCategories,
  onSave,
  onDelete,
  onResetUsage,
  isNew,
}: {
  initial: Discount | typeof BLANK;
  allCategories: string[];
  onSave: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  onResetUsage?: () => Promise<void>;
  isNew: boolean;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [catInput, setCatInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Pick<Product, '_id' | 'name' | 'images' | 'category'>[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const productSearchRef = useRef<ReturnType<typeof setTimeout>>();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    setForm({ ...initial });
    setShowDelete(false);
    setProductSearch('');
    setProductResults([]);
  }, [(initial as any)._id]);

  // Debounced product search
  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    clearTimeout(productSearchRef.current);
    productSearchRef.current = setTimeout(async () => {
      setProductSearching(true);
      try {
        const res = await api.products.getAll({ search: productSearch, limit: 10 });
        // Filter out already selected
        const selectedIds = (form.products as any[]).map((p: any) => p._id);
        setProductResults(res.products.filter(p => !selectedIds.includes(p._id)));
      } catch {}
      setProductSearching(false);
    }, 300);
  }, [productSearch]);

  function showMsg(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initial);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return;
    setSaving(true);
    // Convert populated products to IDs for the API
    const payload = {
      ...form,
      products: (form.products as any[]).map((p: any) => p._id ?? p),
    };
    try {
      await onSave(payload);
      showMsg('ok', isNew ? 'Discount created' : 'Discount saved');
    } catch (err: any) {
      showMsg('err', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err: any) {
      showMsg('err', err.message || 'Delete failed');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  async function handleResetUsage() {
    if (!onResetUsage) return;
    setResetLoading(true);
    try {
      await onResetUsage();
      showMsg('ok', 'Usage count reset');
    } catch (err: any) {
      showMsg('err', err.message || 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  }

  function addCategory(cat: string) {
    const trimmed = cat.trim();
    if (trimmed && !form.categories.includes(trimmed)) {
      setForm(f => ({ ...f, categories: [...f.categories, trimmed] }));
    }
    setCatInput('');
  }

  function removeCategory(cat: string) {
    setForm(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }));
  }

  const usageDiscount = initial as Discount;
  const usagePct = usageDiscount.usageLimit
    ? Math.round((usageDiscount.usageCount / usageDiscount.usageLimit) * 100)
    : null;

  return (
    <div className="flex-1 overflow-y-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-lg text-white ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base">
              {isNew ? 'New Discount' : form.code || 'Discount'}
            </h2>
            {!isNew && (
              <p className="text-xs text-gray-400 mt-0.5">{(usageDiscount).usageCount} uses · created {fmtDate(usageDiscount.createdAt)}</p>
            )}
          </div>
          {!isNew && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[discountStatus(usageDiscount)]}`}>
              {discountStatus(usageDiscount)}
            </span>
          )}
        </div>

        {/* Usage bar (edit only) */}
        {!isNew && usageDiscount.usageCount > 0 && (
          <div className="px-6 pt-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">Usage</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {usageDiscount.usageCount} {usageDiscount.usageLimit ? `/ ${usageDiscount.usageLimit}` : 'uses'}
                  </span>
                  <button type="button" onClick={handleResetUsage} disabled={resetLoading}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {resetLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Reset
                  </button>
                </div>
              </div>
              {usagePct !== null && (
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-5 space-y-5">
          {/* Code + description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text" required value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input
                type="text" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Summer sale 20% off"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Type + Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Type & Value</label>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['percentage', 'fixed'] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`px-4 py-2.5 text-sm font-medium transition ${form.type === t ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {t === 'percentage' ? '% Off' : '₦ Off'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {form.type === 'percentage' ? '%' : '₦'}
                </span>
                <input
                  type="number" required min={0} max={form.type === 'percentage' ? 100 : undefined}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Min order + max discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Order (₦)</label>
              <input type="number" min={0} value={form.minOrderValue}
                onChange={e => setForm(f => ({ ...f, minOrderValue: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
              <p className="text-xs text-gray-400 mt-1">0 = no minimum</p>
            </div>
            {form.type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Discount (₦)</label>
                <input type="number" min={0}
                  value={form.maxDiscount ?? ''}
                  onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="No cap"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-xs text-gray-400 mt-1">Caps % discount amount</p>
              </div>
            )}
          </div>

          {/* Usage limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Usage Limit</label>
              <input type="number" min={0}
                value={form.usageLimit ?? ''}
                onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Unlimited"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Per Customer Limit</label>
              <input type="number" min={0}
                value={form.perCustomerLimit ?? ''}
                onChange={e => setForm(f => ({ ...f, perCustomerLimit: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Unlimited"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Applicable to */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Applies To</label>
            <div className="flex gap-1.5">
              {(['all', 'categories', 'products'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, applicableTo: t }))}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition ${form.applicableTo === t ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {t === 'all' ? 'All' : t === 'categories' ? 'Categories' : 'Products'}
                </button>
              ))}
            </div>

            {/* Categories picker */}
            {form.applicableTo === 'categories' && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.categories.map(cat => (
                    <span key={cat} className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700">
                      {cat}
                      <button type="button" onClick={() => removeCategory(cat)} className="text-amber-400 hover:text-amber-700">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {allCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allCategories.filter(c => !form.categories.includes(c)).map(cat => (
                      <button key={cat} type="button" onClick={() => addCategory(cat)}
                        className="px-2.5 py-1 border border-gray-200 rounded-full text-xs text-gray-600 hover:border-amber-300 hover:bg-amber-50 transition">
                        + {cat}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={catInput} onChange={e => setCatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(catInput); } }}
                      placeholder="Category name, press Enter"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                    <button type="button" onClick={() => addCategory(catInput)}
                      className="px-3 py-2 bg-amber-500 text-white rounded-xl text-sm hover:bg-amber-600">Add</button>
                  </div>
                )}
              </div>
            )}

            {/* Products picker */}
            {form.applicableTo === 'products' && (
              <div className="mt-2 space-y-2">
                {/* Selected products */}
                {(form.products as any[]).length > 0 && (
                  <div className="space-y-1.5">
                    {(form.products as any[]).map((p: any) => (
                      <div key={p._id} className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, products: (f.products as any[]).filter((x: any) => x._id !== p._id) }))}
                          className="text-amber-300 hover:text-red-500 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products to add…"
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                  />
                  {productSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
                </div>

                {/* Search results */}
                {productResults.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {productResults.map(p => (
                      <button key={p._id} type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, products: [...(f.products as any[]), p] }));
                          setProductResults(r => r.filter(x => x._id !== p._id));
                          setProductSearch('');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-amber-50 transition border-b border-gray-100 last:border-0 text-left">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {(form.products as any[]).length === 0 && !productSearch && (
                  <p className="text-xs text-gray-400 text-center py-2">Search for products above to add them</p>
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
              <input type="date"
                value={form.startDate ? form.startDate.slice(0, 10) : ''}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
              <input type="date"
                value={form.endDate ? form.endDate.slice(0, 10) : ''}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value || null }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank = no expiry</p>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-400">Inactive codes cannot be applied</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex items-center gap-2">
          <button type="submit" disabled={saving || (!isNew && !hasChanges)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isNew ? 'Create' : 'Save'}
          </button>
          {!isNew && hasChanges && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Unsaved
            </span>
          )}
          {!isNew && (
            <button type="button" onClick={() => setShowDelete(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </form>

      {/* Delete confirm */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete "{(initial as Discount).code}"?</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Validate Tester ────────────────────────────────────────────

function ValidateTester() {
  const [code, setCode] = useState('');
  const [cartTotal, setCartTotal] = useState('');
  const [result, setResult] = useState<{ valid: boolean; error?: string; discountAmount?: number; discount?: any } | null>(null);
  const [loading, setLoading] = useState(false);

  async function test(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.discounts.validate(code, parseFloat(cartTotal) || 0);
      setResult(res);
    } catch (err: any) {
      setResult({ valid: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 pb-6 border-t border-gray-100 pt-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> Test a code
      </p>
      <form onSubmit={test} className="space-y-2">
        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CODE" required
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-amber-400" />
        <input type="number" value={cartTotal} onChange={e => setCartTotal(e.target.value)} placeholder="Cart total (₦)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        <button type="submit" disabled={loading || !code}
          className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Test'}
        </button>
      </form>
      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${result.valid ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {result.valid
            ? <>✓ Valid — saves <strong>{fmt(result.discountAmount!)}</strong></>
            : <>✗ {result.error}</>
          }
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filtered, setFiltered] = useState<Discount[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedId, setSelectedId] = useState<string | null | 'new'>('new');
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  async function load() {
    setLoading(true);
    try {
      const [disc, cats] = await Promise.all([
        api.discounts.getAll(),
        api.categories.getAll(),
      ]);
      setDiscounts(disc);
      setCategories((cats as any[]).map((c: any) => c.name).filter(Boolean));
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      let list = discounts;
      if (search) list = list.filter(d => d.code.includes(search.toUpperCase()) || d.description.toLowerCase().includes(search.toLowerCase()));
      if (statusFilter !== 'all') list = list.filter(d => statusFilter === 'active' ? d.isActive : !d.isActive);
      setFiltered(list);
    }, 200);
  }, [search, statusFilter, discounts]);

  const selected = selectedId === 'new' ? null : discounts.find(d => d._id === selectedId) ?? null;

  // KPIs
  const activeCount = discounts.filter(d => discountStatus(d) === 'active').length;
  const totalUses = discounts.reduce((s, d) => s + d.usageCount, 0);
  const expiredCount = discounts.filter(d => discountStatus(d) === 'expired').length;

  async function handleCreate(data: any) {
    const created = await api.discounts.create(data);
    setDiscounts(prev => [created, ...prev]);
    setSelectedId(created._id);
  }

  async function handleUpdate(data: any) {
    const updated = await api.discounts.update(selected!._id, data);
    setDiscounts(prev => prev.map(d => d._id === updated._id ? updated : d));
  }

  async function handleDelete() {
    await api.discounts.delete(selected!._id);
    setDiscounts(prev => prev.filter(d => d._id !== selected!._id));
    setSelectedId('new');
  }

  async function handleResetUsage() {
    const updated = await api.discounts.resetUsage(selected!._id);
    setDiscounts(prev => prev.map(d => d._id === updated._id ? updated : d));
  }

  function copyCode(code: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex">

        {/* ── Left panel ── */}
        <div className={`w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white ${selectedId !== null && selectedId !== '' ? 'hidden md:flex' : 'flex'}`}>

          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-500" /> Discounts
                </h1>
                {!loading && (
                  <p className="text-xs text-gray-400 mt-0.5">{activeCount} active · {totalUses} total uses · {expiredCount} expired</p>
                )}
              </div>
              <button
                onClick={() => setSelectedId('new')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedId === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search codes…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50" />
            </div>

            {/* Status filter */}
            <div className="flex gap-1">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition capitalize ${statusFilter === s ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Percent className="w-10 h-10 mx-auto opacity-15 mb-2" />
                <p className="text-sm">{search ? 'No results' : 'No discount codes yet'}</p>
              </div>
            ) : (
              filtered.map(d => {
                const st = discountStatus(d);
                return (
                  <button key={d._id} onClick={() => setSelectedId(d._id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition ${selectedId === d._id ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-gray-50'}`}>
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                      <Percent className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-800 font-mono truncate">{d.code}</p>
                        <button onClick={e => copyCode(d.code, e)} className="text-gray-300 hover:text-gray-500 transition flex-shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {d.type === 'percentage' ? `${d.value}% off` : `${fmt(d.value)} off`}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{d.usageCount} uses</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[st]}`}>
                        {st}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${selectedId !== null ? 'flex' : 'hidden md:flex'}`}>

          {/* Mobile back */}
          <div className="md:hidden px-4 pt-4 pb-2">
            <button onClick={() => setSelectedId(null)} className="text-sm text-amber-600 font-medium">
              ← Back to discounts
            </button>
          </div>

          {selectedId === 'new' ? (
            <DiscountForm
              key="new"
              initial={BLANK}
              allCategories={categories}
              onSave={handleCreate}
              isNew={true}
            />
          ) : selected ? (
            <>
              <DiscountForm
                key={selected._id}
                initial={selected}
                allCategories={categories}
                onSave={handleUpdate}
                onDelete={handleDelete}
                onResetUsage={handleResetUsage}
                isNew={false}
              />
              <ValidateTester />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Percent className="w-14 h-14 opacity-10" />
              <p className="font-medium text-sm">Select a discount to edit</p>
              <button onClick={() => setSelectedId('new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition">
                <Plus className="w-4 h-4" /> New Discount
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
