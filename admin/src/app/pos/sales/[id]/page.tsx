'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Printer, XCircle, CheckCircle, AlertCircle,
  Loader2, Banknote, CreditCard, ArrowLeftRight, ShoppingBag
} from 'lucide-react';
import { posApi, getPosUser, clearPosSession } from '@/lib/posApi';
import type { Sale, PosUser } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';

export default function SaleDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<PosUser | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getPosUser();
    if (!u) { router.replace('/pos/login'); return; }
    setUser(u);
    posApi.getSaleById(id)
      .then(setSale)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleVoid() {
    if (!voidReason.trim()) return;
    setVoiding(true);
    try {
      const updated = await posApi.voidSale(id, voidReason);
      setSale(updated);
      setShowVoidModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVoiding(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
    </div>
  );

  if (error || !sale) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-red-500 p-4">{error || 'Sale not found'}</div>
    </div>
  );

  const payIcon = sale.paymentMethod === 'cash'
    ? <Banknote className="w-4 h-4" />
    : sale.paymentMethod === 'card'
      ? <CreditCard className="w-4 h-4" />
      : <ArrowLeftRight className="w-4 h-4" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <header className="no-print bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pos/sales" className="p-2 rounded-lg hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-sm">{sale.receiptNumber}</h1>
            <p className="text-gray-400 text-xs">{new Date(sale.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          {sale.status === 'completed' && (
            <button
              onClick={() => setShowVoidModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-300"
            >
              <XCircle className="w-4 h-4" /> Void
            </button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {sale.status === 'voided' && (
          <div className="no-print mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Sale Voided</p>
              {sale.voidReason && <p className="text-xs mt-0.5">{sale.voidReason}</p>}
            </div>
          </div>
        )}

        {/* Receipt */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 space-y-5">
            {/* Store header */}
            <div className="text-center border-b pb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C9A84C] mb-3">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">KENTAZ</h2>
              <p className="text-xs text-gray-400 mt-1">Point of Sale Receipt</p>
              <div className="mt-3 space-y-1">
                <p className="font-mono text-sm font-semibold text-gray-700">{sale.receiptNumber}</p>
                <p className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleString('en-NG')}</p>
              </div>
              <div className="mt-3">
                {sale.status === 'completed'
                  ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100"><CheckCircle className="w-3 h-3" /> Completed</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100"><XCircle className="w-3 h-3" /> Voided</span>}
              </div>
            </div>

            {/* Customer info */}
            {(sale.customerName || sale.customerPhone) && (
              <div className="text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                {sale.customerName && <p className="font-medium text-gray-800">{sale.customerName}</p>}
                {sale.customerPhone && <p className="text-gray-500">{sale.customerPhone}</p>}
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</p>
              <div className="space-y-3">
                {sale.items.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">—</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                      {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                      <p className="text-xs text-gray-500">{item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatPrice(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount {sale.discountType === 'percent' ? `(${sale.discount}%)` : ''}</span>
                  <span>-{formatPrice(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 text-gray-900">
                <span>TOTAL</span><span>{formatPrice(sale.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">{payIcon} {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}</span>
                <span>{formatPrice(sale.amountPaid)}</span>
              </div>
              {sale.change > 0 && (
                <div className="flex justify-between font-semibold text-green-700">
                  <span>Change</span><span>{formatPrice(sale.change)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t pt-4 text-center space-y-1">
              <p className="text-xs text-gray-500">Cashier: <span className="font-medium">{sale.cashierName || sale.cashier?.name}</span></p>
              {sale.notes && <p className="text-xs text-gray-400 italic">{sale.notes}</p>}
              <p className="text-xs text-gray-300 mt-3">Thank you for shopping at Kentaz!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Void modal */}
      {showVoidModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="font-bold text-gray-900">Void Sale</h3>
            </div>
            <p className="text-sm text-gray-600">This will reverse the sale and restore stock. Please provide a reason.</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <input
              type="text"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              placeholder="Reason for voiding..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-300"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowVoidModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={!voidReason.trim() || voiding}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Void Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
