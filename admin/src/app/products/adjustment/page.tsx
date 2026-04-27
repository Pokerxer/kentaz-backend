'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Loader2, Save, Package, AlertTriangle, ChevronDown,
  ChevronUp, Plus, Minus, RefreshCw, X, CheckCircle, RotateCcw,
  Filter, TrendingUp, TrendingDown, AlertCircle,
} from 'lucide-react';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdjustmentType = 'restock' | 'damage' | 'return' | 'correction' | 'removal';

interface VariantAdj {
  variantIndex: number;
  label: string;
  sku: string;
  currentStock: number;
  delta: number;        // +/- amount
  newStock: number;     // absolute target
  mode: 'delta' | 'absolute';
}

interface ProductAdj {
  productId: string;
  productName: string;
  category: string;
  image?: string;
  variants: VariantAdj[];
  type: AdjustmentType;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES: { value: AdjustmentType; label: string; color: string; icon: string }[] = [
  { value: 'restock',    label: 'Restock',    color: 'text-green-700 bg-green-50 border-green-200',   icon: '📦' },
  { value: 'return',     label: 'Return',     color: 'text-blue-700 bg-blue-50 border-blue-200',      icon: '↩️' },
  { value: 'correction', label: 'Correction', color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: '✏️' },
  { value: 'damage',     label: 'Damage',     color: 'text-red-700 bg-red-50 border-red-200',         icon: '⚠️' },
  { value: 'removal',    label: 'Removal',    color: 'text-gray-700 bg-gray-50 border-gray-200',      icon: '🗑️' },
];

function typeStyle(t: AdjustmentType) {
  return TYPES.find(x => x.value === t)?.color ?? '';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuantityAdjustmentPage() {
  const [adjs, setAdjs] = useState<Record<string, ProductAdj>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'all' | string | null>(null);  // 'all' | productId | null
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<AdjustmentType | ''>('');
  const [modifiedOnly, setModifiedOnly] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const [allCategories, setAllCategories] = useState<string[]>([]);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.products.getAll({ limit: 1000 });
      const products = data.products.filter(p => p.variants?.length > 0);

      const cats = Array.from(new Set(products.map(p => p.category))).sort();
      setAllCategories(cats);

      const initial: Record<string, ProductAdj> = {};
      products.forEach(p => {
        initial[p._id] = {
          productId: p._id,
          productName: p.name,
          category: p.category,
          image: p.images?.[0]?.url,
          type: 'correction',
          notes: '',
          variants: p.variants.map((v, idx) => ({
            variantIndex: idx,
            label: [v.size, v.color].filter(Boolean).join(' / ') || `Variant ${idx + 1}`,
            sku: v.sku || '',
            currentStock: v.stock ?? 0,
            delta: 0,
            newStock: v.stock ?? 0,
            mode: 'delta' as const,
          })),
        };
      });
      setAdjs(initial);
    } catch {
      setMsg({ text: 'Failed to load products', ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Edit helpers ────────────────────────────────────────────────────────────

  const setDelta = (productId: string, varIdx: number, delta: number) => {
    setAdjs(prev => {
      const p = prev[productId];
      const v = p.variants[varIdx];
      const newStock = Math.max(0, v.currentStock + delta);
      const clampedDelta = newStock - v.currentStock;
      return {
        ...prev,
        [productId]: {
          ...p,
          variants: p.variants.map((vv, i) =>
            i !== varIdx ? vv : { ...vv, delta: clampedDelta, newStock, mode: 'delta' }
          ),
        },
      };
    });
  };

  const setAbsolute = (productId: string, varIdx: number, raw: string) => {
    const val = raw === '' ? 0 : Math.max(0, parseInt(raw) || 0);
    setAdjs(prev => {
      const p = prev[productId];
      const v = p.variants[varIdx];
      return {
        ...prev,
        [productId]: {
          ...p,
          variants: p.variants.map((vv, i) =>
            i !== varIdx ? vv : { ...vv, newStock: val, delta: val - v.currentStock, mode: 'absolute' }
          ),
        },
      };
    });
  };

  const toggleMode = (productId: string, varIdx: number) => {
    setAdjs(prev => {
      const p = prev[productId];
      return {
        ...prev,
        [productId]: {
          ...p,
          variants: p.variants.map((vv, i) =>
            i !== varIdx ? vv : { ...vv, mode: vv.mode === 'delta' ? 'absolute' : 'delta' }
          ),
        },
      };
    });
  };

  const resetProduct = (productId: string) => {
    setAdjs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        notes: '',
        type: 'correction',
        variants: prev[productId].variants.map(v => ({
          ...v, delta: 0, newStock: v.currentStock, mode: 'delta',
        })),
      },
    }));
  };

  const setType = (productId: string, type: AdjustmentType) =>
    setAdjs(prev => ({ ...prev, [productId]: { ...prev[productId], type } }));

  const setNotes = (productId: string, notes: string) =>
    setAdjs(prev => ({ ...prev, [productId]: { ...prev[productId], notes } }));

  // ── Save ────────────────────────────────────────────────────────────────────

