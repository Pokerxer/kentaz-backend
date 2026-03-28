'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, CheckCircle, XCircle, Clock, Package,
  Loader2, Building2, Hash, CalendarDays, StickyNote, User,
  AlertTriangle, RotateCcw, ChevronDown, X, Minus, Plus,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { purchaseApi, Purchase, ReturnItemInput } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ─── config ─────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  pending:            { label: 'Pending',            color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-400',  icon: Clock },
  received:           { label: 'Received',           color: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500',  icon: CheckCircle },
  partially_returned: { label: 'Partially Returned', color: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-400',   icon: RotateCcw },
  returned:           { label: 'Returned',           color: 'bg-gray-100 text-gray-600 border-gray-200',      dot: 'bg-gray-400',   icon: RotateCcw },
  cancelled:          { label: 'Cancelled',          color: 'bg-red-50 text-red-500 border-red-100',          dot: 'bg-red-400',    icon: XCircle },
};

const RETURN_REASONS = [
  { value: 'defective',      label: 'Defective / Damaged' },
  { value: 'wrong_item',     label: 'Wrong Item Sent' },
  { value: 'overstock',      label: 'Overstock' },
  { value: 'quality_issue',  label: 'Quality Issue' },
  { value: 'supplier_error', label: 'Supplier Error' },
  { value: 'other',          label: 'Other' },
];

// ─── return modal ────────────────────────────────────────────────────────────

interface ReturnModalProps {
  purchase: Purchase;
  onClose: () => void;
  onSubmit: (items: ReturnItemInput[], reason: string, notes: string) => Promise<void>;
  submitting: boolean;
}

function ReturnModal({ purchase, onClose, onSubmit, submitting }: ReturnModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Compute already-returned quantities per item
  const alreadyReturnedMap: Record<string, number> = {};
  for (const ret of (purchase.returns || [])) {
    for (const ri of ret.items) {
      const key = `${ri.product}_${ri.variantIndex}`;
      alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + ri.quantity;
    }
  }

  // Build initial qty state: all zeros
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    purchase.items.forEach(item => {
      const pid = typeof item.product === 'object' ? (item.product as any)._id : item.product;
      init[`${pid}_${item.variantIndex}`] = 0;
    });
    return init;
  });

  const setQty = (key: string, val: number, max: number) => {
    setQtys(prev => ({ ...prev, [key]: Math.min(Math.max(0, val), max) }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!reason) { setError('Please select a return reason'); return; }
    const items: ReturnItemInput[] = [];
    for (const item of purchase.items) {
      const pid = typeof item.product === 'object' ? (item.product as any)._id : item.product;
      const key = `${pid}_${item.variantIndex}`;
      const qty = qtys[key] || 0;
      if (qty > 0) items.push({ productId: pid, variantIndex: item.variantIndex, quantity: qty });
    }
    if (items.length === 0) { setError('Enter a return quantity for at least one item'); return; }
    await onSubmit(items, reason, notes);
  };

  const totalReturnValue = purchase.items.reduce((sum, item) => {
    const pid = typeof item.product === 'object' ? (item.product as any)._id : item.product;
    const key = `${pid}_${item.variantIndex}`;
    return sum + (qtys[key] || 0) * item.costPrice;
  }, 0);

  const totalReturnUnits = Object.values(qtys).reduce((s, v) => s + v, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[#C9A84C]" />
              Return Items
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">to {purchase.supplier}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {purchase.items.map((item) => {
            const pid = typeof item.product === 'object' ? (item.product as any)._id : item.product;
            const image = typeof item.product === 'object' ? (item.product as any).images?.[0]?.url : null;
            const key = `${pid}_${item.variantIndex}`;
            const alreadyRet = alreadyReturnedMap[key] || 0;
            const max = item.quantity - alreadyRet;
            const qty = qtys[key] || 0;

            if (max <= 0) {
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 opacity-50">
                  <div className="h-10 w-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-400 m-2.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.variantLabel || 'Default'} · All units already returned</p>
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-1 rounded-lg">Fully returned</span>
                </div>
              );
            }

            return (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${qty > 0 ? 'border-[#C9A84C]/30 bg-[#C9A84C]/5' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-400 m-2.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">
                    {item.variantLabel || 'Default'} · {formatPrice(item.costPrice)}/unit
                    {alreadyRet > 0 && <span className="ml-1 text-blue-500">· {alreadyRet} already returned</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-gray-400 mr-1">Max {max}</span>
                  <button onClick={() => setQty(key, qty - 1, max)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number" min={0} max={max} value={qty}
                    onChange={e => setQty(key, parseInt(e.target.value) || 0, max)}
                    className="w-12 text-center py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                  />
                  <button onClick={() => setQty(key, qty + 1, max)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Reason & notes */}
          <div className="pt-2 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Return Reason <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] appearance-none bg-white"
                >
                  <option value="">Select a reason...</option>
                  {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder="Additional details about this return..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] resize-none text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-2xl">
          <div className="text-sm text-gray-600">
            {totalReturnUnits > 0 ? (
              <span>Returning <strong>{totalReturnUnits}</strong> unit{totalReturnUnits !== 1 ? 's' : ''} · <strong>{formatPrice(totalReturnValue)}</strong></span>
            ) : (
              <span className="text-gray-400">No items selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || totalReturnUnits === 0}
              className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Confirm Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    purchaseApi.getById(id)
      .then(setPurchase)
      .catch(() => setMsg({ text: 'Failed to load purchase', error: true }))
      .finally(() => setLoading(false));
  }, [id]);

  const showMsg = (text: string, error = false) => {
    setMsg({ text, error });
    if (!error) setTimeout(() => setMsg(null), 5000);
  };

  const handleReceive = async () => {
    if (!purchase) return;
    setActionLoading(true);
    try {
      setPurchase(await purchaseApi.receive(purchase._id));
      showMsg('Stock received and inventory updated.');
    } catch (err: any) {
      showMsg(err.message || 'Failed to receive purchase', true);
    } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!purchase || !confirm('Cancel this purchase order? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      setPurchase(await purchaseApi.cancel(purchase._id));
      showMsg('Purchase order cancelled.');
    } catch (err: any) {
      showMsg(err.message || 'Failed to cancel purchase', true);
    } finally { setActionLoading(false); }
  };

  const handleReturn = async (items: ReturnItemInput[], reason: string, notes: string) => {
    if (!purchase) return;
    setReturnSubmitting(true);
    try {
      setPurchase(await purchaseApi.return(purchase._id, { items, reason, notes }));
      setReturnModalOpen(false);
      showMsg('Return processed and stock levels updated.');
    } catch (err: any) {
      showMsg(err.message || 'Failed to process return', true);
      setReturnModalOpen(false);
    } finally { setReturnSubmitting(false); }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      </AdminLayout>
    );
  }

  if (!purchase) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto text-center py-24">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Purchase order not found</p>
          <button onClick={() => router.back()} className="mt-4 text-[#C9A84C] hover:underline text-sm">Go back</button>
        </div>
      </AdminLayout>
    );
  }

  const cfg = statusConfig[purchase.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;
  const totalUnits = purchase.items.reduce((s, i) => s + i.quantity, 0);
  const totalReturnedUnits = (purchase.returns || []).reduce((s, r) => s + r.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  const poNumber = purchase.reference || `PO-${purchase._id.slice(-8).toUpperCase()}`;
  const canReturn = ['received', 'partially_returned'].includes(purchase.status);
  const canCancel = purchase.status === 'pending';
  const canReceive = purchase.status === 'pending';

  return (
    <AdminLayout>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #purchase-print-area, #purchase-print-area * { visibility: visible !important; }
          #purchase-print-area { position: fixed !important; inset: 0 !important; padding: 32px !important; background: white !important; z-index: 9999 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {returnModalOpen && (
        <ReturnModal
          purchase={purchase}
          onClose={() => setReturnModalOpen(false)}
          onSubmit={handleReturn}
          submitting={returnSubmitting}
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Top bar */}
        <div className="no-print mb-6 flex items-center justify-between animate-fade-in">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Purchases
          </button>

          <div className="flex items-center gap-2">
            {canCancel && (
              <button onClick={handleCancel} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Cancel Order
              </button>
            )}
            {canReturn && (
              <button onClick={() => setReturnModalOpen(true)} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#C9A84C] text-[#C9A84C] rounded-xl text-sm font-medium hover:bg-[#C9A84C]/5 disabled:opacity-50 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
                Return Items
              </button>
            )}
            {canReceive && (
              <button onClick={handleReceive} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Mark as Received
              </button>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {msg && (
          <div className={`no-print mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {msg.error ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <CheckCircle className="h-4 w-4 flex-shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* ── PRINTABLE AREA ─────────────────────────────────────── */}
        <div id="purchase-print-area">

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${cfg.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-lg font-mono font-semibold text-[#C9A84C]">{poNumber}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-[#C9A84C] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">K</span>
                  </div>
                  <span className="font-bold text-lg text-gray-900">Kentaz</span>
                </div>
                <p className="text-xs text-gray-400">Luxury · Lifestyle · Wellness</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y md:divide-y-0 divide-gray-100">
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"><Building2 className="h-3.5 w-3.5" />Supplier</div>
                <p className="font-semibold text-gray-900">{purchase.supplier}</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"><CalendarDays className="h-3.5 w-3.5" />Order Date</div>
                <p className="font-semibold text-gray-900">{formatDate(purchase.purchaseDate)}</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"><Hash className="h-3.5 w-3.5" />Reference</div>
                <p className="font-semibold text-gray-900">{purchase.reference || '—'}</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"><User className="h-3.5 w-3.5" />Created By</div>
                <p className="font-semibold text-gray-900">{purchase.performedBy?.name || 'Admin'}</p>
              </div>
            </div>

            {purchase.notes && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">{purchase.notes}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Items Ordered</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ordered</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Returned</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost / Unit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {purchase.items.map((item, idx) => {
                    const productData = typeof item.product === 'object' ? item.product : null;
                    const pid = productData ? (productData as any)._id : item.product;
                    const image = (productData as any)?.images?.[0]?.url;
                    const sellingPrice = (productData as any)?.variants?.[item.variantIndex]?.price;
                    const margin = sellingPrice && item.costPrice > 0
                      ? Math.round(((sellingPrice - item.costPrice) / sellingPrice) * 100)
                      : null;

                    // how many units of this item have been returned
                    let retQty = 0;
                    for (const ret of (purchase.returns || [])) {
                      for (const ri of ret.items) {
                        if (ri.product === pid && ri.variantIndex === item.variantIndex) retQty += ri.quantity;
                      }
                    }
                    const netQty = item.quantity - retQty;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                              {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-400 m-3" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              {margin !== null && (
                                <p className={`text-xs font-medium mt-0.5 ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {margin}% margin · sells at {formatPrice(sellingPrice)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.variantLabel || 'Default'}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-right">
                          {retQty > 0 ? (
                            <span className="font-medium text-blue-600">−{retQty}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">{formatPrice(item.costPrice)}</td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-semibold text-gray-900">{formatPrice(item.totalCost)}</p>
                          {retQty > 0 && (
                            <p className="text-xs text-blue-600 mt-0.5">Net: {formatPrice(netQty * item.costPrice)}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm text-gray-500">
                      {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''} · {totalUnits} units ordered
                      {totalReturnedUnits > 0 && ` · ${totalReturnedUnits} returned`}
                    </td>
                    <td colSpan={2} className="px-6 py-4 text-right text-sm font-medium text-gray-600">Total Cost</td>
                    <td className="px-6 py-4 text-right text-xl font-bold text-gray-900">{formatPrice(purchase.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Returns history */}
          {purchase.returns && purchase.returns.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-blue-500" />
                  Return History
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {purchase.returns.map((ret, ri) => {
                  const reasonLabel = RETURN_REASONS.find(r => r.value === ret.reason)?.label || ret.reason;
                  return (
                    <div key={ri} className="px-6 py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">Return #{ri + 1}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{reasonLabel}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(ret.returnedAt)}{ret.performedBy?.name ? ` · by ${ret.performedBy.name}` : ''}
                          </p>
                          {ret.notes && <p className="text-sm text-gray-500 mt-1">{ret.notes}</p>}
                        </div>
                        <p className="font-semibold text-blue-600">{formatPrice(ret.totalCost)}</p>
                      </div>
                      <div className="space-y-1">
                        {ret.items.map((ri2, ii) => (
                          <div key={ii} className="flex items-center justify-between text-sm text-gray-600 bg-blue-50/50 rounded-lg px-3 py-2">
                            <span>{ri2.productName} {ri2.variantLabel ? `· ${ri2.variantLabel}` : ''}</span>
                            <span className="font-medium">×{ri2.quantity} · {formatPrice(ri2.totalCost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <h2 className="font-semibold text-gray-900 mb-5">Order Timeline</h2>
            <ol className="relative border-l-2 border-gray-100 space-y-6 ml-3">
              <li className="pl-6 relative">
                <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-[#C9A84C] border-2 border-white ring-2 ring-[#C9A84C]/20" />
                <p className="text-sm font-semibold text-gray-900">Purchase order created</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(purchase.createdAt)}{purchase.performedBy?.name ? ` · by ${purchase.performedBy.name}` : ''}
                </p>
              </li>

              {purchase.status !== 'pending' && purchase.status !== 'cancelled' && purchase.receivedAt && (
                <li className="pl-6 relative">
                  <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-white ring-2 ring-green-500/20" />
                  <p className="text-sm font-semibold text-green-700">Stock received</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(purchase.receivedAt)} · {totalUnits} unit{totalUnits !== 1 ? 's' : ''} added to inventory
                  </p>
                </li>
              )}

              {(purchase.returns || []).map((ret, ri) => {
                const reasonLabel = RETURN_REASONS.find(r => r.value === ret.reason)?.label || ret.reason;
                const retUnits = ret.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <li key={ri} className="pl-6 relative">
                    <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-blue-400 border-2 border-white ring-2 ring-blue-400/20" />
                    <p className="text-sm font-semibold text-blue-700">Return #{ri + 1} — {reasonLabel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(ret.returnedAt)} · {retUnits} unit{retUnits !== 1 ? 's' : ''} returned · {formatPrice(ret.totalCost)}
                      {ret.performedBy?.name ? ` · by ${ret.performedBy.name}` : ''}
                    </p>
                    {ret.notes && <p className="text-xs text-gray-500 mt-0.5 italic">"{ret.notes}"</p>}
                  </li>
                );
              })}

              {purchase.status === 'returned' && (
                <li className="pl-6 relative">
                  <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-gray-400 border-2 border-white" />
                  <p className="text-sm font-semibold text-gray-500">Fully returned to supplier</p>
                  <p className="text-xs text-gray-400 mt-0.5">All items have been returned</p>
                </li>
              )}

              {purchase.status === 'cancelled' && (
                <li className="pl-6 relative">
                  <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-red-400 border-2 border-white" />
                  <p className="text-sm font-semibold text-red-600">Order cancelled</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(purchase.updatedAt)}</p>
                </li>
              )}

              {purchase.status === 'pending' && (
                <li className="pl-6 relative">
                  <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-amber-300 border-2 border-dashed border-amber-400" />
                  <p className="text-sm font-medium text-amber-600">Awaiting receipt</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mark as received when goods arrive</p>
                </li>
              )}
            </ol>
          </div>

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Kentaz · Luxury · Lifestyle · Wellness</p>
            <p className="mt-1">Printed {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · {poNumber}</p>
          </div>

        </div>
        {/* ── END PRINTABLE AREA ──────────────────────────────────── */}
      </div>
    </AdminLayout>
  );
}
