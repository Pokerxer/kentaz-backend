'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Save, Package, AlertTriangle } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

interface ProductStock {
  productId: string;
  productName: string;
  category: string;
  image?: string;
  currentStock: number;
  newStock: number;
  adjustment: number;
  notes: string;
}

export default function QuantityAdjustmentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [stocks, setStocks] = useState<Record<string, ProductStock>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.products.getAll({ limit: 1000 });
      const productsWithVariants = data.products.filter(p => p.variants && p.variants.length > 0);
      setProducts(productsWithVariants);

      const initialStocks: Record<string, ProductStock> = {};
      productsWithVariants.forEach(p => {
        const totalStock = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        initialStocks[p._id] = {
          productId: p._id,
          productName: p.name,
          category: p.category,
          image: p.images?.[0]?.url,
          currentStock: totalStock,
          newStock: totalStock,
          adjustment: 0,
          notes: '',
        };
      });
      setStocks(initialStocks);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAdjustment = (productId: string, adjustment: number) => {
    setStocks(prev => {
      const current = prev[productId];
      return {
        ...prev,
        [productId]: {
          ...current,
          adjustment,
          newStock: current.currentStock + adjustment,
        },
      };
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setStocks(prev => ({
      ...prev,
      [productId]: { ...prev[productId], notes },
    }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const changedItems = Object.values(stocks).filter(s => s.adjustment !== 0);
  const hasNegativeStock = changedItems.some(s => s.newStock < 0);
  const totalAdjustment = changedItems.reduce((sum, s) => sum + s.adjustment, 0);

  const handleSaveAll = async () => {
    if (changedItems.length === 0 || hasNegativeStock) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const items = changedItems.map(s => ({
        productId: s.productId,
        variantIndex: -1,
        stock: s.newStock,
        notes: s.notes || `Manual adjustment: ${s.adjustment > 0 ? '+' : ''}${s.adjustment}`,
      }));

      await api.inventory.bulkUpdate(items);
      setSavedMsg(`${items.length} item${items.length !== 1 ? 's' : ''} adjusted successfully`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save adjustments:', err);
      setSavedMsg('Failed to save adjustments');
    } finally {
      setSaving(false);
    }
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
                Quantity Adjustment
              </h1>
              <p className="text-gray-500 mt-1 ml-5">Adjust product stock levels in bulk</p>
            </div>
            {changedItems.length > 0 && (
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  hasNegativeStock
                    ? 'bg-red-100 text-red-700'
                    : totalAdjustment >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {hasNegativeStock
                    ? 'Negative stock detected'
                    : `Net: ${totalAdjustment >= 0 ? '+' : ''}${totalAdjustment} across ${changedItems.length} item${changedItems.length !== 1 ? 's' : ''}`}
                </div>
                <button
                  onClick={handleSaveAll}
                  disabled={saving || hasNegativeStock}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {savedMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            savedMsg.includes('Failed') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
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
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Adjustment</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">New Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const stock = stocks[product._id];
                  if (!stock) return null;

                  return (
                    <tr key={product._id} className={`transition-colors ${stock.newStock < 0 ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {stock.image ? (
                              <img src={stock.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400 m-2.5" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{product.category}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{stock.currentStock}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateAdjustment(product._id, stock.adjustment - 1)}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 font-medium text-gray-600 transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={stock.adjustment}
                            onChange={(e) => updateAdjustment(product._id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                          />
                          <button
                            onClick={() => updateAdjustment(product._id, stock.adjustment + 1)}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 font-medium text-gray-600 transition-colors"
                          >
                            +
                          </button>
                          {stock.adjustment !== 0 && (
                            <span className={`text-sm font-medium ${stock.adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({stock.adjustment > 0 ? '+' : ''}{stock.adjustment})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            stock.newStock < 0
                              ? 'text-red-600'
                              : stock.adjustment !== 0
                              ? 'text-[#C9A84C]'
                              : 'text-gray-900'
                          }`}>
                            {stock.newStock}
                          </span>
                          {stock.newStock < 0 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" title="Cannot set stock below 0" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {stock.adjustment !== 0 && (
                          <input
                            type="text"
                            value={stock.notes}
                            onChange={(e) => updateNotes(product._id, e.target.value)}
                            placeholder="Reason for adjustment..."
                            className="w-44 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
