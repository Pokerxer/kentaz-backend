'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, Package, AlertTriangle, Clock, Download } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

interface StockCount {
  productId: string;
  productName: string;
  category: string;
  image?: string;
  expectedStock: number;
  countedStock: number | null;
  variance: number | null;
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.products.getAll({ limit: 1000 });
      const productsData = data.products;
      setProducts(productsData);

      const initialCounts: Record<string, StockCount> = {};
      productsData.forEach(p => {
        const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
        initialCounts[p._id] = {
          productId: p._id,
          productName: p.name,
          category: p.category,
          image: p.images?.[0]?.url,
          expectedStock: totalStock,
          countedStock: null,
          variance: null,
          notes: '',
          status: 'pending',
        };
      });
      setStockCounts(initialCounts);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCount = (productId: string, countedStock: number | null) => {
    setStockCounts(prev => {
      const current = prev[productId];
      const variance = countedStock !== null ? countedStock - current.expectedStock : null;
      const status: StockCount['status'] =
        countedStock === null
          ? 'pending'
          : variance === 0
          ? 'completed'
          : 'discrepancy';

      return {
        ...prev,
        [productId]: { ...current, countedStock, variance, status },
      };
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setStockCounts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], notes },
    }));
  };

  const filteredStockCounts = Object.values(stockCounts).filter(sc => {
    const matchesSearch =
      !searchQuery ||
      sc.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || sc.status === filter;
    return matchesSearch && matchesFilter;
  });

  const countedItems = Object.values(stockCounts).filter(s => s.countedStock !== null);

  const handleSaveAll = async () => {
    if (countedItems.length === 0) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const items = countedItems.map(s => ({
        productId: s.productId,
        variantIndex: -1,
        stock: s.countedStock!,
        notes: s.notes
          ? `Stock count: ${s.notes}`
          : s.variance !== 0
          ? `Stock count — variance: ${s.variance! > 0 ? '+' : ''}${s.variance}`
          : 'Stock count — no variance',
      }));

      await api.inventory.bulkUpdate(items);
      setSavedMsg(`${items.length} item${items.length !== 1 ? 's' : ''} saved successfully`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save stock count:', err);
      setSavedMsg('Failed to save stock count');
    } finally {
      setSaving(false);
    }
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
              <p className="text-gray-500 mt-1 ml-5">Physical inventory count — identify discrepancies</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4" />
                Export
              </button>
              {countedItems.length > 0 && (
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl font-medium hover:bg-[#B8953F] transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Save Counted ({countedItems.length})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 ml-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A84C] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {savedMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            savedMsg.includes('Failed') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            {savedMsg}
          </div>
        )}

        {/* Status filter cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { key: 'all', label: 'Total', value: stats.total, icon: Package, color: '' },
            { key: 'pending', label: 'Pending', value: stats.pending, icon: Clock, color: 'text-gray-500' },
            { key: 'completed', label: 'Counted', value: stats.completed, icon: CheckCircle, color: 'text-green-500' },
            { key: 'discrepancy', label: 'Discrepancy', value: stats.discrepancy, icon: AlertTriangle, color: 'text-red-500' },
          ].map(({ key, label, value, icon: Icon, color }) => (
            <div
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                filter === key
                  ? key === 'completed'
                    ? 'border-green-500 ring-2 ring-green-500/20'
                    : key === 'discrepancy'
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : 'border-[#C9A84C] ring-2 ring-[#C9A84C]/20'
                  : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-sm text-gray-500">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${
                key === 'completed' ? 'text-green-600' : key === 'discrepancy' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {value}
              </p>
            </div>
          ))}
        </div>

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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">System Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Counted</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStockCounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No products match your search
                    </td>
                  </tr>
                ) : (
                  filteredStockCounts.map((sc) => (
                    <tr key={sc.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {sc.image ? (
                              <img src={sc.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400 m-2.5" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{sc.productName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{sc.category}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{sc.expectedStock}</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          value={sc.countedStock ?? ''}
                          onChange={(e) => updateCount(sc.productId, e.target.value !== '' ? parseInt(e.target.value) : null)}
                          placeholder="Enter count"
                          className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] text-center"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {sc.variance !== null && (
                          <span className={`font-bold text-sm ${
                            sc.variance === 0 ? 'text-green-600' : sc.variance > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {sc.variance > 0 ? '+' : ''}{sc.variance}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sc.status !== 'pending' && (
                          <input
                            type="text"
                            value={sc.notes}
                            onChange={(e) => updateNotes(sc.productId, e.target.value)}
                            placeholder={sc.status === 'discrepancy' ? 'Reason for discrepancy...' : 'Optional note...'}
                            className="w-44 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          sc.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : sc.status === 'discrepancy'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {sc.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                          {sc.status === 'discrepancy' && <AlertTriangle className="h-3 w-3" />}
                          {sc.status === 'pending' && <Clock className="h-3 w-3" />}
                          {sc.status.charAt(0).toUpperCase() + sc.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
