'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Loader2, Plus, Trash2, Package, ArrowLeft, ShoppingBag,
  CheckCircle, Save, X, ChevronDown, ChevronUp, AlertCircle, Tag,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { api, purchaseApi, Product, Variant, PurchaseItemInput } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;          // unique key: productId_variantIndex
  product: Product;
  variantIndex: number;
  quantity: number;
  costPrice: number;
}

// Grouped by product for display
interface ProductGroup {
  product: Product;
  lines: LineItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function variantLabel(v: Variant | undefined) {
  if (!v) return 'Default';
  return [v.size, v.color].filter(Boolean).join(' / ') || 'Default';
}

function lineId(productId: string, variantIndex: number) {
  return `${productId}_${variantIndex}`;
}

// ── Variant Configurator ───────────────────────────────────────────────────
// Shown when you select a product from the search dropdown.
// Lets you set qty + cost for every variant in one step.

interface VariantRow {
  variantIndex: number;
  quantity: number;
  costPrice: number;
}

function VariantConfigurator({
  product,
  existingVariantIndexes,
  onAdd,
  onClose,
}: {
  product: Product;
  existingVariantIndexes: number[];
  onAdd: (rows: { variantIndex: number; quantity: number; costPrice: number }[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<VariantRow[]>(() =>
    product.variants.map((v, i) => ({
      variantIndex: i,
      quantity: existingVariantIndexes.includes(i) ? 0 : 1,
      costPrice: v.costPrice ?? 0,
    }))
  );

  const update = (idx: number, field: 'quantity' | 'costPrice', value: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleAdd = () => {
    const toAdd = rows.filter(r => r.quantity > 0);
    if (toAdd.length === 0) return;
    onAdd(toAdd);
    onClose();
  };

  const totalUnits  = rows.reduce((s, r) => s + (r.quantity > 0 ? r.quantity : 0), 0);
  const totalCost   = rows.reduce((s, r) => s + (r.quantity > 0 ? r.quantity * r.costPrice : 0), 0);
  const img         = product.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
            {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400 m-3" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 truncate">{product.name}</h2>
            <p className="text-xs text-gray-400">{product.category} · {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variant rows */}
        <div className="flex-1 overflow-y-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_90px_110px_90px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Variant</span>
            <span className="text-center">In Stock</span>
            <span className="text-center">Cost / Unit (₦)</span>
            <span className="text-center">Qty to Order</span>
          </div>

          <div className="divide-y divide-gray-50">
            {rows.map((row, i) => {
              const v       = product.variants[row.variantIndex];
              const label   = variantLabel(v);
              const already = existingVariantIndexes.includes(row.variantIndex);
              return (
                <div key={i} className={`grid grid-cols-[1fr_90px_110px_90px] gap-3 items-center px-6 py-3.5 transition-colors ${row.quantity > 0 ? 'bg-amber-50/40' : ''}`}>
                  {/* Variant label */}
                  <div>
                    <div className="flex items-center gap-2">
                      {v?.color && (
                        <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: v.color.toLowerCase() }} />
                      )}
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      {v?.sku && <span className="text-xs text-gray-400 font-mono">{v.sku}</span>}
                    </div>
                    {already && (
                      <p className="text-xs text-amber-600 mt-0.5">Already in order — qty will be added</p>
                    )}
                  </div>

                  {/* Current stock */}
                  <div className="text-center">
                    <span className={`text-sm font-semibold ${(v?.stock ?? 0) === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                      {v?.stock ?? 0}
                    </span>
                  </div>

                  {/* Cost price */}
                  <div className="relative">
                    <input
                      type="number" min="0" step="0.01"
                      value={row.costPrice || ''}
                      placeholder="0"
                      onChange={e => update(i, 'costPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-colors"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => update(i, 'quantity', Math.max(0, row.quantity - 1))}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold flex-shrink-0"
                    >−</button>
                    <input
                      type="number" min="0"
                      value={row.quantity}
                      onChange={e => update(i, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-12 text-center py-1.5 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => update(i, 'quantity', row.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold flex-shrink-0"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer summary + action */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50 rounded-b-2xl">
          <div className="text-sm text-gray-600">
            {totalUnits > 0 ? (
              <>
                <span className="font-bold text-gray-900">{totalUnits} unit{totalUnits !== 1 ? 's' : ''}</span>
                {' · '}
                <span className="font-bold text-gray-900">{formatPrice(totalCost)}</span>
                {' total cost'}
              </>
            ) : (
              <span className="text-gray-400">Set quantities above to add to order</span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={totalUnits === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add {totalUnits > 0 ? `${totalUnits} unit${totalUnits !== 1 ? 's' : ''}` : 'to Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function NewPurchasePage() {
  const router = useRouter();

  // Order header
  const [supplier,     setSupplier]     = useState('');
  const [reference,    setReference]    = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes,        setNotes]        = useState('');

  // Product search
  const [allProducts,     setAllProducts]     = useState<Product[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  // Variant configurator
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);

  // Line items (flat list keyed by productId_variantIndex)
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Collapsed product groups
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Submission
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    api.products.getAll({ limit: 1000 }).then(d => setAllProducts(d.products)).finally(() => setLoadingProducts(false));
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredProducts = searchQuery.length > 0
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allProducts.slice(0, 30);

  // When a product is selected from the dropdown
  const handleSelectProduct = (product: Product) => {
    setSearchOpen(false);
    setSearchQuery('');
    setConfiguringProduct(product);
  };

  // When the variant configurator submits
  const handleAddVariants = (rows: { variantIndex: number; quantity: number; costPrice: number }[]) => {
    if (!configuringProduct) return;
    setLineItems(prev => {
      const next = [...prev];
      for (const row of rows) {
        const id  = lineId(configuringProduct._id, row.variantIndex);
        const idx = next.findIndex(l => l.id === id);
        if (idx >= 0) {
          // Already exists — add quantity
          next[idx] = { ...next[idx], quantity: next[idx].quantity + row.quantity, costPrice: row.costPrice };
        } else {
          next.push({ id, product: configuringProduct, variantIndex: row.variantIndex, quantity: row.quantity, costPrice: row.costPrice });
        }
      }
      return next;
    });
  };

  // Edit a line item field
  const updateLine = (id: string, field: 'quantity' | 'costPrice', value: number) => {
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => setLineItems(prev => prev.filter(l => l.id !== id));

  const removeProduct = (productId: string) => setLineItems(prev => prev.filter(l => l.product._id !== productId));

  // Group line items by product
  const groups: ProductGroup[] = [];
  for (const line of lineItems) {
    const existing = groups.find(g => g.product._id === line.product._id);
    if (existing) existing.lines.push(line);
    else groups.push({ product: line.product, lines: [line] });
  }

  const totalCost   = lineItems.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const totalUnits  = lineItems.reduce((s, l) => s + l.quantity, 0);

  const handleSubmit = async (receiveNow: boolean) => {
    setError('');
    if (!supplier.trim())         { setError('Supplier name is required');       return; }
    if (lineItems.length === 0)   { setError('Add at least one product');         return; }
    for (const l of lineItems) {
      if (l.quantity <= 0) { setError(`Quantity for "${l.product.name} (${variantLabel(l.product.variants[l.variantIndex])})" must be at least 1`); return; }
      if (l.costPrice < 0) { setError(`Cost price for "${l.product.name}" cannot be negative`); return; }
    }

    setSaving(true);
    try {
      const items: PurchaseItemInput[] = lineItems.map(l => ({
        productId:    l.product._id,
        variantIndex: l.variantIndex,
        quantity:     l.quantity,
        costPrice:    l.costPrice,
      }));
      await purchaseApi.create({
        supplier: supplier.trim(),
        reference: reference.trim() || undefined,
        purchaseDate,
        items,
        notes: notes.trim() || undefined,
        receiveNow,
      });
      router.push('/purchases');
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase order');
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      {/* Variant configurator modal */}
      {configuringProduct && (
        <VariantConfigurator
          product={configuringProduct}
          existingVariantIndexes={
            lineItems.filter(l => l.product._id === configuringProduct._id).map(l => l.variantIndex)
          }
          onAdd={handleAddVariants}
          onClose={() => setConfiguringProduct(null)}
        />
      )}

      <div className="max-w-5xl mx-auto pb-16">

        {/* ── Page header ── */}
        <div className="mb-8">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Purchases
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="w-1.5 h-7 bg-[#C9A84C] rounded-full" />
                New Purchase Order
              </h1>
              <p className="text-gray-500 text-sm mt-1 ml-5">Record incoming stock from a supplier</p>
            </div>
            {lineItems.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-medium">
                  {groups.length} product{groups.length !== 1 ? 's' : ''}
                </span>
                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
                  {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
                </span>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold">
                  {formatPrice(totalCost)}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-6">

          {/* ── Purchase Details ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Purchase Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Supplier <span className="text-red-400">*</span>
                </label>
                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. ABC Distributors Ltd"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  PO / Reference Number
                </label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="e.g. PO-2024-001"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Purchase Date
                </label>
                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Notes
                </label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes or delivery instructions"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
            </div>
          </div>

          {/* ── Items ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Order Items</h2>
                <p className="text-xs text-gray-400 mt-0.5">Search for a product to configure quantities per variant</p>
              </div>

              {/* Search */}
              <div ref={searchRef} className="relative">
                <button
                  onClick={() => setSearchOpen(v => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] transition-colors shadow-sm shadow-[#C9A84C]/20"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>

                {searchOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl z-30 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search by name or category…"
                          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                        />
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {loadingProducts ? (
                        <div className="py-8 flex justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-[#C9A84C]" />
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">No products found</p>
                      ) : filteredProducts.map(p => {
                        const inOrder    = lineItems.some(l => l.product._id === p._id);
                        const variantsCt = p.variants.length;
                        return (
                          <button key={p._id} onClick={() => handleSelectProduct(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                              {p.images?.[0]?.url
                                ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                                : <Package className="w-5 h-5 text-gray-400 m-2.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.category} · {variantsCt} variant{variantsCt !== 1 ? 's' : ''}</p>
                            </div>
                            {inOrder && (
                              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                In order
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line items grouped by product */}
            {groups.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No items yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Product" to search and configure variants</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {groups.map(({ product, lines }) => {
                  const isCollapsed   = collapsed[product._id];
                  const groupTotal    = lines.reduce((s, l) => s + l.quantity * l.costPrice, 0);
                  const groupUnits    = lines.reduce((s, l) => s + l.quantity, 0);
                  const img           = product.images?.[0]?.url;

                  return (
                    <div key={product._id}>
                      {/* Product header row */}
                      <div className="flex items-center gap-4 px-6 py-4 bg-gray-50/60">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400 m-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.category}</p>
                        </div>

                        {/* Quick stats */}
                        <div className="hidden sm:flex items-center gap-3 text-xs flex-shrink-0">
                          <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-600">
                            {lines.length} variant{lines.length !== 1 ? 's' : ''}
                          </span>
                          <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-600">
                            {groupUnits} unit{groupUnits !== 1 ? 's' : ''}
                          </span>
                          <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg font-semibold text-gray-800">
                            {formatPrice(groupTotal)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Add another variant */}
                          <button
                            onClick={() => setConfiguringProduct(product)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#C9A84C] border border-[#C9A84C]/30 rounded-lg hover:bg-[#C9A84C]/5 transition-colors font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" /> Variant
                          </button>
                          {/* Remove whole product */}
                          <button onClick={() => removeProduct(product._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {/* Collapse/expand */}
                          <button onClick={() => setCollapsed(prev => ({ ...prev, [product._id]: !prev[product._id] }))}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Variant rows */}
                      {!isCollapsed && (
                        <>
                          {/* Column headers (only shown on first product or always) */}
                          <div className="grid grid-cols-[2fr_1fr_120px_120px_120px_120px_44px] gap-3 px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-white">
                            <span>Variant</span>
                            <span className="text-center">In Stock</span>
                            <span className="text-center">Selling Price</span>
                            <span className="text-center">Cost / Unit</span>
                            <span className="text-center">Qty to Order</span>
                            <span className="text-right">Subtotal</span>
                            <span />
                          </div>
                          {lines.map(line => {
                            const v           = product.variants[line.variantIndex];
                            const label       = variantLabel(v);
                            const sellingPrice = v?.price || 0;
                            const subtotal    = line.quantity * line.costPrice;
                            const margin      = sellingPrice > 0 && line.costPrice > 0
                              ? Math.round(((sellingPrice - line.costPrice) / sellingPrice) * 100) : null;

                            return (
                              <div key={line.id}
                                className="grid grid-cols-[2fr_1fr_120px_120px_120px_120px_44px] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0"
                              >
                                {/* Variant label */}
                                <div className="flex items-center gap-2">
                                  {v?.color && (
                                    <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: v.color.toLowerCase() }} />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{label}</p>
                                    {v?.sku && <p className="text-xs text-gray-400 font-mono">{v.sku}</p>}
                                  </div>
                                </div>

                                {/* Current stock */}
                                <div className="text-center">
                                  <span className={`text-sm font-semibold ${(v?.stock ?? 0) === 0 ? 'text-red-500' : (v?.stock ?? 0) <= 5 ? 'text-amber-500' : 'text-gray-600'}`}>
                                    {v?.stock ?? 0}
                                  </span>
                                </div>

                                {/* Selling price + margin */}
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">{formatPrice(sellingPrice)}</p>
                                  {margin !== null && (
                                    <p className={`text-xs font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {margin}% margin
                                    </p>
                                  )}
                                </div>

                                {/* Cost price input */}
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">₦</span>
                                  <input type="number" min="0" step="0.01"
                                    value={line.costPrice || ''}
                                    placeholder="0"
                                    onChange={e => updateLine(line.id, 'costPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-colors"
                                  />
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center gap-1 justify-center">
                                  <button
                                    onClick={() => updateLine(line.id, 'quantity', Math.max(1, line.quantity - 1))}
                                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold flex-shrink-0"
                                  >−</button>
                                  <input type="number" min="1"
                                    value={line.quantity}
                                    onChange={e => updateLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                                    className="w-14 text-center py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-colors"
                                  />
                                  <button
                                    onClick={() => updateLine(line.id, 'quantity', line.quantity + 1)}
                                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold flex-shrink-0"
                                  >+</button>
                                </div>

                                {/* Subtotal */}
                                <div className="text-right">
                                  <p className="text-sm font-bold text-gray-900">{formatPrice(subtotal)}</p>
                                </div>

                                {/* Remove line */}
                                <div className="flex justify-center">
                                  <button onClick={() => removeLine(line.id)}
                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Order total */}
            {groups.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span><b className="text-gray-900">{groups.length}</b> product{groups.length !== 1 ? 's' : ''}</span>
                    <span><b className="text-gray-900">{totalUnits}</b> total units</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Purchase Cost</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalCost)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Receive toggle ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Stock Update</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex gap-3 p-4 border border-[#C9A84C] bg-[#C9A84C]/5 rounded-xl">
                <CheckCircle className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Save &amp; Receive Stock Now</p>
                  <p className="text-xs text-gray-500 mt-0.5">Updates inventory levels and cost prices immediately. Use when goods have already arrived.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 border border-gray-200 bg-white rounded-xl">
                <Save className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Save as Pending</p>
                  <p className="text-xs text-gray-500 mt-0.5">Records the purchase order only. Receive stock later when goods arrive.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button onClick={() => router.back()}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => handleSubmit(false)} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save as Pending
              </button>
              <button onClick={() => handleSubmit(true)} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] disabled:opacity-50 transition-colors shadow-lg shadow-[#C9A84C]/20"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save & Receive Stock
              </button>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
