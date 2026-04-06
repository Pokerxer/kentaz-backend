'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Save, Package, AlertTriangle, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

interface VariantStock {
  variantIndex: number;
  label: string;
  currentStock: number;
  newStock: number;
  adjustment: number;
}

interface ProductStock {
  productId: string;
  productName: string;
  category: string;
  image?: string;
  variants: VariantStock[];
  notes: string;
}

export default function QuantityAdjustmentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [stocks, setStocks] = useState<Record<string, ProductStock>>({});
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.products.getAll({ limit: 1000 });
      const productsWithVariants = data.products.filter(p => p.variants && p.variants.length > 0);
      setProducts(productsWithVariants);

      const initialStocks: Record<string, ProductStock> = {};
      productsWithVariants.forEach(p => {
        initialStocks[p._id] = {
          productId: p._id,
          productName: p.name,
          category: p.category,
          image: p.images?.[0]?.url,
          variants: p.variants.map((v, idx) => {
            const label = [v.size, v.color].filter(Boolean).join(' / ') || `Variant ${idx + 1}`;
            return {
              variantIndex: idx,
              label,
              currentStock: v.stock || 0,
              newStock: v.stock || 0,
              adjustment: 0,
            };
          }),
          notes: '',
        };
      });
      setStocks(initialStocks);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const updateAdjustment = (productId: string, variantIndex: number, adjustment: number) => {
    setStocks(prev => {
      const product = prev[productId];
      const variant = product.variants[variantIndex];
      const newStock = variant.currentStock + adjustment;
      if (newStock < 0) return prev;

      const updatedVariants = [...product.variants];
      updatedVariants[variantIndex] = { ...variant, adjustment, newStock };

      return { ...prev, [productId]: { ...product, variants: updatedVariants } };
    });
  };

  const setNewStock = (productId: string, variantIndex: number, newStock: number) => {
    if (newStock < 0) return;
    setStocks(prev => {
      const product = prev[productId];
      const variant = product.variants[variantIndex];
      const adjustment = newStock - variant.currentStock;

      const updatedVariants = [...product.variants];
      updatedVariants[variantIndex] = { ...variant, adjustment, newStock };

      return { ...prev, [productId]: { ...product, variants: updatedVariants } };
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setStocks(prev => ({ ...prev, [productId]: { ...prev[productId], notes } }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChangedItems = () => {
    const items: { productId: string; variantIndex: number; stock: number; notes: string }[] = [];
    Object.values(stocks).forEach(s => {
      s.variants.forEach(v => {
        if (v.adjustment !== 0) {
          items.push({
            productId: s.productId,
            variantIndex: v.variantIndex,
            stock: v.newStock,
            notes: s.notes || `Adjustment: ${v.adjustment > 0 ? '+' : ''}${v.adjustment}`,
          });
        }
      });
    });
    return items;
  };

  const changedItems = getChangedItems();
  const hasNegativeStock = changedItems.some((_, i) => {
    const item = changedItems[i];
    const product = stocks[item.productId];
    const variant = product?.variants[item.variantIndex];
    return variant ? variant.newStock < 0 : false;
  });
  const totalAdjustment = changedItems.reduce((sum, item) => {
    const product = stocks[item.productId];
    const variant = product?.variants[item.variantIndex];
    return sum + (variant?.adjustment || 0);
  }, 0);

  const handleSaveAll = async () => {
    if (changedItems.length === 0 || hasNegativeStock) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await api.inventory.bulkUpdate(changedItems);
      setSavedMsg(`${changedItems.length} variant${changedItems.length !== 1 ? 's' : ''} adjusted successfully`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save adjustments:', err);
      setSavedMsg('Failed to save adjustments');
    } finally {
      setSaving(false);
    }
  };

  const getProductStats = (product: ProductStock) => {
    const totalCurrent = product.variants.reduce((sum, v) => sum + v.currentStock, 0);
    const totalNew = product.variants.reduce((sum, v) => sum + v.newStock, 0);
    return { totalCurrent, totalNew, hasChanges: totalNew !== totalCurrent };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="w-2 h-8 bg-[#C9A84C] rounded-full"></span>
                Stock Adjustment
              </h1>
              <p className="text-gray-500 mt-1 ml-5">Adjust stock levels per variant</p>
            </div>
            {changedItems.length > 0 && (
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  hasNegativeStock ? 'bg-red-100 text-red-700' : totalAdjustment >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {hasNegativeStock ? 'Negative stock detected' : `Net: ${totalAdjustment >= 0 ? '+' : ''}${totalAdjustment}`}
                </div>
                <button
                  onClick={handleSaveAll}
                  disabled={saving || hasNegativeStock}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {savedMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${savedMsg.includes('Failed') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {savedMsg}
          </div>
        )}

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const stock = stocks[product._id];
            if (!stock) return null;
            const { totalCurrent, totalNew, hasChanges } = getProductStats(stock);
            const isExpanded = expandedProducts.has(product._id);

            return (
              <div key={product._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${hasChanges ? 'border-[#C9A84C]/50' : 'border-gray-100'}`}>
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(product._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {stock.image ? <img src={stock.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-400 m-2.5" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category} • {product.variants.length} variants</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Current / New</div>
                      <div className={`font-bold ${hasChanges ? 'text-[#C9A84C]' : 'text-gray-900'}`}>{totalCurrent} → {totalNew}</div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-gray-50/50 px-6 py-4">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Variant</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Current</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Adjustment</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">New Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stock.variants.map((variant, idx) => (
                          <tr key={idx}>
                            <td className="py-3 text-sm text-gray-900">{variant.label}</td>
                            <td className="py-3 font-medium text-gray-900">{variant.currentStock}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateAdjustment(product._id, idx, variant.adjustment - 1)}
                                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  type="number"
                                  value={variant.adjustment}
                                  onChange={(e) => updateAdjustment(product._id, idx, parseInt(e.target.value) || 0)}
                                  className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                                />
                                <button
                                  onClick={() => updateAdjustment(product._id, idx, variant.adjustment + 1)}
                                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                {variant.adjustment !== 0 && (
                                  <span className={`text-xs font-medium ${variant.adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({variant.adjustment > 0 ? '+' : ''}{variant.adjustment})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={variant.newStock}
                                onChange={(e) => setNewStock(product._id, idx, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center gap-4">
                      <label className="text-sm text-gray-500">Notes:</label>
                      <input
                        type="text"
                        value={stock.notes}
                        onChange={(e) => updateNotes(product._id, e.target.value)}
                        placeholder="Reason for adjustment..."
                        className="flex-1 max-w-xs px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}