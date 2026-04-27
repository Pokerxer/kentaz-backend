'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Loader2, CheckCircle, Package, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Pencil, Check, X, AlertTriangle,
  Save, RefreshCw, Layers,
} from 'lucide-react';
import { api, Product, Variant } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantCount {
  variantIndex: number;
  size: string;
  color: string;
  expectedStock: number;
  countedStock: number | '';
  variance: number | null;
}

interface ProductCount {
  productId: string;
  productName: string;
  category: string;
  image?: string;
  rawVariants: Variant[];          // original from API — mutated by edits
  variants: VariantCount[];
  notes: string;
  status: 'pending' | 'counted' | 'discrepancy';
}

// name / variant label edits queued for API save (saved with the batch)
interface PendingEdit {
  name?: string;                   // if name was changed
  variants?: Variant[];            // full variants array if any label was changed
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function variantLabel(size: string, color: string, idx: number) {
  return [size, color].filter(Boolean).join(' / ') || `Variant ${idx + 1}`;
}

function deriveStatus(variants: VariantCount[]): ProductCount['status'] {
  const counted = variants.filter(v => v.countedStock !== '');
  if (counted.length === 0) return 'pending';
  if (counted.some(v => v.variance !== 0)) return 'discrepancy';
  return 'counted';
}

const BATCH_SIZES = [10, 20, 50] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockCountPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, ProductCount>>({});
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});

  const [batchSize, setBatchSize] = useState<typeof BATCH_SIZES[number]>(20);
  const [currentBatch, setCurrentBatch] = useState(0);       // 0-indexed batch
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'counted' | 'discrepancy'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // inline editing state
  const [editingName, setEditingName] = useState<string | null>(null);      // productId
  const [nameInput, setNameInput] = useState('');
  const [editingVariant, setEditingVariant] = useState<{ productId: string; variantIdx: number } | null>(null);
  const [variantSizeInput, setVariantSizeInput] = useState('');
  const [variantColorInput, setVariantColorInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const variantEditRef = useRef<HTMLDivElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.products.getAll({ limit: 1000 });
      const products = data.products;
      setAllProducts(products);

      const initial: Record<string, ProductCount> = {};
      products.forEach(p => {
        const variants: VariantCount[] = (p.variants || []).map((v, idx) => ({
          variantIndex: idx,
          size: v.size || '',
          color: v.color || '',
          expectedStock: v.stock ?? 0,
          countedStock: '',
          variance: null,
        }));
        initial[p._id] = {
          productId: p._id,
          productName: p.name,
          category: p.category,
          image: p.images?.[0]?.url,
          rawVariants: p.variants || [],
          variants,
          notes: '',
          status: 'pending',
        };
      });
      setCounts(initial);
      setPendingEdits({});
    } catch {
      // silently fail — user can refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setCurrentBatch(0); }, [searchQuery, categoryFilter, statusFilter, batchSize]);

  // ── Filtered + batched list ───────────────────────────────────────────────

  const allCategories = Array.from(new Set(allProducts.map(p => p.category))).sort();

  const filteredCounts = Object.values(counts).filter(pc => {
    if (searchQuery && !pc.productName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter && pc.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && pc.status !== statusFilter) return false;
    return true;
  });

  const totalBatches = Math.max(1, Math.ceil(filteredCounts.length / batchSize));
  const safeBatch = Math.min(currentBatch, totalBatches - 1);
  const batchCounts = filteredCounts.slice(safeBatch * batchSize, (safeBatch + 1) * batchSize);

  // ── Expand / collapse ─────────────────────────────────────────────────────

  const toggleExpand = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const expandAll = () => setExpandedIds(new Set(batchCounts.map(pc => pc.productId)));
  const collapseAll = () => setExpandedIds(new Set());

  // ── Count update ──────────────────────────────────────────────────────────

  const updateCount = (productId: string, variantIdx: number, raw: string) => {
    const counted: number | '' = raw === '' ? '' : Math.max(0, parseInt(raw) || 0);
    setCounts(prev => {
      const pc = prev[productId];
      const updatedVariants = pc.variants.map((v, i) => {
        if (i !== variantIdx) return v;
        const variance = counted === '' ? null : counted - v.expectedStock;
        return { ...v, countedStock: counted, variance };
      });
      return { ...prev, [productId]: { ...pc, variants: updatedVariants, status: deriveStatus(updatedVariants) } };
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setCounts(prev => ({ ...prev, [productId]: { ...prev[productId], notes } }));
  };

  // ── Inline name edit ──────────────────────────────────────────────────────

  const startEditName = (pc: ProductCount) => {
    setEditingName(pc.productId);
    setNameInput(pc.productName);
    setTimeout(() => nameInputRef.current?.focus(), 30);
  };

  const commitName = (productId: string) => {
    const name = nameInput.trim();
    if (!name || name === counts[productId]?.productName) { setEditingName(null); return; }
    setCounts(prev => ({ ...prev, [productId]: { ...prev[productId], productName: name } }));
    setPendingEdits(prev => ({ ...prev, [productId]: { ...prev[productId], name } }));
    setEditingName(null);
  };

  const cancelEditName = () => setEditingName(null);

  // ── Inline variant label edit ─────────────────────────────────────────────

  const startEditVariant = (productId: string, variantIdx: number) => {
    const v = counts[productId].variants[variantIdx];
    setEditingVariant({ productId, variantIdx });
    setVariantSizeInput(v.size);
    setVariantColorInput(v.color);
  };

  const commitVariant = (productId: string, variantIdx: number) => {
    const size = variantSizeInput.trim();
    const color = variantColorInput.trim();
    setCounts(prev => {
      const pc = prev[productId];
      const updatedVariants = pc.variants.map((v, i) =>
        i !== variantIdx ? v : { ...v, size, color }
      );
      const updatedRaw = pc.rawVariants.map((v, i) =>
        i !== variantIdx ? v : { ...v, size, color }
      );
      return { ...prev, [productId]: { ...pc, variants: updatedVariants, rawVariants: updatedRaw } };
    });
    setPendingEdits(prev => {
      const pc = counts[productId];
      const updatedRaw = pc.rawVariants.map((v, i) =>
        i !== variantIdx ? v : { ...v, size: size || v.size, color: color || v.color }
      );
      return { ...prev, [productId]: { ...prev[productId], variants: updatedRaw } };
    });
    setEditingVariant(null);
  };

  const cancelVariant = () => setEditingVariant(null);

  // ── Save batch ────────────────────────────────────────────────────────────

  const handleSaveBatch = async () => {
    const stockItems: { productId: string; variantIndex: number; stock: number; notes?: string }[] = [];
    const productUpdateIds: string[] = [];

    batchCounts.forEach(pc => {
      pc.variants.forEach(v => {
        if (v.countedStock !== '') {
          stockItems.push({
            productId: pc.productId,
            variantIndex: v.variantIndex,
            stock: v.countedStock as number,
            notes: pc.notes || (v.variance !== 0 ? `Count variance: ${v.variance! > 0 ? '+' : ''}${v.variance}` : 'Stock count ok'),
          });
        }
      });
      if (pendingEdits[pc.productId]) productUpdateIds.push(pc.productId);
    });

    if (stockItems.length === 0 && productUpdateIds.length === 0) return;

    setSaving(true);
    setSavedMsg(null);
    try {
      const tasks: Promise<any>[] = [];

      if (stockItems.length > 0) {
        tasks.push(api.inventory.bulkUpdate(stockItems));
      }

      productUpdateIds.forEach(id => {
        const edit = pendingEdits[id];
        const payload: any = {};
        if (edit.name) payload.name = edit.name;
        if (edit.variants) payload.variants = edit.variants;
        if (Object.keys(payload).length > 0) {
          tasks.push(api.products.update(id, payload));
        }
      });

      await Promise.all(tasks);

      const parts = [];
      if (stockItems.length > 0) parts.push(`${stockItems.length} stock count${stockItems.length !== 1 ? 's' : ''} saved`);
      if (productUpdateIds.length > 0) parts.push(`${productUpdateIds.length} product${productUpdateIds.length !== 1 ? 's' : ''} updated`);
      setSavedMsg({ text: parts.join(' · '), ok: true });

      // clear pending edits for this batch and reset counts to reflect new expected stock
      const savedIds = new Set([...batchCounts.map(pc => pc.productId)]);
      setPendingEdits(prev => {
        const next = { ...prev };
        savedIds.forEach(id => delete next[id]);
        return next;
      });
      setCounts(prev => {
        const next = { ...prev };
        savedIds.forEach(id => {
          if (!next[id]) return;
          const updated: VariantCount[] = next[id].variants.map(v => {
            if (v.countedStock === '') return v;
            return { ...v, expectedStock: v.countedStock as number, countedStock: '' as const, variance: null };
          });
          next[id] = { ...next[id], variants: updated, status: deriveStatus(updated) };
        });
        return next;
      });
    } catch (err: any) {
      setSavedMsg({ text: err.message || 'Save failed', ok: false });
    } finally {
      setSaving(false);
    }
  };

  // ── Batch stats ───────────────────────────────────────────────────────────

  const batchStats = {
    counted: batchCounts.filter(pc => pc.status !== 'pending').length,
    discrepancies: batchCounts.filter(pc => pc.status === 'discrepancy').length,
    pendingEdits: batchCounts.filter(pc => !!pendingEdits[pc.productId]).length,
    total: batchCounts.length,
  };

  const hasBatchWork =
    batchCounts.some(pc => pc.variants.some(v => v.countedStock !== '')) ||
    batchCounts.some(pc => !!pendingEdits[pc.productId]);

  // ── Global stats ──────────────────────────────────────────────────────────

  const globalStats = {
    total: Object.keys(counts).length,
    counted: Object.values(counts).filter(s => s.status !== 'pending').length,
  };
  const progress = globalStats.total > 0 ? Math.round((globalStats.counted / globalStats.total) * 100) : 0;

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
              Stock Count
            </h1>
            <p className="text-gray-500 mt-0.5 ml-5 text-sm">Count stock in batches · edit names & variant labels inline</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadProducts} title="Reload" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveBatch}
              disabled={saving || !hasBatchWork}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#B8953F] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4" /> Save Batch</>}
            </button>
          </div>
        </div>

        {/* ── Save message ── */}
        {savedMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${savedMsg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {savedMsg.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {savedMsg.text}
            <button onClick={() => setSavedMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── Overall progress ── */}
        <div className="mb-5 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{globalStats.counted} / {globalStats.total} products counted</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {(['all', 'pending', 'counted', 'discrepancy'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-2.5 capitalize font-medium transition-colors ${statusFilter === f ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Batch controls ── */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Layers className="h-4 w-4 text-[#C9A84C]" />
              <span className="font-semibold text-gray-900">Batch {safeBatch + 1}</span>
              <span className="text-gray-400">of {totalBatches}</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {batchStats.counted} counted
              </span>
              {batchStats.discrepancies > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  {batchStats.discrepancies} discrepancies
                </span>
              )}
              {batchStats.pendingEdits > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Pencil className="h-3 w-3" />
                  {batchStats.pendingEdits} edits unsaved
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Batch size */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 hidden sm:block">Per batch:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {BATCH_SIZES.map(n => (
                  <button
                    key={n}
                    onClick={() => setBatchSize(n)}
                    className={`px-2.5 py-1.5 font-medium transition-colors ${batchSize === n ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {/* Expand / collapse */}
            <button onClick={expandAll} className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Expand all</button>
            <button onClick={collapseAll} className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Collapse</button>
            {/* Prev / next */}
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentBatch(b => Math.max(0, b - 1))}
                disabled={safeBatch === 0}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentBatch(b => Math.min(totalBatches - 1, b + 1))}
                disabled={safeBatch >= totalBatches - 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Product cards ── */}
        {batchCounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No products match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batchCounts.map(pc => {
              const isExpanded = expandedIds.has(pc.productId);
              const hasCounts = pc.variants.some(v => v.countedStock !== '');
              const hasEdit = !!pendingEdits[pc.productId];
              const isEditingThisName = editingName === pc.productId;

              const borderCls =
                pc.status === 'discrepancy' ? 'border-red-200 bg-red-50/20'
                : pc.status === 'counted' ? 'border-green-200 bg-green-50/20'
                : 'border-gray-100';

              return (
                <div key={pc.productId} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${borderCls}`}>

                  {/* ── Card header ── */}
                  <div className="px-5 py-3.5 flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {pc.image
                        ? <img src={pc.image} alt="" className="h-full w-full object-cover" />
                        : <Package className="h-5 w-5 text-gray-400 m-2.5" />}
                    </div>

                    {/* Name + category */}
                    <div className="flex-1 min-w-0">
                      {isEditingThisName ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input
                            ref={nameInputRef}
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitName(pc.productId); if (e.key === 'Escape') cancelEditName(); }}
                            className="flex-1 px-2.5 py-1.5 border-2 border-[#C9A84C] rounded-lg text-sm font-semibold focus:outline-none min-w-0"
                          />
                          <button onClick={() => commitName(pc.productId)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEditName} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-semibold text-gray-900 text-sm truncate">{pc.productName}</span>
                          <button
                            onClick={e => { e.stopPropagation(); startEditName(pc); }}
                            title="Edit product name"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all flex-shrink-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {hasEdit && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold flex-shrink-0">edited</span>}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">{pc.category} · {pc.variants.length} variant{pc.variants.length !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Status badge + expand toggle */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {hasCounts && (
                        <span className={`hidden sm:block text-xs font-semibold px-2.5 py-1 rounded-full ${
                          pc.status === 'discrepancy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {pc.status === 'discrepancy' ? 'Discrepancy' : 'Counted'}
                        </span>
                      )}
                      <button onClick={() => toggleExpand(pc.productId)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded content ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-4">

                      {/* Variants table */}
                      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Variant</th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Expected</th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Counted</th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Variance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pc.variants.map((v, idx) => {
                              const isEditingThisVariant =
                                editingVariant?.productId === pc.productId &&
                                editingVariant?.variantIdx === idx;
                              const label = variantLabel(v.size, v.color, idx);

                              return (
                                <tr key={idx} className="group/row hover:bg-gray-50/50">
                                  {/* Variant label */}
                                  <td className="px-4 py-3">
                                    {isEditingThisVariant ? (
                                      <div ref={variantEditRef} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <input
                                          autoFocus
                                          placeholder="Size"
                                          value={variantSizeInput}
                                          onChange={e => setVariantSizeInput(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') commitVariant(pc.productId, idx); if (e.key === 'Escape') cancelVariant(); }}
                                          className="w-20 px-2 py-1.5 border border-[#C9A84C] rounded-lg text-xs focus:outline-none"
                                        />
                                        <span className="text-gray-300">/</span>
                                        <input
                                          placeholder="Color"
                                          value={variantColorInput}
                                          onChange={e => setVariantColorInput(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') commitVariant(pc.productId, idx); if (e.key === 'Escape') cancelVariant(); }}
                                          className="w-24 px-2 py-1.5 border border-[#C9A84C] rounded-lg text-xs focus:outline-none"
                                        />
                                        <button onClick={() => commitVariant(pc.productId, idx)} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100">
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={cancelVariant} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 group/label">
                                        <span className="text-gray-800 font-medium">{label}</span>
                                        <button
                                          onClick={() => startEditVariant(pc.productId, idx)}
                                          title="Edit variant label"
                                          className="opacity-0 group-hover/label:opacity-100 p-0.5 rounded text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Expected */}
                                  <td className="px-4 py-3 text-center font-medium text-gray-700">{v.expectedStock}</td>

                                  {/* Counted input */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={v.countedStock}
                                      onChange={e => updateCount(pc.productId, idx, e.target.value)}
                                      placeholder="—"
                                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white"
                                    />
                                  </td>

                                  {/* Variance */}
                                  <td className="px-4 py-3 text-center">
                                    {v.variance !== null && (
                                      <span className={`text-sm font-semibold ${v.variance === 0 ? 'text-green-600' : v.variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {v.variance > 0 ? '+' : ''}{v.variance}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Notes */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Notes</label>
                        <input
                          type="text"
                          value={pc.notes}
                          onChange={e => updateNotes(pc.productId, e.target.value)}
                          placeholder="Count notes for this product…"
                          className="flex-1 max-w-sm px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Bottom batch nav ── */}
        {totalBatches > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-3 shadow-sm">
            <button
              onClick={() => setCurrentBatch(b => Math.max(0, b - 1))}
              disabled={safeBatch === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Previous batch
            </button>
            <span className="text-sm text-gray-500">
              Showing {safeBatch * batchSize + 1}–{Math.min((safeBatch + 1) * batchSize, filteredCounts.length)} of {filteredCounts.length}
            </span>
            <button
              onClick={() => { handleSaveBatch(); setCurrentBatch(b => Math.min(totalBatches - 1, b + 1)); }}
              disabled={safeBatch >= totalBatches - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#B8953F] disabled:opacity-30 transition-colors"
            >
              Save & Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
