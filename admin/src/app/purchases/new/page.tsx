'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  Package,
  ChevronDown,
  ArrowLeft,
  ShoppingBag,
  CheckCircle,
  Save,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { api, purchaseApi, Product, Variant, PurchaseItemInput } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

interface LineItem {
  id: string;
  product: Product;
  variantIndex: number;
  quantity: number;
  costPrice: number;
}

function variantLabel(v: Variant) {
  return [v.size, v.color].filter(Boolean).join(' / ') || 'Default';
}

export default function NewPurchasePage() {
  const router = useRouter();

  // Form state
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiveNow, setReceiveNow] = useState(true);

  // Product search
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Submission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.products.getAll({ limit: 1000 }).then(data => {
      setAllProducts(data.products);
    }).catch(() => {}).finally(() => setLoadingProducts(false));
  }, []);

  const filteredProducts = searchQuery.length > 0
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allProducts.slice(0, 20);

  const addProduct = (product: Product) => {
    // If product is already in list, don't add duplicate
    if (lineItems.some(l => l.product._id === product._id && l.variantIndex === 0)) {
      setSearchOpen(false);
      setSearchQuery('');
      return;
    }
    const defaultCost = product.variants[0]?.costPrice || 0;
    setLineItems(prev => [
      ...prev,
      {
        id: `${product._id}-${Date.now()}`,
        product,
        variantIndex: 0,
        quantity: 1,
        costPrice: defaultCost,
      },
    ]);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const updateLine = (id: string, field: Partial<LineItem>) => {
    setLineItems(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, ...field };
      // When variant changes, pre-fill the costPrice from the product's saved costPrice
      if ('variantIndex' in field) {
        const v = updated.product.variants[updated.variantIndex];
        updated.costPrice = v?.costPrice || 0;
      }
      return updated;
    }));
  };

  const removeLine = (id: string) => {
    setLineItems(prev => prev.filter(l => l.id !== id));
  };

  const totalCost = lineItems.reduce((sum, l) => sum + l.quantity * l.costPrice, 0);

  const handleSubmit = async (receive: boolean) => {
    setError('');
    if (!supplier.trim()) { setError('Supplier name is required'); return; }
    if (lineItems.length === 0) { setError('Add at least one product'); return; }
    for (const l of lineItems) {
      if (l.quantity <= 0) { setError(`Quantity for "${l.product.name}" must be at least 1`); return; }
      if (l.costPrice < 0) { setError(`Cost price for "${l.product.name}" cannot be negative`); return; }
    }

    setSaving(true);
    try {
      const items: PurchaseItemInput[] = lineItems.map(l => ({
        productId: l.product._id,
        variantIndex: l.variantIndex,
        quantity: l.quantity,
        costPrice: l.costPrice,
      }));

      await purchaseApi.create({
        supplier: supplier.trim(),
        reference: reference.trim() || undefined,
        purchaseDate,
        items,
        notes: notes.trim() || undefined,
        receiveNow: receive,
      });

      router.push('/purchases');
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase');
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchases
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-2 h-8 bg-[#C9A84C] rounded-full" />
            New Purchase
          </h1>
          <p className="text-gray-500 mt-1 ml-5">Record goods received from a supplier</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Purchase details card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Purchase Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. ABC Distributors"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reference / PO Number
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. PO-2024-001"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Items</h2>
              <div className="relative">
                <button
                  onClick={() => setSearchOpen(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-[#C9A84C] text-[#C9A84C] rounded-xl text-sm font-medium hover:bg-[#C9A84C]/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>

                {searchOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          autoFocus
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search products..."
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 text-sm"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loadingProducts ? (
                        <div className="py-6 text-center">
                          <Loader2 className="h-5 w-5 animate-spin text-[#C9A84C] mx-auto" />
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">No products found</p>
                      ) : (
                        filteredProducts.map(p => (
                          <button
                            key={p._id}
                            onClick={() => addProduct(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="h-9 w-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {p.images?.[0] ? (
                                <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-gray-400 m-2.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.category}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Click outside to close search */}
            {searchOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            )}

            {lineItems.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No items added yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Product" to search and add products</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost / Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lineItems.map(line => {
                        const variant = line.product.variants[line.variantIndex];
                        const subtotal = line.quantity * line.costPrice;
                        const sellingPrice = variant?.price || 0;
                        const margin = sellingPrice > 0 && line.costPrice > 0
                          ? Math.round(((sellingPrice - line.costPrice) / sellingPrice) * 100)
                          : null;

                        return (
                          <tr key={line.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                  {line.product.images?.[0] ? (
                                    <img src={line.product.images[0].url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-5 w-5 text-gray-400 m-2.5" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{line.product.name}</p>
                                  <p className="text-xs text-gray-400">{line.product.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {line.product.variants.length > 1 ? (
                                <div className="relative">
                                  <select
                                    value={line.variantIndex}
                                    onChange={e => updateLine(line.id, { variantIndex: parseInt(e.target.value) })}
                                    className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 appearance-none bg-white"
                                  >
                                    {line.product.variants.map((v, idx) => (
                                      <option key={idx} value={idx}>{variantLabel(v)}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                </div>
                              ) : (
                                <span className="text-sm text-gray-600">{variantLabel(line.product.variants[0])}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={e => updateLine(line.id, { quantity: parseInt(e.target.value) || 1 })}
                                className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.costPrice}
                                  onChange={e => updateLine(line.id, { costPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-28 pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <span>{formatPrice(sellingPrice)}</span>
                              {margin !== null && (
                                <span className={`ml-2 text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ({margin}% margin)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-900 text-sm">
                              {formatPrice(subtotal)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => removeLine(line.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Purchase Cost</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalCost)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Receive now toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={receiveNow}
                  onChange={e => setReceiveNow(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full transition-colors bg-gray-200 peer-checked:bg-[#C9A84C]" />
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Mark as Received immediately</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Updates stock levels and cost prices for all items right away.
                  Turn off to save as a <span className="font-medium">Pending</span> order and receive later.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Pending
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all shadow-lg shadow-[#C9A84C]/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Save & Receive Stock
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
