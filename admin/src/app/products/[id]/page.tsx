'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Tag,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Layers,
  BarChart3,
  Copy,
  ExternalLink,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { api, Product, Variant } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    archived: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const icons: Record<string, React.ReactNode> = {
    published: <CheckCircle className="w-3 h-3" />,
    draft: <Clock className="w-3 h-3" />,
    archived: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] ?? styles.draft}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
      <XCircle className="w-3 h-3" /> Out of stock
    </span>
  );
  if (stock <= 5) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> Low ({stock})
    </span>
  );
  return <span className="text-sm font-semibold text-gray-800">{stock}</span>;
}

function calcMargin(cost: number, price: number): string {
  if (!price || !cost) return '—';
  return (((price - cost) / price) * 100).toFixed(1) + '%';
}

export default function ProductViewPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [salesStats, setSalesStats] = useState<{
    totalSold: number; totalReturned: number; netSold: number;
    totalRevenue: number; totalCost: number; grossProfit: number;
    byVariant: Record<number, { sold: number; returned: number; revenue: number }>;
  } | null>(null);

  useEffect(() => {
    api.products.getById(productId)
      .then(setProduct)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    api.products.getSalesStats(productId)
      .then(setSalesStats)
      .catch(() => {}); // non-critical
  }, [productId]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.products.delete(productId);
      router.push('/products');
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  function copySku(sku: string) {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </AdminLayout>
  );

  if (error || !product) return (
    <AdminLayout>
      <div className="p-6 text-center text-red-600">{error || 'Product not found'}</div>
    </AdminLayout>
  );

  const totalStock = product.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
  const totalValue = product.variants.reduce((s, v) => s + (v.stock ?? 0) * (v.costPrice ?? v.price), 0);
  const outOfStock = product.variants.filter(v => (v.stock ?? 0) <= 0).length;
  const priceMin = Math.min(...product.variants.map(v => v.price));
  const priceMax = Math.max(...product.variants.map(v => v.price));

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h1>
              <p className="text-sm text-gray-500">Product Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/products/${productId}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <Edit className="w-4 h-4" /> Edit Product
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        {/* Delete Confirm Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900">Delete Product</h3>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Images */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {product.images.length > 0 ? (
                <>
                  <div className="relative aspect-square bg-gray-50">
                    <img
                      src={product.images[activeImage]?.url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImage(i => Math.max(0, i - 1))}
                          disabled={activeImage === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActiveImage(i => Math.min(product.images.length - 1, i + 1))}
                          disabled={activeImage === product.images.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                          {activeImage + 1} / {product.images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {product.images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                      {product.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          className={`w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-blue-500' : 'border-transparent'}`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-50 text-gray-400 flex-col gap-2">
                  <Package className="w-12 h-12 opacity-30" />
                  <span className="text-sm">No images</span>
                </div>
              )}
            </div>

            {/* Stock Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Stock Summary
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <p className="text-lg font-bold text-blue-700">{totalStock}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Total Units</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <p className="text-lg font-bold text-green-700">{formatPrice(totalValue)}</p>
                  <p className="text-xs text-green-600 mt-0.5">Stock Value</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl">
                  <p className="text-lg font-bold text-red-700">{outOfStock}</p>
                  <p className="text-xs text-red-600 mt-0.5">Out of Stock</p>
                </div>
              </div>
              <div className="pt-1 border-t border-gray-100">
                <Link
                  href={`/inventory?productId=${productId}`}
                  className="flex items-center justify-between text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>View inventory history</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Sales Stats Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C9A84C]" /> POS Sales
              </h3>
              {salesStats === null ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-amber-50 rounded-xl">
                      <p className="text-lg font-bold text-amber-700">{salesStats.netSold}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Net Sold</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                      <p className="text-lg font-bold text-orange-700">{salesStats.totalReturned}</p>
                      <p className="text-xs text-orange-600 mt-0.5">Returned</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <p className="text-sm font-bold text-green-700">{formatPrice(salesStats.totalRevenue)}</p>
                      <p className="text-xs text-green-600 mt-0.5">Revenue</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                      <p className="text-sm font-bold text-purple-700">{formatPrice(salesStats.grossProfit)}</p>
                      <p className="text-xs text-purple-600 mt-0.5">Gross Profit</p>
                    </div>
                  </div>
                  {salesStats.totalSold > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                      {salesStats.totalSold} sold · {salesStats.totalReturned} returned · net {salesStats.netSold} units
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-4">

            {/* Product Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={product.status} />
                    {product.featured && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {priceMin === priceMax ? formatPrice(priceMin) : `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700">Category:</span>
                <span>{product.category}</span>
              </div>

              {product.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {product.tags && product.tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.ratings && product.ratings.count > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(product.ratings.avg) ? 'fill-current' : 'opacity-30'}`} />
                    ))}
                  </div>
                  <span className="font-semibold text-gray-800">{product.ratings.avg.toFixed(1)}</span>
                  <span className="text-gray-500">({product.ratings.count} review{product.ratings.count !== 1 ? 's' : ''})</span>
                </div>
              )}
            </div>

            {/* Variants Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" /> Variants
                  <span className="ml-auto text-xs text-gray-400 font-normal">{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</span>
                </h3>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Size</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Color</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost Price</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale Price</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sold</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {product.variants.map((v: Variant, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{v.size || <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {v.color && (
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                style={{ background: v.color.toLowerCase() }}
                              />
                            )}
                            <span className="text-gray-700">{v.color || <span className="text-gray-400">—</span>}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{v.costPrice ? formatPrice(v.costPrice) : <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(v.price)}</td>
                        <td className="px-4 py-3">
                          {v.costPrice && v.price ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              parseFloat(calcMargin(v.costPrice, v.price)) >= 30
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {calcMargin(v.costPrice, v.price)}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StockBadge stock={v.stock ?? 0} />
                        </td>
                        <td className="px-4 py-3">
                          {salesStats ? (
                            <div className="text-sm">
                              <span className="font-semibold text-gray-800">{salesStats.byVariant[i]?.sold ?? 0}</span>
                              {(salesStats.byVariant[i]?.returned ?? 0) > 0 && (
                                <span className="text-xs text-orange-500 ml-1">-{salesStats.byVariant[i].returned}</span>
                              )}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {v.sku ? (
                            <button
                              onClick={() => copySku(v.sku!)}
                              title="Copy SKU"
                              className="flex items-center gap-1.5 text-xs font-mono text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                            >
                              {copiedSku === v.sku ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                              {v.sku}
                            </button>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {product.variants.map((v: Variant, i: number) => (
                  <div key={i} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {v.color && (
                          <span className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" style={{ background: v.color.toLowerCase() }} />
                        )}
                        <span className="font-semibold text-gray-800">
                          {[v.size, v.color].filter(Boolean).join(' / ') || `Variant ${i + 1}`}
                        </span>
                      </div>
                      <StockBadge stock={v.stock ?? 0} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Cost</p>
                        <p className="text-sm font-medium text-gray-700">{v.costPrice ? formatPrice(v.costPrice) : '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(v.price)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Margin</p>
                        <p className={`text-sm font-semibold ${v.costPrice ? 'text-green-700' : 'text-gray-400'}`}>
                          {v.costPrice ? calcMargin(v.costPrice, v.price) : '—'}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2">
                        <p className="text-xs text-amber-600">Sold</p>
                        <p className="text-sm font-semibold text-amber-700">
                          {salesStats ? (salesStats.byVariant[i]?.sold ?? 0) : '—'}
                        </p>
                      </div>
                    </div>
                    {v.sku && (
                      <button
                        onClick={() => copySku(v.sku!)}
                        className="flex items-center gap-1.5 text-xs font-mono text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-md"
                      >
                        {copiedSku === v.sku ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        SKU: {v.sku}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom action bar (mobile) */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-40">
          <Link
            href={`/products/${productId}/edit`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            <Edit className="w-4 h-4" /> Edit Product
          </Link>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="md:hidden h-20" />

      </div>
    </AdminLayout>
  );
}
