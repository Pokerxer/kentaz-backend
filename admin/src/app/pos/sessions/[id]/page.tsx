'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, Loader2, Banknote, CreditCard,
  ArrowLeftRight, RotateCcw, Printer, FileText, Clock, TrendingUp,
  Package, ShoppingCart, X, AlertCircle, Minus, Plus, Lock,
  ArrowDownCircle, ArrowUpCircle, Receipt, DollarSign,
} from 'lucide-react';
import { posApi, getPosUser } from '@/lib/posApi';
import type { PosUser, Sale, SaleItem, RegisterReport } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────

function PayBadge({ method }: { method: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    cash:     { cls: 'bg-green-100 text-green-700',   icon: <Banknote className="w-3 h-3" /> },
    card:     { cls: 'bg-blue-100 text-blue-700',     icon: <CreditCard className="w-3 h-3" /> },
    transfer: { cls: 'bg-purple-100 text-purple-700', icon: <ArrowLeftRight className="w-3 h-3" /> },
  };
  const m = map[method] ?? map.cash;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}>
      {m.icon} {method}
    </span>
  );
}

// ── Order detail side panel ───────────────────────────────────

function OrderPanel({
  sale: initialSale,
  onClose,
  onUpdated,
}: {
  sale: Sale;
  onClose: () => void;
  onUpdated: (s: Sale) => void;
}) {
  const [sale, setSale] = useState(initialSale);
  const [refundQtys, setRefundQtys] = useState<Record<number, number>>({});
  const [refundReason, setRefundReason] = useState('');
  const [showRefund, setShowRefund] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSale(initialSale);
    setRefundQtys({});
    setShowRefund(false);
    setError('');
  }, [initialSale._id]);

  const isRefundRecord = sale.type === 'refund';
  const canRefund = !isRefundRecord && sale.status === 'completed' &&
    sale.items.some(i => (i.quantity - (i.refundedQty || 0)) > 0);
  const selectedCount = Object.values(refundQtys).reduce((s, v) => s + v, 0);

  function toggleItem(idx: number) {
    const item = sale.items[idx];
    const max = item.quantity - (item.refundedQty || 0);
    if (max <= 0) return;
    setRefundQtys(prev => {
      const next = { ...prev };
      if (next[idx]) delete next[idx]; else next[idx] = max;
      return next;
    });
  }

  function adjustQty(idx: number, delta: number) {
    const item = sale.items[idx];
    const max = item.quantity - (item.refundedQty || 0);
    setRefundQtys(prev => ({ ...prev, [idx]: Math.min(max, Math.max(1, (prev[idx] ?? 1) + delta)) }));
  }

  async function handleRefund() {
    setError(''); setProcessing(true);
    try {
      const items = Object.entries(refundQtys).map(([idx, qty]) => ({ saleItemIndex: parseInt(idx), quantity: qty }));
      const { original } = await posApi.refundItems(sale._id, items, refundReason);
      setSale(original);
      onUpdated(original);
      setRefundQtys({}); setRefundReason(''); setShowRefund(false);
    } catch (err: any) { setError(err.message); }
    finally { setProcessing(false); }
  }

  async function handleVoid() {
    if (!voidReason.trim()) return;
    setError(''); setProcessing(true);
    try {
      const updated = await posApi.voidSale(sale._id, voidReason);
      setSale(updated); onUpdated(updated);
      setShowVoid(false); setVoidReason('');
    } catch (err: any) { setError(err.message); }
    finally { setProcessing(false); }
  }

  function printInvoice() {
    const w = window.open('', '_blank', 'width=700,height=900');
    if (!w) return;
    const rows = sale.items.map(item => `
      <tr>
        <td>${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatPrice(Math.abs(item.price))}</td>
        <td style="text-align:right;${item.total < 0 ? 'color:red' : ''}">${item.total < 0 ? '-' : ''}${formatPrice(Math.abs(item.total))}</td>
      </tr>`).join('');
    w.document.write(`<html><head><title>Invoice ${sale.receiptNumber}</title><style>
      body{font-family:Arial,sans-serif;font-size:13px;padding:40px;max-width:700px;margin:0 auto}
      h1{font-size:28px;margin:0}.header{display:flex;justify-content:space-between;margin-bottom:32px}
      .lbl{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      th{background:#f5f5f5;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:10px 12px;border-bottom:1px solid #eee}
      .tot td{border:none;padding:6px 12px}.tot-row td{font-weight:bold;font-size:15px;border-top:2px solid #111;padding-top:12px}
      .footer{margin-top:40px;text-align:center;color:#888;font-size:11px}
    </style></head><body>
    <div class="header">
      <div><h1>KENTAZ</h1><div style="color:#666;margin-top:4px">${isRefundRecord ? 'Return/Refund' : 'Tax Invoice'}</div></div>
      <div style="text-align:right">
        <div class="lbl">No.</div><div style="font-weight:bold;font-size:16px">${sale.receiptNumber}</div>
        <div style="margin-top:8px" class="lbl">Date</div>
        <div>${new Date(sale.createdAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })}</div>
      </div>
    </div>
    ${sale.customerName ? `<div style="margin-bottom:24px"><div class="lbl">Bill To</div><div style="font-weight:600">${sale.customerName}</div>${sale.customerPhone ? `<div style="color:#666">${sale.customerPhone}</div>` : ''}</div>` : ''}
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tbody class="tot">
        <tr><td colspan="3">Subtotal</td><td style="text-align:right;${sale.subtotal < 0 ? 'color:red' : ''}">${sale.subtotal < 0 ? '-' : ''}${formatPrice(Math.abs(sale.subtotal))}</td></tr>
        ${sale.discountAmount > 0 ? `<tr><td colspan="3">Discount</td><td style="text-align:right;color:red">-${formatPrice(sale.discountAmount)}</td></tr>` : ''}
        <tr class="tot-row"><td colspan="3">${isRefundRecord ? 'REFUNDED' : 'TOTAL'}</td><td style="text-align:right;${sale.total < 0 ? 'color:red' : ''}">${sale.total < 0 ? '-' : ''}${formatPrice(Math.abs(sale.total))}</td></tr>
      </tbody>
    </table>
    <div class="footer"><p>Kentaz POS · Cashier: ${sale.cashierName}</p></div>
    </body></html>`);
    w.document.close(); w.print();
  }

  function printReceipt() {
    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w) return;
    const rows = sale.items.map(i =>
      `<tr><td>${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''}</td><td class="r">${i.quantity}×${formatPrice(Math.abs(i.price))}</td><td class="r" style="${i.total<0?'color:red':''}">${i.total<0?'-':''}${formatPrice(Math.abs(i.total))}</td></tr>`
    ).join('');
    w.document.write(`<html><head><title>Receipt</title><style>
      body{font-family:monospace;font-size:12px;padding:16px;max-width:300px;margin:0 auto}
      h2{text-align:center;margin:0 0 2px}.c{text-align:center}.b{font-weight:bold}.ln{border-top:1px dashed #999;margin:8px 0}
      table{width:100%;border-collapse:collapse}td{padding:2px 0}.r{text-align:right}
    </style></head><body>
    <h2>KENTAZ</h2>
    <p class="c">${sale.receiptNumber}</p>
    <p class="c">${new Date(sale.createdAt).toLocaleString('en-NG')}</p>
    ${isRefundRecord ? '<p class="c b" style="color:orange">RETURN / REFUND</p>' : ''}
    <div class="ln"></div>
    ${sale.customerName ? `<p>Customer: ${sale.customerName}</p>` : ''}
    <table>${rows}</table>
    <div class="ln"></div>
    <table>
      <tr><td>Subtotal</td><td class="r">${sale.subtotal < 0 ? '-' : ''}${formatPrice(Math.abs(sale.subtotal))}</td></tr>
      ${sale.discountAmount > 0 ? `<tr><td>Discount</td><td class="r" style="color:red">-${formatPrice(sale.discountAmount)}</td></tr>` : ''}
      <tr><td class="b">${isRefundRecord ? 'REFUNDED' : 'TOTAL'}</td><td class="r b" style="${sale.total<0?'color:red':''}">${sale.total<0?'-':''}${formatPrice(Math.abs(sale.total))}</td></tr>
      ${sale.change > 0 ? `<tr><td>Change</td><td class="r">${formatPrice(sale.change)}</td></tr>` : ''}
    </table>
    <div class="ln"></div>
    <p class="c">Cashier: ${sale.cashierName}</p>
    <p class="c">Thank you for shopping at Kentaz!</p>
    </body></html>`);
    w.document.close(); w.print();
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Panel header */}
      <div className="px-4 py-3.5 border-b flex items-center justify-between flex-shrink-0 bg-gray-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="min-w-0">
            <p className={`font-black font-mono text-sm truncate ${isRefundRecord ? 'text-orange-700' : 'text-gray-900'}`}>
              {sale.receiptNumber}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(sale.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={printReceipt} title="Print Receipt" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition">
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button onClick={printInvoice} title="Print Invoice" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition">
            <FileText className="w-3.5 h-3.5" />
          </button>
          {canRefund && (
            <button
              onClick={() => setShowRefund(p => !p)}
              className={`p-1.5 rounded-lg border transition ${showRefund ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 hover:bg-gray-100 text-gray-500'}`}
              title="Refund items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {sale.status === 'completed' && !isRefundRecord && (
            <button
              onClick={() => setShowVoid(true)}
              className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-400 transition"
              title="Void sale"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Banners */}
      {isRefundRecord && (
        <div className="mx-4 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2 text-orange-700">
          <RotateCcw className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold">Return / Refund</p>
            {sale.notes && <p className="text-xs opacity-70 mt-0.5">{sale.notes}</p>}
          </div>
        </div>
      )}
      {sale.status === 'voided' && !isRefundRecord && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold">Voided</p>
            {sale.voidReason && <p className="text-xs opacity-70 mt-0.5">{sale.voidReason}</p>}
          </div>
        </div>
      )}
      {showRefund && (
        <div className="mx-4 mt-3 p-2.5 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-700 flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" /> Click items to select for refund
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Customer + payment */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Customer</p>
            {sale.customerName
              ? <p className="text-sm font-semibold text-gray-800">{sale.customerName}</p>
              : <p className="text-xs text-gray-400 italic">Walk-in</p>}
            {sale.customerPhone && <p className="text-xs text-gray-400">{sale.customerPhone}</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Payment</p>
            <PayBadge method={sale.paymentMethod} />
            <p className="text-xs text-gray-400 mt-1.5">
              {sale.status === 'completed'
                ? <span className="text-green-600 font-semibold">Paid</span>
                : <span className="text-red-500 font-semibold">Voided</span>}
            </p>
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
            Items ({sale.items.length})
          </p>
          <div className="space-y-1.5">
            {sale.items.map((item, idx) => {
              const refundable = item.quantity - (item.refundedQty || 0);
              const isSelected = refundQtys[idx] !== undefined;
              const fullyRefunded = refundable <= 0;
              return (
                <div
                  key={idx}
                  onClick={() => showRefund && !fullyRefunded && toggleItem(idx)}
                  className={`rounded-xl border p-2.5 transition ${
                    showRefund && !fullyRefunded ? 'cursor-pointer' : ''
                  } ${isSelected ? 'border-orange-400 bg-orange-50' : fullyRefunded ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0]
                        ? <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-3.5 h-3.5 text-gray-300" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-gray-400">{item.variantLabel || 'Default'} · ×{item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-bold ${item.total < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {item.total < 0 ? '-' : ''}{formatPrice(Math.abs(item.total))}
                      </p>
                      {(item.refundedQty || 0) > 0 && (
                        <p className="text-[10px] text-orange-500">{item.refundedQty} returned</p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-orange-200 flex items-center justify-between">
                      <span className="text-[10px] text-orange-700 font-semibold">Return qty:</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => { e.stopPropagation(); adjustQty(idx, -1); }} className="w-5 h-5 rounded-full border border-orange-300 flex items-center justify-center">
                          <Minus className="w-2.5 h-2.5 text-orange-600" />
                        </button>
                        <span className="text-xs font-bold text-orange-700 w-4 text-center">{refundQtys[idx]}</span>
                        <button onClick={e => { e.stopPropagation(); adjustQty(idx, 1); }} className="w-5 h-5 rounded-full border border-orange-300 flex items-center justify-center">
                          <Plus className="w-2.5 h-2.5 text-orange-600" />
                        </button>
                        <span className="text-[10px] text-gray-400 ml-0.5">/{refundable}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Refund confirm */}
        {showRefund && selectedCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2.5">
            <p className="text-xs font-semibold text-orange-800">Refund {selectedCount} item{selectedCount !== 1 ? 's' : ''}</p>
            <input
              type="text"
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs focus:outline-none bg-white"
            />
            <button
              onClick={handleRefund}
              disabled={processing}
              className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Confirm Refund
            </button>
          </div>
        )}

        {/* Totals */}
        <div className={`rounded-xl p-3 space-y-1.5 text-xs ${isRefundRecord ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span className={sale.subtotal < 0 ? 'text-red-500' : ''}>{sale.subtotal < 0 ? '-' : ''}{formatPrice(Math.abs(sale.subtotal))}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Discount {sale.discountType === 'percent' ? `(${sale.discount}%)` : ''}</span>
              <span>-{formatPrice(sale.discountAmount)}</span>
            </div>
          )}
          <div className={`flex justify-between font-bold text-sm pt-1.5 border-t ${isRefundRecord ? 'border-orange-200 text-red-600' : 'border-gray-200 text-gray-900'}`}>
            <span>{isRefundRecord ? 'Refunded' : 'Total'}</span>
            <span>{sale.total < 0 ? '-' : ''}{formatPrice(Math.abs(sale.total))}</span>
          </div>
          {sale.change > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Change</span><span>{formatPrice(sale.change)}</span>
            </div>
          )}
        </div>

        {sale.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
            <p className="font-semibold text-amber-600 mb-1">Note</p>{sale.notes}
          </div>
        )}
      </div>

      {/* Void modal */}
      {showVoid && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-red-600 text-sm"><XCircle className="w-4 h-4" /> Void Sale</h3>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <input type="text" value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Reason..."
              autoFocus className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-300" />
            <div className="flex gap-2">
              <button onClick={() => { setShowVoid(false); setError(''); }} className="flex-1 py-2 border rounded-xl text-sm">Cancel</button>
              <button onClick={handleVoid} disabled={!voidReason.trim() || processing}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function SessionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<PosUser | null>(null);
  const [report, setReport] = useState<RegisterReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const u = getPosUser();
    if (!u) { router.replace('/pos/login'); return; }
    setUser(u);
  }, [router]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await posApi.getRegisterReport(id);
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user) loadReport(); }, [user, loadReport]);

  function handleUpdated(updated: Sale) {
    setReport(prev => {
      if (!prev) return prev;
      return { ...prev, sales: prev.sales.map(s => s._id === updated._id ? updated : s) };
    });
    setSelectedSale(updated);
  }

  const filtered = (report?.sales ?? []).filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.receiptNumber.toLowerCase().includes(q) ||
      (s.customerName ?? '').toLowerCase().includes(q) ||
      (s.cashierName ?? '').toLowerCase().includes(q)
    );
  });

  function printZReport() {
    if (!report) return;
    const w = window.open('', '_blank', 'width=500,height=700');
    if (!w) return;
    const r = report;
    w.document.write(`<html><head><title>Z-Report</title><style>
      body{font-family:monospace;font-size:12px;padding:20px;max-width:360px;margin:0 auto}
      h2{text-align:center;font-size:16px;margin:0}.c{text-align:center}.b{font-weight:bold}
      .ln{border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse}
      td{padding:2px 0}.r{text-align:right}
    </style></head><body>
    <h2>KENTAZ POS</h2><p class="c">Z-REPORT</p><p class="c">${new Date().toLocaleString('en-NG')}</p>
    <div class="ln"></div>
    <p>Cashier: ${r.register.cashierName}</p>
    <p>Opened: ${new Date(r.register.openedAt).toLocaleString('en-NG')}</p>
    ${r.register.closedAt ? `<p>Closed: ${new Date(r.register.closedAt).toLocaleString('en-NG')}</p>` : ''}
    <div class="ln"></div>
    <table>
      <tr><td>Total Orders</td><td class="r b">${r.totalSales}</td></tr>
      <tr><td>Total Refunds</td><td class="r">${r.totalRefunds}</td></tr>
      <tr><td>Net Items Sold</td><td class="r">${r.totalItems}</td></tr>
    </table>
    <div class="ln"></div>
    <table>
      <tr><td>Cash Sales</td><td class="r">${formatPrice(r.totalCash)}</td></tr>
      <tr><td>Card Sales</td><td class="r">${formatPrice(r.totalCard)}</td></tr>
      <tr><td>Transfer Sales</td><td class="r">${formatPrice(r.totalTransfer)}</td></tr>
      <tr><td class="b">Net Revenue</td><td class="r b">${formatPrice(r.totalRevenue)}</td></tr>
    </table>
    <div class="ln"></div>
    <table>
      <tr><td>Opening Balance</td><td class="r">${formatPrice(r.register.openingBalance)}</td></tr>
      ${r.totalCashIn > 0 ? `<tr><td>Cash In</td><td class="r">+${formatPrice(r.totalCashIn)}</td></tr>` : ''}
      ${r.totalCashOut > 0 ? `<tr><td>Cash Out</td><td class="r">-${formatPrice(r.totalCashOut)}</td></tr>` : ''}
      <tr><td class="b">Expected Cash</td><td class="r b">${formatPrice(r.expectedCash)}</td></tr>
      ${r.register.closingBalance !== undefined ? `
      <tr><td>Counted Cash</td><td class="r">${formatPrice(r.register.closingBalance)}</td></tr>
      <tr><td class="b">Difference</td><td class="r b" style="${(r.register.difference??0) < 0 ? 'color:red' : 'color:green'}">${(r.register.difference??0) >= 0 ? '+' : ''}${formatPrice(r.register.difference??0)}</td></tr>` : ''}
    </table>
    <div class="ln"></div><p class="c">--- End of Report ---</p>
    </body></html>`);
    w.document.close(); w.print();
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-red-500">{error || 'Session not found'}</p>
        <Link href="/pos/dashboard" className="text-sm text-[#C9A84C] mt-2 inline-block">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const reg = report.register;
  const isOpen = reg.status === 'open';

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/pos/dashboard" className="p-2 rounded-lg hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm">{reg.cashierName}'s Session</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'}`}>
                {isOpen ? '● Open' : 'Closed'}
              </span>
            </div>
            <p className="text-gray-400 text-xs">
              {new Date(reg.openedAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {reg.closedAt && ` → ${new Date(reg.closedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <button
          onClick={printZReport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
        >
          <Printer className="w-4 h-4" /> Z-Report
        </button>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        {[
          { label: 'Orders', value: String(report.totalSales), icon: <ShoppingCart className="w-3.5 h-3.5" />, color: 'text-blue-600' },
          { label: 'Refunds', value: String(report.totalRefunds), icon: <RotateCcw className="w-3.5 h-3.5" />, color: 'text-orange-500' },
          { label: 'Net Items', value: String(report.totalItems), icon: <Package className="w-3.5 h-3.5" />, color: 'text-purple-600' },
          { label: 'Net Revenue', value: formatPrice(report.totalRevenue), icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-[#C9A84C]' },
          { label: 'Cash', value: formatPrice(report.totalCash), icon: <Banknote className="w-3.5 h-3.5" />, color: 'text-green-600' },
          { label: 'Card', value: formatPrice(report.totalCard), icon: <CreditCard className="w-3.5 h-3.5" />, color: 'text-blue-500' },
          { label: 'Transfer', value: formatPrice(report.totalTransfer), icon: <ArrowLeftRight className="w-3.5 h-3.5" />, color: 'text-purple-500' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="text-center">
            <div className={`flex items-center justify-center gap-1 ${color} mb-0.5`}>{icon}<span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span></div>
            <p className="text-sm font-black text-gray-900 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Transaction list */}
        <div className={`flex flex-col ${selectedSale ? 'hidden lg:flex lg:w-[420px]' : 'w-full lg:w-[420px]'} border-r border-gray-200 bg-white flex-shrink-0 overflow-hidden`}>
          {/* Search */}
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Receipt className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search receipt, customer…"
                className="flex-1 text-xs bg-transparent focus:outline-none text-gray-700"
              />
              {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-gray-400" /></button>}
            </div>
          </div>

          <div className="px-3 py-2 border-b border-gray-50 flex-shrink-0">
            <p className="text-xs text-gray-400 font-medium">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Receipt className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No transactions found</p>
              </div>
            ) : filtered.map(sale => {
              const isRefund = sale.type === 'refund';
              const isVoided = sale.status === 'voided';
              const isActive = selectedSale?._id === sale._id;
              return (
                <button
                  key={sale._id}
                  onClick={() => {
                    setSelectedSale(sale);
                    setShowMobilePanel(true);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-start gap-3 border-l-4 transition ${
                    isActive
                      ? isRefund ? 'bg-orange-50 border-orange-400' : 'bg-amber-50 border-[#C9A84C]'
                      : isRefund ? 'hover:bg-orange-50/40 border-transparent' : 'hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isRefund ? 'bg-orange-100' : isVoided ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {isRefund ? <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
                      : isVoided ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                      : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold font-mono truncate ${isRefund ? 'text-orange-700' : 'text-gray-900'}`}>
                        {sale.receiptNumber}
                      </p>
                      <p className={`text-sm font-black flex-shrink-0 ${isRefund ? 'text-red-500' : isVoided ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {sale.total < 0 ? '-' : ''}{formatPrice(Math.abs(sale.total))}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400 truncate">
                        {isRefund ? <span className="text-orange-500 font-medium">Return</span> : (sale.customerName || <span className="italic">Walk-in</span>)}
                        {' · '}{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                      </p>
                      <PayBadge method={sale.paymentMethod} />
                    </div>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(sale.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cash movements footer */}
          {report.movements.length > 0 && (
            <div className="border-t border-gray-100 p-3 flex-shrink-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Cash Movements</p>
              <div className="space-y-1.5">
                {report.movements.map(m => (
                  <div key={m._id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {m.type === 'in'
                        ? <ArrowDownCircle className="w-3.5 h-3.5 text-green-500" />
                        : <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />}
                      <span className="text-gray-600 truncate max-w-[140px]">{m.reason}</span>
                    </div>
                    <span className={`font-semibold ${m.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                      {m.type === 'in' ? '+' : '-'}{formatPrice(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel (desktop) */}
        {selectedSale && (
          <div className="hidden lg:flex flex-1 overflow-hidden relative">
            <OrderPanel
              key={selectedSale._id}
              sale={selectedSale}
              onClose={() => setSelectedSale(null)}
              onUpdated={handleUpdated}
            />
          </div>
        )}

        {/* Empty state (desktop) */}
        {!selectedSale && (
          <div className="hidden lg:flex flex-1 items-center justify-center text-gray-400 flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Receipt className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500">Select a transaction</p>
            <p className="text-sm">Click any order from the list to see details</p>
          </div>
        )}
      </div>

      {/* Mobile detail slide-over */}
      {showMobilePanel && selectedSale && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white">
          <OrderPanel
            key={selectedSale._id}
            sale={selectedSale}
            onClose={() => { setShowMobilePanel(false); setSelectedSale(null); }}
            onUpdated={handleUpdated}
          />
        </div>
      )}
    </div>
  );
}