  const buildItems = (ids: string[]) =>
    ids.flatMap(id => {
      const p = adjs[id];
      return p.variants
        .filter(v => v.delta !== 0)
        .map(v => ({
          productId: id,
          variantIndex: v.variantIndex,
          stock: v.newStock,
          notes: p.notes
            || `${p.type.charAt(0).toUpperCase() + p.type.slice(1)}: ${v.delta > 0 ? '+' : ''}${v.delta} (${v.label})`,
        }));
    });

  const saveItems = async (ids: string[], savingKey: 'all' | string) => {
    const items = buildItems(ids);
    if (items.length === 0) return;
    setSaving(savingKey);
    setMsg(null);
    try {
      await api.inventory.bulkUpdate(items);
      setMsg({ text: `${items.length} adjustment${items.length !== 1 ? 's' : ''} saved`, ok: true });
      // refresh only affected products by reloading all
      await loadProducts();
    } catch (err: any) {
      setMsg({ text: err.message || 'Save failed', ok: false });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = () => saveItems(Object.keys(adjs).filter(id => isModified(id)), 'all');
  const handleSaveOne = (id: string) => saveItems([id], id);

  // ── Computed ─────────────────────────────────────────────────────────────────

  const isModified = (id: string) => adjs[id]?.variants.some(v => v.delta !== 0) ?? false;

  const filtered = Object.values(adjs).filter(p => {
    if (search && !p.productName.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (modifiedOnly && !isModified(p.productId)) return false;
    if (stockFilter === 'out' && !p.variants.some(v => v.currentStock === 0)) return false;
    if (stockFilter === 'low' && !p.variants.some(v => v.currentStock > 0 && v.currentStock <= 5)) return false;
    return true;
  }).sort((a, b) => a.productName.localeCompare(b.productName));

  const modifiedCount = Object.keys(adjs).filter(isModified).length;
  const totalVariantsChanged = buildItems(Object.keys(adjs).filter(isModified)).length;
  const netDelta = buildItems(Object.keys(adjs).filter(isModified)).reduce((sum, item) => {
    const v = adjs[item.productId]?.variants[item.variantIndex];
    return sum + (v?.delta ?? 0);
  }, 0);

  const toggleExpand = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto pb-24">

        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span className="w-2 h-7 bg-[#C9A84C] rounded-full" />
              Stock Adjustment
            </h1>
            <p className="text-gray-500 mt-0.5 ml-5 text-sm">Restock, correct, or remove inventory per variant</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadProducts} title="Reload" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
            {modifiedCount > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={saving === 'all'}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#B8953F] disabled:opacity-50 transition-all shadow-sm"
              >
                {saving === 'all'
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : <><Save className="h-4 w-4" /> Save All ({totalVariantsChanged})</>}
              </button>
            )}
          </div>
        </div>

        {/* ── Message ── */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── Summary bar ── */}
        {modifiedCount > 0 && (
          <div className="mb-5 bg-white rounded-xl border border-[#C9A84C]/30 px-5 py-3 flex flex-wrap items-center gap-4 shadow-sm">
            <span className="text-sm font-semibold text-gray-800">{modifiedCount} product{modifiedCount !== 1 ? 's' : ''} modified</span>
            <span className="text-sm text-gray-500">{totalVariantsChanged} variant{totalVariantsChanged !== 1 ? 's' : ''} changed</span>
            <span className={`flex items-center gap-1 text-sm font-semibold ${netDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Net {netDelta >= 0 ? '+' : ''}{netDelta} units
            </span>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] text-gray-700"
          >
            <option value="">All categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as AdjustmentType | '')}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] text-gray-700"
          >
            <option value="">All types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {(['all', 'low', 'out'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3.5 py-2.5 font-medium capitalize transition-colors ${stockFilter === f ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f === 'all' ? 'All stock' : f === 'low' ? 'Low (≤5)' : 'Out of stock'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModifiedOnly(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${modifiedOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter className="h-3.5 w-3.5" />
            Modified only
          </button>
        </div>

        {/* ── Product list ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No products match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const modified = isModified(p.productId);
              const isExpanded = expandedIds.has(p.productId);
              const totalCurrent = p.variants.reduce((s, v) => s + v.currentStock, 0);
              const totalNew = p.variants.reduce((s, v) => s + v.newStock, 0);
              const pDelta = totalNew - totalCurrent;
              const isSavingThis = saving === p.productId;
              const hasNegative = p.variants.some(v => v.newStock < 0);
              const hasOutOfStock = p.variants.some(v => v.currentStock === 0);
              const hasLowStock = p.variants.some(v => v.currentStock > 0 && v.currentStock <= 5);

              return (
                <div
                  key={p.productId}
                  className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${
                    modified ? 'border-[#C9A84C]/50' : 'border-gray-100'
                  }`}
                >
                  {/* Card header */}
                  <div
                    className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(p.productId)}
                  >
                    {/* Thumb */}
                    <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {p.image
                        ? <img src={p.image} alt="" className="h-full w-full object-cover" />
                        : <Package className="h-5 w-5 text-gray-400 m-2.5" />}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm truncate">{p.productName}</span>
                        {hasOutOfStock && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Out of stock</span>
                        )}
                        {!hasOutOfStock && hasLowStock && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Low stock</span>
                        )}
                        {modified && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${typeStyle(p.type)}`}>
                            {TYPES.find(t => t.value === p.type)?.label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.category} · {p.variants.length} variant{p.variants.length !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Stock summary */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {modified ? (
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Current → New</div>
                          <div className="font-bold text-sm text-[#C9A84C]">
                            {totalCurrent} → {totalNew}
                            <span className={`ml-1.5 text-xs ${pDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({pDelta >= 0 ? '+' : ''}{pDelta})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-400">Total stock</div>
                          <div className="font-bold text-sm text-gray-700">{totalCurrent}</div>
                        </div>
                      )}
                      {isExpanded
                        ? <ChevronUp className="h-5 w-5 text-gray-400" />
                        : <ChevronDown className="h-5 w-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4 space-y-4">

                      {/* Type selector + notes row */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</span>
                          <div className="flex gap-1 flex-wrap">
                            {TYPES.map(t => (
                              <button
                                key={t.value}
                                onClick={() => setType(p.productId, t.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  p.type === t.value ? t.color + ' shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-48">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Reason</span>
                          <input
                            type="text"
                            value={p.notes}
                            onChange={e => setNotes(p.productId, e.target.value)}
                            placeholder="Optional note…"
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                          />
                        </div>
                      </div>

                      {/* Variants table */}
                      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Variant</th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Current</th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                <span className="flex items-center justify-center gap-2">
                                  Adjustment
                                  <span className="text-[10px] text-gray-400 normal-case font-normal">(+/– or set to)</span>
                                </span>
                              </th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">New Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {p.variants.map((v, idx) => {
                              const isOut = v.currentStock === 0;
                              const isLow = v.currentStock > 0 && v.currentStock <= 5;
                              return (
                                <tr key={idx} className={`group ${v.delta !== 0 ? 'bg-amber-50/30' : ''}`}>
                                  {/* Variant label */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-800">{v.label}</span>
                                      {v.sku && <span className="text-[11px] text-gray-400 font-mono">{v.sku}</span>}
                                      {isOut && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">Out</span>}
                                      {isLow && !isOut && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full font-semibold">Low</span>}
                                    </div>
                                  </td>

                                  {/* Current stock */}
                                  <td className="px-4 py-3 text-center">
                                    <span className={`font-semibold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-700'}`}>
                                      {v.currentStock}
                                    </span>
                                  </td>

                                  {/* Adjustment controls — mode toggle */}
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col items-center gap-2">
                                      {/* Mode pill */}
                                      <button
                                        onClick={() => toggleMode(p.productId, idx)}
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                                          v.mode === 'delta'
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                        }`}
                                      >
                                        {v.mode === 'delta' ? '+/– delta' : 'Set to'}
                                      </button>

                                      {v.mode === 'delta' ? (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => setDelta(p.productId, idx, v.delta - 1)}
                                            className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                                          >
                                            <Minus className="h-3.5 w-3.5" />
                                          </button>
                                          <input
                                            type="number"
                                            value={v.delta}
                                            onChange={e => setDelta(p.productId, idx, parseInt(e.target.value) || 0)}
                                            className={`w-20 px-2 py-2 border rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] ${
                                              v.delta > 0 ? 'border-green-300 text-green-700 bg-green-50'
                                              : v.delta < 0 ? 'border-red-300 text-red-700 bg-red-50'
                                              : 'border-gray-200 text-gray-700 bg-white'
                                            }`}
                                          />
                                          <button
                                            onClick={() => setDelta(p.productId, idx, v.delta + 1)}
                                            className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-colors"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <input
                                          type="number"
                                          min="0"
                                          value={v.newStock}
                                          onChange={e => setAbsolute(p.productId, idx, e.target.value)}
                                          className="w-28 px-3 py-2 border-2 border-[#C9A84C]/50 rounded-lg text-center text-sm font-semibold text-[#C9A84C] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white"
                                        />
                                      )}
                                    </div>
                                  </td>

                                  {/* New stock */}
                                  <td className="px-4 py-3 text-center">
                                    {v.delta !== 0 ? (
                                      <div>
                                        <span className={`text-base font-bold ${v.newStock === 0 ? 'text-red-600' : v.newStock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                                          {v.newStock}
                                        </span>
                                        <div className={`text-xs font-semibold ${v.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {v.delta > 0 ? '+' : ''}{v.delta}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Per-product action row */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => resetProduct(p.productId)}
                          disabled={!modified}
                          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </button>

                        {modified && (
                          <button
                            onClick={() => handleSaveOne(p.productId)}
                            disabled={!!saving || hasNegative}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-all"
                          >
                            {isSavingThis
                              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                              : <><Save className="h-3.5 w-3.5" /> Save this product</>}
                          </button>
                        )}
                      </div>

                      {hasNegative && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          Stock cannot go below 0 — adjust the delta values
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
