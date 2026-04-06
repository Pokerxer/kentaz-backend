'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, CheckCircle, Package, AlertTriangle, Clock, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

interface VariantCount {
  variantIndex: number;
  label: string;
  expectedStock: number;
  countedStock: number | null;
  variance: number | null;
}

interface StockCount {
  productId: string;
  productName: string;
  category: string;
  image?: string;
  variants: VariantCount[];
  notes: string;
  status: 'pending' | 'completed' | 'discrepancy';
}

export default function StockCountPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockCounts, setStockCounts] = useState<Record<string, StockCount>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'discrepancy'>('all');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.products.getAll({ limit: 1000 });
      const productsData = data.products;
      setProducts(productsData);

      const initialCounts: Record<string, StockCount> = {};
      productsData.forEach(p => {
        const variants: VariantCount[] = (p.variants || []).map((v, idx) => {
          const label = [v.size, v.color].filter(Boolean).join(' / ') || `Variant ${idx + 1}`;
          const stock = v.stock || 0;
          return {
            variantIndex: idx,
            label,
            expectedStock: stock,
            countedStock: null,
            variance: null,
          };
        });

        const hasDiscrepancy = variants.some(v => v.countedStock !== null && v.variance !== 0);
        const allCounted = variants.every(v => v.countedStock !== null);
        const status: StockCount['status'] = !allCounted ? 'pending' : hasDiscrepancy ? 'discrepancy' : 'completed';

        initialCounts[p._id] = {
          productId: p._id,
          productName: p.name,
          category: p.category,
          image: p.images?.[0]?.url,
          variants,
          notes: '',
          status,
        };
      });
      setStockCounts(initialCounts);
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

  const updateCount = (productId: string, variantIndex: number, countedStock: number | null) => {
    setStockCounts(prev => {
      const product = prev[productId];
      const variant = product.variants[variantIndex];
      const variance = countedStock !== null ? countedStock - variant.expectedStock : null;

      const updatedVariants = [...product.variants];
      updatedVariants[variantIndex] = { ...variant, countedStock, variance };

      const hasDiscrepancy = updatedVariants.some(v => v.countedStock !== null && v.variance !== 0);
      const allCounted = updatedVariants.every(v => v.countedStock !== null);
      const status: StockCount['status'] = !allCounted ? 'pending' : hasDiscrepancy ? 'discrepancy' : 'completed';

      return { ...prev, [productId]: { ...product, variants: updatedVariants, status } };
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setStockCounts(prev => ({ ...prev, [productId]: { ...prev[productId], notes } }));
  };

  const filteredStockCounts = Object.values(stockCounts).filter(sc => {
    const matchesSearch = !searchQuery || sc.productName.toLowerCase().includes(searchQuery.toLowerCase()) || sc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || sc.status === filter;
    return matchesSearch && matchesFilter;
  });

  const countedItems = Object.values(stockCounts).flatMap(s => s.variants.filter(v => v.countedStock !== null));

  const handleSaveAll = async () => {
    if (countedItems.length === 0) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const items: { productId: string; variantIndex: number; stock: number; notes: string }[] = [];
      Object.values(stockCounts).forEach(s => {
        s.variants.forEach(v => {
          if (v.countedStock !== null) {
            items.push({
              productId: s.productId,
              variantIndex: v.variantIndex,
              stock: v.countedStock!,
              notes: s.notes || (v.variance !== 0 ? `Count variance: ${v.variance! > 0 ? '+' : ''}${v.variance}` : 'Stock count - ok'),
            });
          }
        });
      });

      await api.inventory.bulkUpdate(items);
      setSavedMsg(`${items.length} variant${items.length !== 1 ? 's' : ''} saved successfully`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save stock count:', err);
      setSavedMsg('Failed to save stock count');
    } finally {
      setSaving(false);
    }
  };

  const getProductStats = (stock: StockCount) => {
    const totalExpected = stock.variants.reduce((sum, v) => sum + v.expectedStock, 0);
    const totalCounted = stock.variants.reduce((sum, v) => sum + (v.countedStock || 0), 0);
    const totalVariance = stock.variants.reduce((sum, v) => sum + (v.variance || 0), 0);
    const hasChanges = stock.variants.some(v => v.countedStock !== null);
    return { totalExpected, totalCounted, totalVariance, hasChanges };
  };

  const stats = {
    total: Object.keys(stockCounts).length,
    pending: Object.values(stockCounts).filter(s => s.status === 'pending').length,
    completed: Object.values(stockCounts).filter(s => s.status === 'completed').length,
    discrepancy: Object.values(stockCounts).filter(s => s.status === 'discrepancy').length,
  };

  const progress = stats.total > 0 ? Math.round(((stats.completed + stats.discrepancy) / stats.total) * 100) : 0;

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
                Stock Count
              </h1>
              <p className="text-gray-500 mt-1 ml-5">Physical inventory count — count each variant</p>
            </div>
            <div className="flex items-center gap-3">
              {countedItems.length > 0 && (
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all disabled:opacity-50"
                >
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><CheckCircle className="h-4 w-4" /> Save Counted ({countedItems.length})</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Count Progress</span>
            <span className="text-sm text-gray-500">{progress}% complete</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="text-gray-500">{stats.pending} pending</span>
            <span className="text-green-600">{stats.completed} counted</span>
            <span className="text-red-600">{stats.discrepancy} discrepancies</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50"
            />
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(['all', 'pending', 'completed', 'discrepancy'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {savedMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${savedMsg.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {savedMsg}
          </div>
        )}

        <div className="space-y-3">
          {filteredStockCounts.map(stock => {
            const { totalExpected, totalCounted, totalVariance, hasChanges } = getProductStats(stock);
            const isExpanded = expandedProducts.has(stock.productId);
            const statusColor = { pending: 'border-gray-100', completed: 'border-green-200 bg-green-50/30', discrepancy: 'border-red-200 bg-red-50/30' }[stock.status];

            return (
              <div key={stock.productId} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${statusColor}`}>
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(stock.productId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {stock.image ? <img src={stock.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-400 m-2.5" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{stock.productName}</div>
                      <div className="text-sm text-gray-500">{stock.category} • {stock.variants.length} variants</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Expected / Counted</div>
                      <div className={`font-bold ${hasChanges ? (totalVariance === 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-900'}`}>
                        {totalExpected} / {totalCounted || '-'}
                      </div>
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
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Expected</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Counted</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stock.variants.map((variant, idx) => (
                          <tr key={idx}>
                            <td className="py-3 text-sm text-gray-900">{variant.label}</td>
                            <td className="py-3 font-medium text-gray-900">{variant.expectedStock}</td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={variant.countedStock ?? ''}
                                onChange={(e) => updateCount(stock.productId, idx, e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Enter count"
                                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                              />
                            </td>
                            <td className="py-3">
                              {variant.variance !== null && (
                                <span className={`text-sm font-medium ${variant.variance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {variant.variance > 0 ? '+' : ''}{variant.variance}
                                </span>
                              )}
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
                        onChange={(e) => updateNotes(stock.productId, e.target.value)}
                        placeholder="Count notes..."
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