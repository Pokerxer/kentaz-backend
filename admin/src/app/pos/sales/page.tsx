'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Search, Calendar, Banknote, CreditCard, ArrowLeftRight,
  Receipt, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight,
  Printer, RefreshCw, AlertCircle, ShoppingBag, User, X,
  FileText, RotateCcw, Minus, Plus, Package,
} from 'lucide-react';
import { posApi, getPosUser, hasPosPermission, POS_PERMS, validatePosToken } from '@/lib/posApi';
import type { Sale, SaleItem, PosUser } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────

function PayBadge({ method }: { method: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    cash:     { cls: 'bg-green-100 text-green-700',  icon: <Banknote className="w-3 h-3" />,       label: 'Cash' },
    card:     { cls: 'bg-blue-100 text-blue-700',    icon: <CreditCard className="w-3 h-3" />,      label: 'Card' },
    transfer: { cls: 'bg-purple-100 text-purple-700',icon: <ArrowLeftRight className="w-3 h-3" />,  label: 'Transfer' },
  };
  const m = map[method] ?? map.cash;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return status === 'completed'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Paid</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600"><XCircle className="w-3 h-3" /> Voided</span>;
}

// ── Order Detail Panel ────────────────────────────────────────

function OrderDetail({
  sale: initialSale,
  onClose,
  onUpdated,
  currentUser,
}: {
  sale: Sale;
  onClose?: () => void;
  onUpdated: (updated: Sale, refundRecord?: Sale) => void;
  currentUser?: PosUser;
}) {
  const [sale, setSale] = useState(initialSale);
  const [refundQtys, setRefundQtys] = useState<Record<number, number>>({});
  const [refundReason, setRefundReason] = useState('');
  const [showRefundPanel, setShowRefundPanel] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Sync when external sale changes
  useEffect(() => { setSale(initialSale); setRefundQtys({}); setShowRefundPanel(false); setError(''); }, [initialSale]);

  const selectedCount = Object.values(refundQtys).reduce((s, v) => s + v, 0);

  function toggleItem(idx: number) {
    if (sale.status !== 'completed') return;
    const item = sale.items[idx];
    const maxRefundable = item.quantity - (item.refundedQty || 0);
    if (maxRefundable <= 0) return;
    setRefundQtys(prev => {
      const next = { ...prev };
      if (next[idx]) { delete next[idx]; } else { next[idx] = maxRefundable; }
      return next;
    });
  }

  function adjustRefundQty(idx: number, delta: number) {
    const item = sale.items[idx];
    const maxRefundable = item.quantity - (item.refundedQty || 0);
    setRefundQtys(prev => {
      const cur = prev[idx] ?? 0;
      const next = Math.min(maxRefundable, Math.max(1, cur + delta));
      return { ...prev, [idx]: next };
    });
  }

  async function handleRefund() {
    setError('');
    setProcessing(true);
    try {
      const items = Object.entries(refundQtys).map(([idx, qty]) => ({ saleItemIndex: parseInt(idx), quantity: qty }));
      const { original, refund } = await posApi.refundItems(sale._id, items, refundReason);
      setSale(original);
      onUpdated(original, refund); // pass refund record to parent to add to list
      setRefundQtys({});
      setRefundReason('');
      setShowRefundPanel(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleVoid() {
    if (!voidReason.trim()) return;
    setError('');
    setProcessing(true);
    try {
      const updated = await posApi.voidSale(sale._id, voidReason);
      setSale(updated);
      onUpdated(updated);
      setShowVoidModal(false);
      setVoidReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  function printReceipt() {
    const saleData = sale;
    const w = window.open('', '_blank', 'width=350,height=600');
    if (!w) return;

    const itemsHtml = saleData.items.map(item => `
      <tr>
        <td style="padding: 3px 0;">
          <div style="font-weight: 500;">${item.productName}</div>
          ${item.variantLabel ? `<div style="font-size: 10px; color: #666;">${item.variantLabel}</div>` : ''}
          <div style="font-size: 10px; color: #888;">${item.quantity} × ₦${item.price.toLocaleString()}</div>
        </td>
        <td style="text-align: right; font-weight: 600;">₦${item.total.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${saleData.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; font-size: 12px; color: #111; }
          .header { text-align: center; padding-bottom: 10px; border-bottom: 1px dashed #333; margin-bottom: 10px; }
          .header h1 { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
          .header .receipt-no { font-size: 10px; font-family: monospace; color: #444; margin-top: 4px; }
          .header .date { font-size: 10px; color: #888; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; }
          .totals { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #333; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
          .totals-row.total { font-weight: 700; font-size: 14px; border-top: 2px solid #111; margin-top: 4px; padding-top: 6px; }
          .totals-row.discount { color: #dc2626; }
          .totals-row.change { background: #dcfce7; padding: 4px 8px; border-radius: 4px; margin-top: 4px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; color: #888; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KENTAZ</h1>
          <div class="receipt-no">${saleData.receiptNumber}</div>
          <div class="date">${new Date(saleData.createdAt).toLocaleString()}</div>
        </div>
        <table>${itemsHtml}</table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>₦${saleData.subtotal.toLocaleString()}</span></div>
          ${saleData.discountAmount > 0 ? `<div class="totals-row discount"><span>Discount</span><span>-₦${saleData.discountAmount.toLocaleString()}</span></div>` : ''}
          <div class="totals-row total"><span>TOTAL</span><span>₦${saleData.total.toLocaleString()}</span></div>
          <div class="totals-row"><span>Payment (${saleData.paymentMethod})</span><span>₦${saleData.amountPaid.toLocaleString()}</span></div>
          ${saleData.change > 0 ? `<div class="totals-row change"><span>Change</span><span>₦${saleData.change.toLocaleString()}</span></div>` : ''}
        </div>
        <div class="footer">
          <div>Cashier: ${saleData.cashierName || saleData.cashier?.name}</div>
          <div style="margin-top: 4px;">Thank you for shopping at Kentaz!</div>
        </div>
      </body>
      </html>
    `;

    w.document.write(html);
    w.document.close();
    w.print();
  }

  function printInvoice() {
    const w = window.open('', '_blank', 'width=700,height=900');
    if (!w) return;
    const itemRows = sale.items.map(item => `
      <tr>
        <td>${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatPrice(item.price)}</td>
        <td style="text-align:right">${formatPrice(item.total)}</td>
      </tr>
    `).join('');
    w.document.write(`<html><head><title>Invoice ${sale.receiptNumber}</title><style>
      body{font-family:Arial,sans-serif;font-size:13px;padding:40px;color:#111;max-width:700px;margin:0 auto}
      h1{font-size:28px;margin:0} .header{display:flex;justify-content:space-between;margin-bottom:32px}
      .label{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      th{background:#f5f5f5;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:10px 12px;border-bottom:1px solid #eee}
      .totals td{border:none;padding:6px 12px}
      .total-row td{font-weight:bold;font-size:15px;border-top:2px solid #111;padding-top:12px}
      .footer{margin-top:40px;text-align:center;color:#888;font-size:11px}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="header">
        <div><h1>KENTAZ</h1><div style="color:#666;margin-top:4px">Tax Invoice</div></div>
        <div style="text-align:right">
          <div class="label">Invoice No.</div>
          <div style="font-weight:bold;font-size:16px">${sale.receiptNumber}</div>
          <div style="margin-top:8px" class="label">Date</div>
          <div>${new Date(sale.createdAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })}</div>
        </div>
      </div>
      ${sale.customerName ? `<div style="margin-bottom:24px"><div class="label">Bill To</div><div style="font-weight:600">${sale.customerName}</div>${sale.customerPhone ? `<div style="color:#666">${sale.customerPhone}</div>` : ''}</div>` : ''}
      <div class="label">Cashier: ${sale.cashierName || sale.cashier?.name || ''}</div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tbody class="totals">
          <tr><td colspan="3">Subtotal</td><td style="text-align:right">${formatPrice(sale.subtotal)}</td></tr>
          ${sale.discountAmount > 0 ? `<tr><td colspan="3">Discount${sale.discountType === 'percent' ? ` (${sale.discount}%)` : ''}</td><td style="text-align:right;color:red">-${formatPrice(sale.discountAmount)}</td></tr>` : ''}
          <tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${formatPrice(sale.total)}</td></tr>
        </tbody>
      </table>
      <div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:8px">
        <div class="label">Payment</div>
        <div>${sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)} — ${formatPrice(sale.amountPaid)}${sale.change > 0 ? ` (Change: ${formatPrice(sale.change)})` : ''}</div>
      </div>
      ${sale.notes ? `<div style="margin-top:16px;padding:12px;background:#fffbea;border-radius:8px"><div class="label">Notes</div><div>${sale.notes}</div></div>` : ''}
      <div class="footer"><p>Thank you for shopping at Kentaz!</p></div>
    </body></html>`);
    w.document.close();
    w.print();
  }

  const isRefundRecord = sale.type === 'refund';
  const canRefund = hasPosPermission(currentUser ?? null, POS_PERMS.REFUND)
    && !isRefundRecord
    && sale.status === 'completed'
    && sale.items.some(item => (item.quantity - (item.refundedQty || 0)) > 0);
  const canVoid = hasPosPermission(currentUser ?? null, POS_PERMS.VOID)
    && sale.status === 'completed'
    && sale.type !== 'refund';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Panel header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden">
              <X className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-gray-900 font-mono">{sale.receiptNumber}</h2>
              <StatusBadge status={sale.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(sale.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button onClick={printReceipt} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Printer className="w-3.5 h-3.5" /> Receipt
          </button>
          <button onClick={printInvoice} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <FileText className="w-3.5 h-3.5" /> Invoice
          </button>
          {canRefund && (
            <button
              onClick={() => setShowRefundPanel(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${showRefundPanel ? 'bg-orange-500 text-white' : 'border border-orange-200 text-orange-600 hover:bg-orange-50'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refund
            </button>
          )}
          {canVoid && (
            <button
              onClick={() => setShowVoidModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition"
            >
              <XCircle className="w-3.5 h-3.5" /> Void
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Refund record banner */}
      {isRefundRecord && (
        <div className="mx-5 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm flex items-center gap-2 text-orange-700">
          <RotateCcw className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs">Return / Refund</p>
            {sale.originalSale && (
              <p className="text-xs opacity-80">
                From original sale:{' '}
                <span className="font-mono font-semibold">
                  {typeof sale.originalSale === 'object' ? sale.originalSale.receiptNumber : sale.originalSale}
                </span>
              </p>
            )}
            {sale.notes && <p className="text-xs opacity-70 mt-0.5">{sale.notes}</p>}
          </div>
        </div>
      )}

      {sale.status === 'voided' && !isRefundRecord && (
        <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs">Sale Voided</p>
            {sale.voidReason && <p className="text-xs opacity-80">{sale.voidReason}</p>}
          </div>
        </div>
      )}

      {/* Refund mode banner */}
      {showRefundPanel && (
        <div className="mx-5 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 font-medium flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Select items to refund. Click an item to toggle, adjust quantity with +/−.
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Customer + Cashier */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Customer</p>
            {sale.customerName ? (
              <div>
                <p className="font-semibold text-gray-800">{sale.customerName}</p>
                {sale.customerPhone && <p className="text-xs text-gray-500">{sale.customerPhone}</p>}
              </div>
            ) : <p className="text-gray-400 italic text-xs">Walk-in</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Cashier</p>
            <p className="font-semibold text-gray-800 text-sm">{sale.cashierName || sale.cashier?.name}</p>
            <PayBadge method={sale.paymentMethod} />
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Items ({sale.items.length})</p>
          <div className="space-y-2">
            {sale.items.map((item, idx) => {
              const refundable = item.quantity - (item.refundedQty || 0);
              const isSelected = refundQtys[idx] !== undefined;
              const fullyRefunded = refundable <= 0;

              return (
                <div
                  key={idx}
                  onClick={() => showRefundPanel && toggleItem(idx)}
                  className={`rounded-xl border p-3 transition ${showRefundPanel && !fullyRefunded ? 'cursor-pointer' : ''} ${
                    isSelected ? 'border-orange-400 bg-orange-50' : fullyRefunded ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.variantLabel || 'Default'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${item.total < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {item.total < 0 ? '-' : ''}{formatPrice(Math.abs(item.total))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.quantity} × {item.price < 0 ? '-' : ''}{formatPrice(Math.abs(item.price))}
                      </p>
                    </div>
                  </div>

                  {/* Refund qty selector */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-orange-200 flex items-center justify-between">
                      <p className="text-xs font-semibold text-orange-700">Qty to return:</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); adjustRefundQty(idx, -1); }}
                          className="w-6 h-6 rounded-full border border-orange-300 flex items-center justify-center hover:bg-orange-100"
                        >
                          <Minus className="w-3 h-3 text-orange-600" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-orange-700">{refundQtys[idx]}</span>
                        <button
                          onClick={e => { e.stopPropagation(); adjustRefundQty(idx, 1); }}
                          className="w-6 h-6 rounded-full border border-orange-300 flex items-center justify-center hover:bg-orange-100"
                        >
                          <Plus className="w-3 h-3 text-orange-600" />
                        </button>
                        <span className="text-xs text-gray-400 ml-1">of {refundable}</span>
                      </div>
                    </div>
                  )}
                  {(item.refundedQty || 0) > 0 && (
                    <p className="text-xs text-orange-500 mt-1.5">{item.refundedQty} returned</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Refund reason + confirm */}
        {showRefundPanel && selectedCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-orange-800">Refund {selectedCount} item{selectedCount !== 1 ? 's' : ''}</p>
            <input
              type="text"
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="Reason for refund (optional)"
              className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
            />
            <button
              onClick={handleRefund}
              disabled={processing}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Confirm Refund
            </button>
          </div>
        )}

        {/* Totals */}
        <div className={`rounded-xl p-4 space-y-2 text-sm ${isRefundRecord ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className={sale.subtotal < 0 ? 'text-red-500' : ''}>
              {sale.subtotal < 0 ? '-' : ''}{formatPrice(Math.abs(sale.subtotal))}
            </span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Discount {sale.discountType === 'percent' ? `(${sale.discount}%)` : ''}</span>
              <span>-{formatPrice(sale.discountAmount)}</span>
            </div>
          )}
          <div className={`flex justify-between font-bold text-base pt-2 border-t ${isRefundRecord ? 'border-orange-200 text-red-600' : 'border-gray-200 text-gray-900'}`}>
            <span>{isRefundRecord ? 'Refunded' : 'Total'}</span>
            <span>{sale.total < 0 ? '-' : ''}{formatPrice(Math.abs(sale.total))}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-xs">
            <span>{isRefundRecord ? 'Returned via' : 'Paid'} ({sale.paymentMethod})</span>
            <span className={sale.amountPaid < 0 ? 'text-red-500' : ''}>
              {sale.amountPaid < 0 ? '-' : ''}{formatPrice(Math.abs(sale.amountPaid))}
            </span>
          </div>
          {sale.change > 0 && (
            <div className="flex justify-between text-green-600 text-xs font-medium">
              <span>Change</span><span>{formatPrice(sale.change)}</span>
            </div>
          )}
        </div>

        {sale.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
            <p className="text-xs font-semibold text-amber-600 mb-1">Note</p>
            {sale.notes}
          </div>
        )}
      </div>

      {/* Hidden receipt for printing */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h2>KENTAZ</h2>
          <p>{sale.receiptNumber}</p>
          <p>{new Date(sale.createdAt).toLocaleString('en-NG')}</p>
        </div>
        <div className="line" />
        {sale.customerName && <p>Customer: {sale.customerName}</p>}
        <div className="line" />
        <table>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i}>
                <td>{item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ''}</td>
                <td className="right">{item.quantity}×{formatPrice(item.price)} = {formatPrice(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="line" />
        <table>
          <tbody>
            <tr><td>Subtotal</td><td className="right">{formatPrice(sale.subtotal)}</td></tr>
            {sale.discountAmount > 0 && <tr><td>Discount</td><td className="right">-{formatPrice(sale.discountAmount)}</td></tr>}
            <tr><td className="bold">TOTAL</td><td className="right bold">{formatPrice(sale.total)}</td></tr>
            {sale.change > 0 && <tr><td>Change</td><td className="right">{formatPrice(sale.change)}</td></tr>}
          </tbody>
        </table>
        <div className="line" />
        <p className="center">Cashier: {sale.cashierName || sale.cashier?.name}</p>
        <p className="center">Thank you for shopping at Kentaz!</p>
      </div>

      {/* Void modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-red-600"><XCircle className="w-5 h-5" /> Void Sale</h3>
            <p className="text-sm text-gray-600">This will reverse the sale and restore all stock.</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <input
              type="text"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              placeholder="Reason for voiding..."
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-300"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowVoidModal(false); setError(''); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button
                onClick={handleVoid}
                disabled={!voidReason.trim() || processing}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function PosOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<PosUser | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    async function checkAuth() {
      const u = getPosUser();
      if (!u) { router.replace('/pos/login'); return; }

      const validation = await validatePosToken();
      if (!validation.valid) {
        router.replace('/pos/login');
        return;
      }
      setUser(validation.user || u);
    }
    checkAuth();
  }, [router]);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const data = await posApi.getSales({
        page,
        limit: 25,
        search: search || undefined,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
      });
      setSales(data.sales);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFilter]);

  useEffect(() => { if (user) loadSales(); }, [user, loadSales]);

  // Debounce search
  function handleSearchChange(val: string) {
    setSearchInput(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  }

  function handleSaleClick(sale: Sale) {
    setSelectedSale(sale);
    setShowMobileDetail(true);
  }

  function handleUpdated(updated: Sale, refundRecord?: Sale) {
    setSales(prev => {
      const replaced = prev.map(s => s._id === updated._id ? updated : s);
      // Prepend the new refund record to the list if not already present
      if (refundRecord && !replaced.find(s => s._id === refundRecord._id)) {
        return [refundRecord, ...replaced];
      }
      return replaced;
    });
    setSelectedSale(updated);
  }

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Paid', value: 'completed' },
    { label: 'Voided', value: 'voided' },
  ];

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/pos/sell" className="p-2 rounded-lg hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-sm">Orders</h1>
            <p className="text-gray-400 text-xs">{user.name}</p>
          </div>
        </div>
        <div className="text-gray-400 text-xs">{total} order{total !== 1 ? 's' : ''}</div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Order List ── */}
        <div className="w-full lg:w-[400px] xl:w-[440px] flex flex-col border-r border-gray-200 bg-white flex-shrink-0 overflow-hidden">

          {/* Search + filters */}
          <div className="p-3 space-y-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search receipt #, customer, cashier…"
                className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 flex-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => { setDateFilter(e.target.value); setPage(1); }}
                  className="text-xs text-gray-600 focus:outline-none bg-transparent flex-1"
                />
                {dateFilter && (
                  <button onClick={() => { setDateFilter(''); setPage(1); }}>
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setSearch(''); setSearchInput(''); setDateFilter(''); setStatusFilter(''); setPage(1); }}
                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                title="Clear filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${
                  statusFilter === tab.value
                    ? 'border-[#C9A84C] text-[#C9A84C]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Receipt className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm">No orders found</p>
                {(search || dateFilter || statusFilter) && (
                  <button onClick={() => { setSearch(''); setSearchInput(''); setDateFilter(''); setStatusFilter(''); }} className="text-xs text-[#C9A84C] mt-1">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sales.map(sale => {
                  const isActive = selectedSale?._id === sale._id;
                  const isRefund = sale.type === 'refund';
                  const isVoided = sale.status === 'voided';
                  return (
                    <button
                      key={sale._id}
                      onClick={() => handleSaleClick(sale)}
                      className={`w-full px-4 py-3.5 text-left transition flex items-start gap-3 border-l-4 ${
                        isActive
                          ? isRefund ? 'bg-orange-50 border-orange-400' : 'bg-amber-50 border-[#C9A84C]'
                          : isRefund ? 'hover:bg-orange-50/50 border-transparent' : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isRefund ? 'bg-orange-100' : isVoided ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {isRefund
                          ? <RotateCcw className="w-4 h-4 text-orange-500" />
                          : isVoided
                            ? <XCircle className="w-4 h-4 text-red-500" />
                            : <CheckCircle className="w-4 h-4 text-green-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-bold text-sm font-mono truncate ${isRefund ? 'text-orange-700' : 'text-gray-900'}`}>
                            {sale.receiptNumber}
                          </p>
                          <p className={`text-sm font-black flex-shrink-0 ${
                            isRefund ? 'text-red-500' : isVoided ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}>
                            {sale.total < 0 ? '-' : ''}{formatPrice(Math.abs(sale.total))}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-400 truncate">
                            {isRefund
                              ? <span className="text-orange-500 font-medium">Return</span>
                              : (sale.customerName || <span className="italic">Walk-in</span>)
                            }
                            {' · '}
                            {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                          </p>
                          <PayBadge method={sale.paymentMethod} />
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5">
                          {new Date(sale.createdAt).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Order Detail (desktop) ── */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {selectedSale ? (
            <OrderDetail key={selectedSale._id} sale={selectedSale} onUpdated={handleUpdated} currentUser={user} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-500">Select an order</p>
              <p className="text-sm mt-1">Click an order from the list to view details</p>
            </div>
          )}
        </div>

      </div>

      {/* ── Mobile: Slide-over detail ── */}
      {showMobileDetail && selectedSale && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white">
          <OrderDetail
            key={selectedSale._id}
            sale={selectedSale}
            onClose={() => setShowMobileDetail(false)}
            onUpdated={handleUpdated}
            currentUser={user}
          />
        </div>
      )}
    </div>
  );
}
