'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, ShoppingCart, X, Plus, Minus, Trash2, LogOut,
  CreditCard, Banknote, ArrowLeftRight, ChevronDown,
  Receipt, Printer, CheckCircle, AlertCircle, Loader2,
  Package, History, Users, Tag, LayoutGrid, FileText,
  RefreshCw, XCircle, Gift, ClipboardList, UserPlus,
  Menu, ArrowDownCircle, ArrowUpCircle, Monitor, Lock,
  DollarSign, TrendingUp, ChevronRight, ScanBarcode, Wifi, WifiOff,
} from 'lucide-react';
import { posApi, getPosUser, clearPosSession, hasPosPermission, POS_PERMS, validatePosToken } from '@/lib/posApi';
import type { PosProduct, PosUser, CartItem, Sale, Register, RegisterReport, CreateSaleInput } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { savePendingSale, getPendingSalesCount, cacheProducts, getCachedProducts, decrementCachedStock } from '@/lib/offlineStorage';
import { syncPendingSales, addSyncListener } from '@/lib/syncManager';

// ── Helpers ────────────────────────────────────────────────────

function calcChange(total: number, paid: number) {
  return Math.max(0, paid - total);
}

// ── Variant Picker Modal ───────────────────────────────────────

// Returns true if a hex color is light (needs dark border for visibility)
function isHexLight(hex: string): boolean {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function VariantModal({ product, onSelect, onClose, preselectedVariantIndex }: { product: PosProduct; onSelect: (vi: number) => void; onClose: () => void; preselectedVariantIndex?: number }) {
  const variants = product.variants;
  const hasSizes = variants.some(v => v.size);
  const hasColors = variants.some(v => v.color);
  const allSizes = variants.filter(v => v.size).map(v => v.size!);
  const allColors = variants.filter(v => v.color).map(v => v.color!);
  const uniqueSizes = hasSizes ? Array.from(new Set(allSizes)) : [];
  const uniqueColors = hasColors ? Array.from(new Set(allColors)) : [];

  // Determine initial selection based on preselected variant
  const preselectedVariant = preselectedVariantIndex !== undefined ? variants[preselectedVariantIndex] : null;
  const firstAvailableSize = uniqueSizes.find(s => variants.some(v => v.size === s && (v.stock ?? 0) > 0)) ?? uniqueSizes[0] ?? null;

  // Use preselected variant to set initial size/color
  const initialSize = preselectedVariant?.size ?? firstAvailableSize;
  const initialColor = preselectedVariant?.color ?? null;

  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);

  const sizeColorsAll = variants.filter(v => v.size === selectedSize && v.color).map(v => v.color!);
  const colorsForSize = hasSizes && selectedSize ? Array.from(new Set(sizeColorsAll)) : uniqueColors;

  useEffect(() => {
    const first = colorsForSize.find(c => {
      const v = variants.find(vv => (selectedSize ? vv.size === selectedSize : true) && vv.color === c);
      return v && (v.stock ?? 0) > 0;
    }) ?? colorsForSize[0] ?? null;
    setSelectedColor(first);
  }, [selectedSize]);

  const matchedIdx = variants.findIndex(v => {
    const sizeOk = !hasSizes || !selectedSize || v.size === selectedSize;
    const colorOk = !hasColors || !selectedColor || v.color === selectedColor;
    return sizeOk && colorOk;
  });
  const matched = matchedIdx >= 0 ? variants[matchedIdx] : null;
  const canAdd = matched && (matched.stock ?? 0) > 0;
  const sizeInStock = (s: string) => variants.some(v => v.size === s && (v.stock ?? 0) > 0);
  const colorInStock = (c: string) => { const v = variants.find(vv => (selectedSize ? vv.size === selectedSize : true) && vv.color === c); return v ? (v.stock ?? 0) > 0 : false; };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div><h3 className="font-bold text-gray-900 text-sm">{product.name}</h3><p className="text-xs text-gray-500">Choose a variant to add to cart</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          {hasSizes && uniqueSizes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Size {selectedSize && <span className="ml-1.5 text-gray-900 normal-case font-bold">{selectedSize}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map(s => {
                  const inStock = sizeInStock(s);
                  const selected = selectedSize === s;
                  return <button key={s} type="button" onClick={() => inStock && setSelectedSize(s)} className={`relative px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${selected ? 'border-gray-900 bg-gray-900 text-white' : inStock ? 'border-gray-200 text-gray-700 hover:border-[#C9A84C] hover:bg-amber-50' : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'}`}>{s}{!inStock && <svg className="absolute inset-0 w-full h-full rounded-xl" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="5" y1="95" x2="95" y2="5" stroke="#D1D5DB" strokeWidth="2" /></svg>}</button>;
                })}
              </div>
            </div>
          )}
          {hasColors && colorsForSize.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Color {selectedColor && <span className="ml-1.5 text-gray-900 normal-case font-bold capitalize">{selectedColor}</span>}</p>
              <div className="flex flex-wrap gap-3">
                {colorsForSize.map(c => {
                  const inStock = colorInStock(c);
                  const selected = selectedColor === c;
                  const variantForColor = variants.find(vv => (selectedSize ? vv.size === selectedSize : true) && vv.color === c);
                  const hex = variantForColor?.colorHex || '#9CA3AF';
                  const light = isHexLight(hex);
                  return <button key={c} type="button" onClick={() => inStock && setSelectedColor(c)} title={c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()} className={`relative w-9 h-9 rounded-full border-2 transition-all ${selected ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : inStock ? light ? 'border-gray-300 hover:border-gray-600' : 'border-transparent hover:border-gray-400' : 'border-gray-200 opacity-40 cursor-not-allowed'}`} style={{ backgroundColor: hex }}>{!inStock && <svg className="absolute inset-0 w-full h-full rounded-full" viewBox="0 0 36 36"><line x1="4" y1="32" x2="32" y2="4" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" /></svg>}</button>;
                })}
              </div>
            </div>
          )}
          {matched && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${canAdd ? 'border-[#C9A84C]/40 bg-amber-50/60' : 'border-red-100 bg-red-50/60'}`}>
              <div><p className="text-sm font-semibold text-gray-900">{[matched.size, matched.color].filter(Boolean).join(' · ') || 'Default'}</p>{matched.sku && <p className="text-xs text-gray-400 font-mono">{matched.sku}</p>}</div>
              <div className="text-right"><p className="text-sm font-bold text-gray-900">{formatPrice(matched.price)}</p>{canAdd ? <p className="text-xs text-green-600 font-medium">{matched.stock} in stock</p> : <p className="text-xs text-red-500 font-medium">Out of stock</p>}</div>
            </div>
          )}
          <button onClick={() => canAdd && onSelect(matchedIdx)} disabled={!canAdd} className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${canAdd ? 'bg-gray-900 text-white hover:bg-[#C9A84C] hover:shadow-lg hover:shadow-[#C9A84C]/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{canAdd ? 'Add to Cart' : 'Out of Stock'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Payment Modal ──────────────────────────────────────────────

function PaymentModal({
  cart,
  preDiscount = 0,
  preCustomerName = '',
  preCustomerPhone = '',
  preNotes = '',
  taxRate = 0.075,
  onComplete,
  onClose,
}: {
  cart: CartItem[];
  preDiscount?: number;
  preCustomerName?: string;
  preCustomerPhone?: string;
  preNotes?: string;
  taxRate?: number;
  onComplete: (data: {
    paymentMethod: 'cash' | 'card' | 'transfer';
    discount: number;
    discountType: 'fixed' | 'percent';
    amountPaid: number;
    customerName: string;
    customerPhone: string;
    notes: string;
  }) => void;
  onClose: () => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [discount, setDiscount] = useState(preDiscount > 0 ? String(preDiscount) : '');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>(preDiscount > 0 ? 'percent' : 'fixed');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState(preCustomerName);
  const [customerPhone, setCustomerPhone] = useState(preCustomerPhone);
  const [notes, setNotes] = useState(preNotes);

  const discountAmount = discount
    ? discountType === 'percent'
      ? (subtotal * parseFloat(discount)) / 100
      : parseFloat(discount)
    : 0;
  const preTax = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(preTax * taxRate * 100) / 100;
  const total = parseFloat((preTax + tax).toFixed(2));
  const paid = parseFloat(amountPaid) || 0;
  const change = paymentMethod === 'cash' ? calcChange(total, paid) : 0;
  const canSubmit = paymentMethod !== 'cash' || paid >= total;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900">Checkout</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Payment method */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'transfer'] as const).map(m => {
                const Icon = m === 'cash' ? Banknote : m === 'card' ? CreditCard : ArrowLeftRight;
                return (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition ${
                      paymentMethod === m
                        ? 'border-[#C9A84C] bg-amber-50 text-amber-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Discount</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
              <button
                onClick={() => setDiscountType(t => t === 'fixed' ? 'percent' : 'fixed')}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 min-w-[60px]"
              >
                {discountType === 'fixed' ? '₦' : '%'}
              </button>
            </div>
          </div>

          {/* Totals summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount {discountType === 'percent' ? `(${discount}%)` : ''}</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax (7.5%)</span><span>+{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Cash tendered */}
          {paymentMethod === 'cash' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Tendered</label>
                <button
                  onClick={() => setAmountPaid(String(total))}
                  className="text-xs font-medium text-[#C9A84C] hover:text-[#b8973e] flex items-center gap-1"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Copy Total
                </button>
              </div>
              <input
                type="number"
                min={total}
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder={formatPrice(total)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
              {paid > 0 && (
                <div className="mt-2 flex justify-between text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <span>Change</span><span>{formatPrice(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Customer (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onComplete({
              paymentMethod,
              discount: parseFloat(discount) || 0,
              discountType,
              amountPaid: paymentMethod === 'cash' ? paid : total,
              customerName,
              customerPhone,
              notes,
            })}
            className="flex-2 flex-grow py-3 bg-[#C9A84C] hover:bg-[#b8973e] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition"
          >
            Complete Sale · {formatPrice(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Receipt Modal ──────────────────────────────────────────────

function ReceiptModal({ sale, onClose, onNewSale }: { sale: Sale; onClose: () => void; onNewSale: () => void }) {
  const paymentLabel: Record<string, string> = { cash: 'Cash', card: 'Card', transfer: 'Bank Transfer' };
  const dateStr = new Date(sale.createdAt).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  function print() {
    const logoUrl = window.location.origin + '/logo.png';
    const itemsHtml = sale.items.map(item => `
      <tr>
        <td style="padding:3px 0; border-bottom:1px dotted #000; vertical-align:top;">
          <div class="item-name">${item.productName}</div>
          ${item.variantLabel ? `<div class="item-sub">${item.variantLabel}</div>` : ''}
          <div class="item-sub">${item.quantity} × ₦${item.price.toLocaleString()}</div>
        </td>
        <td class="right">₦${item.total.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt · ${sale.receiptNumber}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          html, body { background:#fff; }
          body {
            font-family: 'Courier New', Courier, monospace;
            color:#000; width:300px; margin:0 auto; padding:8px 6px;
            font-size:13px; line-height:1.45; font-weight:500;
          }
          .logo-wrap { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:3px; }
          .logo-circle { width:34px; height:34px; border-radius:8px; background:#C9A84C; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
          .logo-circle img { width:100%; height:100%; object-fit:contain; padding:3px; }
          .brand { font-size:20px; font-weight:900; letter-spacing:1.5px; color:#000; font-family: 'Segoe UI', Arial, sans-serif; }
          .tagline { font-size:11px; color:#000; text-align:center; margin:2px 0 6px; letter-spacing:1.5px; text-transform:uppercase; font-weight:700; }
          .dash { border:none; border-top:1px dashed #000; margin:6px 0; }
          .dash.solid { border-top:2px solid #000; }
          .receipt-meta { text-align:center; font-size:11px; color:#000; line-height:1.5; font-weight:600; }
          .receipt-meta .rnum { font-size:12px; color:#000; font-weight:700; }
          table { width:100%; border-collapse:collapse; margin:4px 0; }
          table td { padding:3px 0; border-bottom:1px dotted #000; vertical-align:top; font-size:12px; color:#000; }
          table td.right { text-align:right; font-weight:700; white-space:nowrap; }
          .item-name { font-weight:700; font-size:12px; color:#000; }
          .item-sub { font-size:11px; color:#000; margin-top:1px; }
          .totals-section { margin-top:4px; }
          .row { display:flex; justify-content:space-between; align-items:center; padding:2px 0; font-size:12px; color:#000; font-weight:600; }
          .row.discount { font-weight:700; }
          .row.total-row { font-size:15px; font-weight:900; padding:5px 0; border-top:2px solid #000; margin-top:3px; color:#000; }
          .row.payment { font-weight:700; }
          .change-box { border:2px solid #000; border-radius:4px; padding:5px 8px; display:flex; justify-content:space-between; font-size:13px; font-weight:900; color:#000; margin-top:5px; }
          .change-box .lbl { font-weight:700; }
          ${sale.customerName ? `.customer-box { border:1px solid #000; border-radius:4px; padding:5px 8px; font-size:11px; color:#000; margin-bottom:4px; font-weight:600; }` : ''}
          .footer { text-align:center; margin-top:8px; font-size:11px; color:#000; line-height:1.6; font-weight:600; }
          .footer .ty { font-size:13px; font-weight:900; color:#000; letter-spacing:0.3px; }
          .cashier { font-size:11px; color:#000; text-align:center; margin-top:4px; font-weight:700; }
          .shop-info { text-align:center; font-size:10px; color:#000; line-height:1.5; margin-top:4px; font-weight:600; }
          @page { margin:0; size: 80mm auto; }
          @media print {
            body { width:100%; padding:4px; }
            .no-print { display:none !important; }
          }
        </style>
      </head>
      <body>
        <div class="logo-wrap">
          <div class="logo-circle"><img src="${logoUrl}" alt="Kentaz Emporium" onerror="this.parentNode.style.display='none'"></div>
          <span class="brand">Kentaz Emporium</span>
        </div>
        <div class="tagline">Sales Receipt</div>
        <div class="shop-info">
          Suite 35, 911 Mall, Usuma Street, Abuja<br>
          07081856411 &nbsp;·&nbsp; @KENTAZ EMPORIUM
        </div>
        <hr class="dash">
        <div class="receipt-meta">
          <div class="rnum">${sale.receiptNumber}</div>
          <div>${dateStr}</div>
        </div>
        <hr class="dash">
        ${sale.customerName ? `
        <div class="customer-box">
          <strong>${sale.customerName}</strong>${sale.customerPhone ? ` &nbsp;·&nbsp; ${sale.customerPhone}` : ''}
        </div>` : ''}
        <table>${itemsHtml}</table>
        <hr class="dash solid">
        <div class="totals-section">
          <div class="row"><span>Subtotal</span><span>₦${sale.subtotal.toLocaleString()}</span></div>
          ${sale.discountAmount > 0 ? `<div class="row discount"><span>Discount (${sale.discount}${sale.discountType === 'percent' ? '%' : ' off'})</span><span>−₦${sale.discountAmount.toLocaleString()}</span></div>` : ''}
          <div class="row total-row"><span>TOTAL</span><span>₦${sale.total.toLocaleString()}</span></div>
          <div class="row payment"><span>${paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}</span><span>₦${sale.amountPaid.toLocaleString()}</span></div>
          ${sale.change > 0 ? `<div class="change-box"><span class="lbl">CHANGE</span><span>₦${sale.change.toLocaleString()}</span></div>` : ''}
        </div>
        <hr class="dash">
        <div class="footer">
          <div class="ty">Thank you for shopping with us!</div>
          <div>We appreciate your business.</div>
        </div>
        <div class="cashier">Served by: <strong>${sale.cashierName}</strong></div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm">Sale Complete!</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt scroll area */}
        <div className="overflow-y-auto max-h-[70vh]">
          <div id="receipt" className="px-5 py-5 space-y-4 font-[system-ui]">

            {/* Brand header */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                  <img src="/logo.png" alt="Kentaz Emporium" className="w-full h-full object-contain p-0.5" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <span className="text-2xl font-black tracking-widest text-gray-900">Kentaz Emporium</span>
              </div>
              <p className="text-[10px] uppercase tracking-[3px] text-gray-400">Sales Receipt</p>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-300" />

            {/* Meta */}
            <div className="text-center space-y-0.5">
              <p className="font-mono text-xs font-semibold text-gray-600">{sale.receiptNumber}</p>
              <p className="text-xs text-gray-400">{dateStr}</p>
            </div>

            {/* Customer */}
            {sale.customerName && (
              <>
                <div className="border-t border-dashed border-gray-300" />
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">{sale.customerName}</span>
                  {sale.customerPhone && <span className="text-gray-400"> · {sale.customerPhone}</span>}
                </div>
              </>
            )}

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-300" />

            {/* Items */}
            <div className="space-y-3">
              {sale.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{item.productName}</p>
                    {item.variantLabel && <p className="text-[10px] text-gray-400 mt-0.5">{item.variantLabel}</p>}
                    <p className="text-[11px] text-gray-500 mt-0.5">{item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-300" />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatPrice(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-red-500 text-xs">
                  <span>Discount ({sale.discount}{sale.discountType === 'percent' ? '%' : ' off'})</span>
                  <span>−{formatPrice(sale.discountAmount)}</span>
                </div>
              )}
              {(sale.taxAmount ?? 0) > 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Tax (7.5%)</span>
                  <span>+{formatPrice(sale.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-black text-base border-t-2 border-gray-900 pt-2 mt-1">
                <span>TOTAL</span>
                <span className="text-[#C9A84C]">{formatPrice(sale.total)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>{paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}</span>
                <span>{formatPrice(sale.amountPaid)}</span>
              </div>
              {sale.change > 0 && (
                <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 font-semibold text-green-700 text-sm">
                  <span>Change</span><span>{formatPrice(sale.change)}</span>
                </div>
              )}
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-300" />

            {/* Footer */}
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-[#C9A84C] tracking-wide">Thank you for shopping with us!</p>
              <p className="text-[10px] text-gray-400">We appreciate your business.</p>
              <p className="text-[10px] text-gray-400 pt-1">Served by: <span className="font-semibold text-gray-600">{sale.cashierName}</span></p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t flex gap-3 bg-gray-50">
          <button
            onClick={print}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#B8953F] text-white rounded-xl text-sm font-bold transition shadow-md shadow-[#C9A84C]/20"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main POS Page ──────────────────────────────────────────────

// Cart types for multi-cart support
interface CartOrder {
  id: string;
  items: CartItem[];
  customer: { name: string; phone: string } | null;
  note: string;
  discount: number;
  createdAt: Date;
}

export default function PosPage() {
  const router = useRouter();
  const [user, setUser] = useState<PosUser | null>(null);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [carts, setCarts] = useState<CartOrder[]>([]);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [variantProduct, setVariantProduct] = useState<PosProduct | null>(null);
  const [preselectedVariantIdx, setPreselectedVariantIdx] = useState<number | undefined>(undefined);
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState('');
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');
  const searchRef = useRef<HTMLInputElement>(null);
  // Always holds the full unfiltered product list so barcode lookup isn't
  // broken when products state has been replaced by a narrower search result.
  const allProductsRef = useRef<PosProduct[]>([]);
  // Holds the latest barcode-processing function so the global keydown
  // listener (registered once on mount) always calls the current closure.
  const processBarcodeRef = useRef<(barcode: string) => void>(() => {});

  // Offline support
  const { isOnline, wasOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [offlineBanner, setOfflineBanner] = useState<{ type: 'saved' | 'error'; message: string } | null>(null);

  const showOfflineBanner = (type: 'saved' | 'error', message: string) => {
    setOfflineBanner({ type, message });
    setTimeout(() => setOfflineBanner(null), 5000);
  };

  // Check pending sales count
  useEffect(() => {
    let isMounted = true;

    const checkPending = async () => {
      if (typeof window !== 'undefined' && isMounted) {
        const count = await getPendingSalesCount();
        setPendingCount(count);
      }
    };
    checkPending();

    const unsubscribe = addSyncListener(() => {
      if (isMounted) checkPending();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (wasOffline && isOnline && pendingCount > 0) {
      setSyncStatus('syncing');
      syncPendingSales().then(async ({ synced, failed }) => {
        if (failed > 0) {
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 5000);
        } else if (synced > 0) {
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          setSyncStatus('idle');
        }
        // Re-read actual count from DB (don't assume 0)
        const remaining = await getPendingSalesCount();
        setPendingCount(remaining);
        if (synced > 0) loadProducts();
      });
    }
  }, [isOnline, wasOffline]);

  // Keep processBarcodeRef current after every render so the one-time
  // global keydown listener always calls the latest closure.
  useEffect(() => {
    processBarcodeRef.current = (barcode: string) => {
      const match = findVariantByBarcode(barcode);
      if (match) {
        const variant = match.product.variants[match.variantIndex];
        if (variant && (variant.stock ?? 0) > 0) {
          addToCart(match.product, match.variantIndex);
        } else {
          handleProductClick(match.product, match.variantIndex);
        }
      } else {
        // Unknown barcode — show in search bar so staff can see it
        setSearch(barcode);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
  });

  // Global barcode scanner: accumulates keystrokes from the scanner device
  // (which types very fast, < 50 ms per char) and processes without requiring
  // the search input to be focused first.
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flush() {
      const code = buffer;
      buffer = '';
      timer = null;
      if (!code) return;
      if (code.length >= 3) {
        processBarcodeRef.current(code);
      } else {
        setSearch(s => s + code);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const now = Date.now();
      const gap = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Escape') {
        if (timer) { clearTimeout(timer); timer = null; }
        buffer = '';
        return;
      }

      if (e.key === 'Enter') {
        if (timer) { clearTimeout(timer); timer = null; }
        const code = buffer;
        buffer = '';
        if (code.length >= 3) {
          e.preventDefault();
          processBarcodeRef.current(code);
        }
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      if (buffer.length > 0 && gap > 100) {
        // Previous chars were slow (human typing) — flush them to search
        if (timer) { clearTimeout(timer); timer = null; }
        const old = buffer;
        buffer = e.key;
        setSearch(s => s + old);
        requestAnimationFrame(() => searchRef.current?.focus());
      } else {
        buffer += e.key;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 200);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Multi-cart helpers
  function getActiveCart(): CartOrder | undefined {
    return carts.find(c => c.id === activeCartId);
  }

  function getCartIndex(id: string): number {
    return carts.findIndex(c => c.id === id);
  }

  function createNewCart(): string {
    const newCart: CartOrder = {
      id: 'cart_' + Date.now(),
      items: [],
      customer: null,
      note: '',
      discount: 0,
      createdAt: new Date(),
    };
    setCarts(prev => [...prev, newCart]);
    setActiveCartId(newCart.id);
    return newCart.id;
  }

  function setActiveCartItems(items: CartItem[]) {
    if (!activeCartId) return;
    setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, items } : c));
  }

  function setActiveCartCustomer(customer: { name: string; phone: string } | null) {
    if (!activeCartId) return;
    setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, customer } : c));
  }

  function setActiveCartNote(note: string) {
    if (!activeCartId) return;
    setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, note } : c));
  }

  function setActiveCartDiscount(discount: number) {
    if (!activeCartId) return;
    setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, discount } : c));
  }

  function closeCart(cartId: string) {
    setCarts(prev => prev.filter(c => c.id !== cartId));
    if (activeCartId === cartId) {
      setActiveCartId(carts.length > 1 ? carts[0].id : null);
    }
  }

  // Initialize first cart on mount
  useEffect(() => {
    if (carts.length === 0) {
      createNewCart();
    }
  }, []);

  // Cart extras (per-cart)
  const activeCart = getActiveCart();
  const cart = activeCart?.items || [];
  const customer = activeCart?.customer || null;
  const orderNote = activeCart?.note || '';
  const orderDiscount = activeCart?.discount || 0;

  const [selectedCartItemIdx, setSelectedCartItemIdx] = useState<number | null>(null);
  const [numpadMode, setNumpadMode] = useState<'qty' | 'price' | 'disc'>('qty');
  const [numpadInput, setNumpadInput] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [noteModal, setNoteModal] = useState<null | 'general' | 'customer'>(null);
  const [noteInput, setNoteInput] = useState('');

  // Register / Session
  const [register, setRegister] = useState<Register | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<'in' | 'out'>('in');
  const [cashMovementAmount, setCashMovementAmount] = useState('');
  const [cashMovementReason, setCashMovementReason] = useState('');
  const [cashMovementProcessing, setCashMovementProcessing] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closeStep, setCloseStep] = useState<'summary' | 'count' | 'done'>(  'summary');
  const [registerReport, setRegisterReport] = useState<RegisterReport | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [closeProcessing, setCloseProcessing] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Auth check + validate token + load current register (non-blocking)
  useEffect(() => {
    async function checkAuth() {
      const u = getPosUser();
      if (!u) { router.replace('/pos/login'); return; }

      // Validate token
      const validation = await validatePosToken();
      if (!validation.valid) {
        router.replace('/pos/login');
        return;
      }

      setUser(validation.user || u);
      posApi.getCurrentRegister().then(reg => {
        if (reg) setRegister(reg);
      }).catch(() => {});
    }
    checkAuth();
  }, [router]);

  // Debounced search for API call
  const [searchQuery, setSearchQuery] = useState('');

  // Load products with search, falling back to IndexedDB cache when offline
  const loadProducts = useCallback(async (searchTerm: string = '') => {
    setLoadingProducts(true);
    try {
      if (navigator.onLine) {
        const data = await posApi.getProducts(searchTerm ? { search: searchTerm } : undefined);
        setProducts(data);
        const cats = ['All', ...Array.from(new Set(data.map(p => p.category))).sort()];
        setCategories(cats);
        if (!searchTerm) {
          allProductsRef.current = data;
          cacheProducts(data).catch(() => {});
        }
      } else {
        // Offline: use cache, then filter client-side
        const cached = await getCachedProducts();
        const filtered = searchTerm
          ? cached.filter(p =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
              p.variants.some(v => v.sku && v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            )
          : cached;
        setProducts(filtered);
        const cats = ['All', ...Array.from(new Set(filtered.map(p => p.category))).sort()];
        setCategories(cats);
        if (cached.length === 0) setError('No cached products available offline.');
      }
    } catch (err: any) {
      // Network failed while online — try cache as fallback
      try {
        const cached = await getCachedProducts();
        if (cached.length > 0) {
          setProducts(cached);
          const cats = ['All', ...Array.from(new Set(cached.map(p => p.category))).sort()];
          setCategories(cats);
        } else {
          setError(err.message);
        }
      } catch {
        setError(err.message);
      }
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadProducts(searchQuery); }, [searchQuery, loadProducts]);

  // Filtered products — deduplicated by _id, then category + search filtered.
  const filtered = (() => {
    const seen = new Set<string>();
    const searchLower = search.toLowerCase();
    return products.filter(p => {
      if (seen.has(p._id)) return false;
      seen.add(p._id);
      const matchCat = activeCategory === 'All' || activeCategory === 'Favorites' ? true : p.category === activeCategory;
      const matchFavorites = activeCategory !== 'Favorites' || p.isFavorite === true;
      const matchSearch = !search ||
        p.name.toLowerCase().includes(searchLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
        p.variants.some(v => v.sku && v.sku.toLowerCase().includes(searchLower));
      return matchCat && matchFavorites && matchSearch;
    });
  })();

  // Find variant by barcode or SKU — searches the full unfiltered product list
  // so narrowed search results never break a scan.
  function findVariantByBarcode(barcodeOrSku: string): { product: PosProduct; variantIndex: number } | null {
    const searchLower = barcodeOrSku.toLowerCase();
    // Prefer allProductsRef (full list); fall back to current products state
    const pool = allProductsRef.current.length > 0 ? allProductsRef.current : products;
    for (const p of pool) {
      if (p.barcode && p.barcode.toLowerCase() === searchLower) {
        return { product: p, variantIndex: 0 };
      }
      for (let i = 0; i < p.variants.length; i++) {
        const v = p.variants[i];
        if (v.sku && v.sku.toLowerCase() === searchLower) {
          return { product: p, variantIndex: i };
        }
      }
    }
    return null;
  }

  // Add to cart
  function addToCart(product: PosProduct, variantIndex: number) {
    const variant = product.variants[variantIndex];
    if (!variant || (variant.stock ?? 0) <= 0) return;

    const currentItems = getActiveCart()?.items || [];
    const existing = currentItems.findIndex(i => i.product._id === product._id && i.variantIndex === variantIndex);

    let updated: CartItem[];
    if (existing >= 0) {
      updated = [...currentItems];
      const maxQty = variant.stock ?? 99;
      updated[existing] = { ...updated[existing], quantity: Math.min(updated[existing].quantity + 1, maxQty) };
    } else {
      const label = [variant.size, variant.color].filter(Boolean).join(' / ');
      updated = [...currentItems, { product, variantIndex, quantity: 1, price: variant.price, variantLabel: label }];
    }

    setActiveCartItems(updated);
    setVariantProduct(null);
    setMobileView('cart');
  }

  function handleProductClick(product: PosProduct, forceVariantIndex?: number) {
    if (product.variants.length === 0) return;
    const available = product.variants.filter(v => (v.stock ?? 0) > 0);
    if (available.length === 0) return; // all out of stock
    if (typeof forceVariantIndex === 'number') {
      // Show modal with preselected variant (e.g., from barcode scan) so user sees what's being added
      setPreselectedVariantIdx(forceVariantIndex);
      setVariantProduct(product);
    } else if (product.variants.length === 1) {
      addToCart(product, 0);
    } else {
      setPreselectedVariantIdx(undefined);
      setVariantProduct(product);
    }
  }

  function updateQty(idx: number, delta: number) {
    const currentItems = getActiveCart()?.items || [];
    const updated = [...currentItems];
    const item = updated[idx];
    const maxQty = item.product.variants[item.variantIndex]?.stock ?? 99;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { updated.splice(idx, 1); } else { updated[idx] = { ...item, quantity: Math.min(newQty, maxQty) }; }
    setActiveCartItems(updated);
  }

  function removeItem(idx: number) {
    const currentItems = getActiveCart()?.items || [];
    setActiveCartItems(currentItems.filter((_, i) => i !== idx));
    if (selectedCartItemIdx === idx) setSelectedCartItemIdx(null);
  }

  function selectCartItem(idx: number) {
    setSelectedCartItemIdx(idx);
    setNumpadInput('');
    if (numpadMode === 'disc') setNumpadMode('qty');
  }

  function pressNumpad(key: string) {
    setNumpadInput(prev => {
      if (key === '⌫') return prev.slice(0, -1);
      if (key === 'C') return '';
      if (key === '00') return prev === '' ? '0' : prev + '00';
      if (key === '.' && (prev.includes('.') || numpadMode === 'qty')) return prev;
      if (key === '0' && prev === '0') return prev;
      const next = prev === '' && key !== '.' ? key : prev + key;
      return next;
    });
  }

  // Apply numpad value to cart whenever input changes
  useEffect(() => {
    if (numpadInput === '' || numpadInput === '.') return;
    const val = parseFloat(numpadInput);
    if (isNaN(val)) return;

    if (numpadMode === 'disc') {
      setActiveCartDiscount(Math.min(100, Math.max(0, val)));
      return;
    }
    if (selectedCartItemIdx === null) return;
    const currentItems = getActiveCart()?.items || [];
    const updated = [...currentItems];
    const item = updated[selectedCartItemIdx];
    if (!item) return;
    if (numpadMode === 'qty') {
      const qty = Math.max(1, Math.floor(val));
      const maxQty = item.product.variants[item.variantIndex]?.stock ?? 999;
      updated[selectedCartItemIdx] = { ...item, quantity: Math.min(qty, maxQty) };
    } else if (numpadMode === 'price' && hasPosPermission(user, POS_PERMS.PRICE_OVERRIDE)) {
      updated[selectedCartItemIdx] = { ...item, price: Math.max(0, val) };
    }
    setActiveCartItems(updated);
  }, [numpadInput, numpadMode, selectedCartItemIdx]);

  const TAX_RATE = 0.075;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = orderDiscount > 0 ? (subtotal * orderDiscount) / 100 : 0;
  const cartTotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(cartTotal * TAX_RATE * 100) / 100;
  const grandTotal = cartTotal + taxAmount;

  // Build a local receipt + save to queue when offline
  async function saveOfflineSaleAndShowReceipt(saleData: CreateSaleInput, cartItems: CartItem[]) {
    const localId = await savePendingSale(saleData);

    // Decrement stock in the product cache so repeated offline sales see updated stock
    await decrementCachedStock(
      saleData.items.map(i => ({ productId: i.productId, variantIndex: i.variantIndex, quantity: i.quantity }))
    ).catch(() => {});

    // Compute totals locally (mirror server logic)
    const rawSubtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const discAmt = saleData.discountType === 'percent'
      ? Math.round(rawSubtotal * (saleData.discount ?? 0) / 100)
      : (saleData.discount ?? 0);
    const preTax = Math.max(0, rawSubtotal - discAmt);
    const offlineTax = Math.round(preTax * 0.075 * 100) / 100;
    const total = parseFloat((preTax + offlineTax).toFixed(2));
    const paid  = saleData.amountPaid ?? total;

    const mockSale: Sale = {
      _id:           localId,
      receiptNumber: 'OFFLINE-' + Date.now().toString(36).toUpperCase(),
      type:          'sale',
      items: cartItems.map(i => ({
        product:      { _id: i.product._id, name: i.product.name, images: i.product.images },
        productName:  i.product.name,
        variantIndex: i.variantIndex,
        variantLabel: i.variantLabel,
        quantity:     i.quantity,
        price:        i.price,
        costPrice:    0,
        total:        i.price * i.quantity,
        refundedQty:  0,
      })),
      subtotal:       rawSubtotal,
      discount:       saleData.discount ?? 0,
      discountType:   saleData.discountType ?? 'fixed',
      discountAmount: discAmt,
      taxRate:        0.075,
      taxAmount:      offlineTax,
      total,
      paymentMethod:  saleData.paymentMethod,
      amountPaid:     paid,
      change:         Math.max(0, paid - total),
      customerName:   saleData.customerName,
      customerPhone:  saleData.customerPhone,
      notes:          saleData.notes,
      cashier:        { _id: user!._id, name: user!.name, email: user!.email },
      cashierName:    user!.name,
      status:         'completed',
      createdAt:      new Date().toISOString(),
    };

    setPendingCount(prev => prev + 1);
    setShowPayment(false);
    setActiveCartItems([]);
    setSelectedCartItemIdx(null);
    setNumpadInput('');
    setActiveCartDiscount(0);
    setActiveCartCustomer(null);
    setActiveCartNote('');
    setError('');
    setCompletedSale(mockSale);
    loadProducts();
  }

  async function handleCompleteSale(payData: {
    paymentMethod: 'cash' | 'card' | 'transfer';
    discount: number;
    discountType: 'fixed' | 'percent';
    amountPaid: number;
    customerName: string;
    customerPhone: string;
    notes: string;
  }) {
    setProcessing(true);
    setError('');

    const saleData: CreateSaleInput = {
      items: cart.map(i => {
        const variantPrice = i.product.variants[i.variantIndex]?.price;
        return {
          productId: i.product._id,
          variantIndex: i.variantIndex,
          quantity: i.quantity,
          // Only send customPrice if cashier actually changed it
          ...(i.price !== variantPrice ? { customPrice: i.price } : {}),
        };
      }),
      ...payData,
      // Cart-level overrides (pre-filled but can be changed in PaymentModal)
      customerName: payData.customerName || customer?.name || '',
      customerPhone: payData.customerPhone || customer?.phone || '',
      notes: payData.notes || orderNote,
      registerId: register?._id,
    };

    try {
      if (navigator.onLine) {
        // Online: create sale normally
        const sale = await posApi.createSale(saleData);
        setCompletedSale(sale);
        setShowPayment(false);
        setActiveCartItems([]);
        setSelectedCartItemIdx(null);
        setNumpadInput('');
        setActiveCartDiscount(0);
        setActiveCartCustomer(null);
        setActiveCartNote('');
        loadProducts();
      } else {
        // Offline: save to IndexedDB
        await saveOfflineSaleAndShowReceipt(saleData, cart);
      }
    } catch (err: any) {
      // Network failed mid-request — fall back to offline queue
      try {
        await saveOfflineSaleAndShowReceipt(saleData, cart);
      } catch {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleLogout() {
    clearPosSession();
    router.push('/pos/login');
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Print styles */}
      <style>{`@media print { body > *:not(#receipt) { display: none; } #receipt { display: block !important; } }`}</style>

      {/* Offline banner */}
      {offlineBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold transition-all ${offlineBanner.type === 'saved' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
          {offlineBanner.type === 'saved' ? <WifiOff className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {offlineBanner.message}
          <button onClick={() => setOfflineBanner(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMenu(true)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <Menu className="w-4 h-4 text-white" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#C9A84C] flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Kentaz Emporium</p>
            <p className="text-gray-400 text-xs">{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline status indicator */}
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </div>
          ) : syncStatus === 'syncing' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          ) : syncStatus === 'success' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Synced!</span>
            </div>
          ) : syncStatus === 'error' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sync Failed</span>
            </div>
          ) : null}

          {/* Register status badge */}
          <button
            onClick={() => register ? setShowMenu(true) : setShowOpenRegister(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              register
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${register ? 'bg-green-400' : 'bg-amber-400'}`} />
            {register ? 'Register Open' : 'Open Register'}
          </button>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
          <button
            onClick={() => router.push('/pos/sales')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
          >
            <History className="w-4 h-4" /> <span className="hidden sm:inline">Sales</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-500/30 rounded-lg text-sm transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile toggle */}
      <div className="lg:hidden flex bg-white border-b">
        <button
          onClick={() => setMobileView('cart')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition ${mobileView === 'cart' ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]' : 'text-gray-500'}`}
        >
          <ShoppingCart className="w-4 h-4" /> Cart
          {cart.length > 0 && (
            <span className="w-5 h-5 bg-[#C9A84C] text-white text-xs rounded-full flex items-center justify-center">{cart.length}</span>
          )}
        </button>
        <button
          onClick={() => setMobileView('products')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition ${mobileView === 'products' ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]' : 'text-gray-500'}`}
        >
          <Package className="w-4 h-4" /> Products
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Cart panel */}
        <div className={`${mobileView === 'cart' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 xl:w-[360px] bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden`}>

          {/* Cart tabs - multiple orders */}
          {carts.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b overflow-x-auto scrollbar-hide bg-gray-50">
              {carts.map((c, idx) => {
                const itemCount = c.items.length;
                const cartTotal = c.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const isActive = c.id === activeCartId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCartId(c.id)}
                    className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#C9A84C] text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#C9A84C]'
                    }`}
                  >
                    <span className="text-[10px] opacity-70">Order</span>
                    <span className="font-bold">{idx + 1}</span>
                    {itemCount > 0 && (
                      <>
                        <span className="text-[10px] opacity-70">•</span>
                        <span>₦{cartTotal.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                );
              })}
              <button
                onClick={createNewCart}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition"
                title="New Order"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="px-3 py-2.5 border-b flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
            <span className="font-bold text-gray-900 text-sm flex-1">
              Cart {cart.length > 0 && <span className="text-gray-400 font-normal">({cart.length})</span>}
            </span>
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${customer ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              <Users className="w-3.5 h-3.5" />
              {customer ? customer.name.split(' ')[0] : 'Customer'}
            </button>
            {cart.length > 0 && (
              <button onClick={() => { setActiveCartItems([]); setSelectedCartItemIdx(null); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Customer + note strip */}
          {(customer || orderNote) && (
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 space-y-1">
              {customer && (
                <div className="flex items-center justify-between text-xs text-blue-700">
                  <span><span className="font-semibold">{customer.name}</span>{customer.phone && ` · ${customer.phone}`}</span>
                  <button onClick={() => setActiveCartCustomer(null)} className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
                </div>
              )}
              {orderNote && (
                <div className="flex items-center justify-between text-xs text-blue-600">
                  <span className="truncate italic">"{orderNote}"</span>
                  <button onClick={() => setActiveCartNote('')} className="text-blue-400 hover:text-blue-600 ml-1 flex-shrink-0"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-8">
                <ShoppingCart className="w-10 h-10 opacity-20" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs text-gray-300">Tap a product to add it</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cart.map((item, idx) => {
                  const isSelected = selectedCartItemIdx === idx;
                  const maxQty = item.product.variants[item.variantIndex]?.stock ?? 999;
                  return (
                    <div
                      key={idx}
                      onClick={() => selectCartItem(idx)}
                      className={`px-4 py-3 cursor-pointer transition border-b border-gray-100 last:border-b-0 ${isSelected ? 'bg-[#C9A84C]/5 outline outline-2 outline-[#C9A84C] outline-offset-[-2px] rounded-sm' : 'hover:bg-gray-50'}`}
                    >
                      {/* Row 1: name + total */}
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-sm leading-snug flex-1 text-gray-900">
                          {item.product.name}{item.variantLabel ? ` - ${item.variantLabel}` : ''}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            {formatPrice((isSelected && numpadMode === 'price' && numpadInput ? parseFloat(numpadInput) || item.price : item.price) * item.quantity)}
                          </p>
                          <button
                            onClick={e => { e.stopPropagation(); removeItem(idx); }}
                            className="text-gray-300 hover:text-red-500 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Row 2: qty box × unit price / Units */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`border rounded px-2 py-0.5 text-sm font-semibold min-w-[48px] text-center ${
                          isSelected && numpadMode === 'qty'
                            ? 'border-[#C9A84C] bg-white text-[#C9A84C] ring-1 ring-[#C9A84C]/30'
                            : 'border-gray-300 bg-white text-gray-800'
                        }`}>
                          {isSelected && numpadMode === 'qty' && numpadInput ? numpadInput : item.quantity}.00
                        </span>
                        <span className="text-sm text-gray-500">
                          x {formatPrice(isSelected && numpadMode === 'price' && numpadInput ? parseFloat(numpadInput) || item.price : item.price)} / Units
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t px-4 py-3 flex items-center justify-between bg-white flex-shrink-0">
            <span className="font-bold text-gray-900 text-base">Total</span>
            <div className="text-right">
              {orderDiscount > 0 && (
                <p className="text-xs text-red-400 line-through">{formatPrice(subtotal)}</p>
              )}
              <p className="text-[10px] text-gray-400">+ {formatPrice(taxAmount)} tax (7.5%)</p>
              <span className="font-bold text-gray-900 text-base">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* Toolbar: Customer | Internal Note | Actions */}
          <div className="border-t flex items-stretch bg-white flex-shrink-0">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="px-4 py-2.5 text-sm font-medium border-r border-gray-200 hover:bg-gray-50 transition whitespace-nowrap"
            >
              {customer ? <span className="text-[#C9A84C] truncate max-w-[80px] block">{customer.name}</span> : <span className="text-gray-700">Customer</span>}
            </button>
            <input
              type="text"
              placeholder="Internal Note"
              value={orderNote}
              onChange={e => setActiveCartNote(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm text-gray-600 placeholder-gray-400 border-r border-gray-200 focus:outline-none bg-white min-w-0"
            />
            <button
              onClick={() => setShowActions(true)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
            >
              Actions
            </button>
          </div>

          {/* Numpad — only visible when a cart item is selected */}
          {selectedCartItemIdx !== null && (
            <div className="border-t bg-white flex-shrink-0">
              {/* Value display */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {numpadMode === 'qty' ? 'Quantity' : numpadMode === 'price' ? 'Unit Price' : 'Discount %'}
                </span>
                <span className="font-mono text-lg font-bold text-gray-900">
                  {numpadInput !== '' ? (
                    <>{numpadInput}<span className="text-[#C9A84C] animate-pulse">|</span></>
                  ) : numpadMode === 'qty' ? (
                    `${cart[selectedCartItemIdx]?.quantity ?? 1}`
                  ) : numpadMode === 'price' ? (
                    formatPrice(cart[selectedCartItemIdx]?.price ?? 0)
                  ) : (
                    `${orderDiscount}%`
                  )}
                </span>
              </div>
              <div className="grid grid-cols-4 border-b border-gray-100">
                {([
                  { key: '1' }, { key: '2' }, { key: '3' }, { key: 'Qty',   mode: 'qty'   as const },
                  { key: '4' }, { key: '5' }, { key: '6' }, { key: '%',     mode: 'disc'  as const },
                  { key: '7' }, { key: '8' }, { key: '9' }, { key: 'Price', mode: 'price' as const },
                  { key: '+/-' }, { key: '0' }, { key: '.' }, { key: '⌫' },
                ] as { key: string; mode?: 'qty' | 'disc' | 'price' }[]).map(({ key, mode }, i) => {
                  const priceAllowed = hasPosPermission(user, POS_PERMS.PRICE_OVERRIDE);
                  const isMode = mode !== undefined;
                  const isModeActive = isMode && numpadMode === mode;
                  const isDisabled = key === 'Price' && !priceAllowed;
                  return (
                    <button
                      key={i}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        if (isMode) { setNumpadMode(mode!); setNumpadInput(''); return; }
                        if (key === '+/-') {
                          setNumpadInput(prev => prev.startsWith('-') ? prev.slice(1) : prev ? '-' + prev : prev);
                          return;
                        }
                        pressNumpad(key);
                      }}
                      className={`py-3.5 text-sm font-semibold border-b border-r border-gray-100 last:border-r-0 transition active:scale-95 ${
                        isDisabled        ? 'text-gray-300 cursor-not-allowed bg-gray-50' :
                        isModeActive      ? 'bg-[#C9A84C] text-white' :
                        isMode            ? 'bg-white text-gray-700 hover:bg-gray-50' :
                        key === '+/-'     ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                        key === '.'       ? 'bg-rose-50 text-rose-400 hover:bg-rose-100' :
                        key === '⌫'       ? 'bg-red-100 text-red-500 hover:bg-red-200' :
                                            'bg-white text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {key === 'Price' && isDisabled
                        ? <span className="flex items-center justify-center gap-1">Price <Lock className="w-3 h-3" /></span>
                        : key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment button */}
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0 || processing}
            className="w-full py-4 bg-[#C9A84C] hover:bg-[#B8953F] text-white font-bold text-base transition disabled:opacity-40 flex-shrink-0 flex items-center justify-center gap-3 shadow-lg shadow-[#C9A84C]/20"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <>
                <span>Payment</span>
                {cart.length > 0 && <span className="opacity-80 font-normal text-sm">{formatPrice(grandTotal)}</span>}
              </>
            )}
          </button>
        </div>

        {/* Products panel */}
        <div className={`${mobileView === 'products' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 overflow-hidden bg-gray-50`}>
          {/* Search + categories */}
          <div className="bg-white border-b px-4 py-3 space-y-3 flex-shrink-0">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <Search className="w-4 h-4 text-gray-400" />
                <ScanBarcode className="w-4 h-4 text-gray-300" />
              </div>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, barcode, SKU or PLU…"
                className="w-full pl-12 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] bg-gray-50"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && search.length > 0) {
                    // 1. Try in-memory match (works even when products is filtered)
                    const variantMatch = findVariantByBarcode(search);
                    if (variantMatch) {
                      const variant = variantMatch.product.variants[variantMatch.variantIndex];
                      if (variant && (variant.stock ?? 0) > 0) {
                        addToCart(variantMatch.product, variantMatch.variantIndex);
                        setSearch('');
                        return;
                      }
                    }
                    // 2. If single name-search result, add it
                    if (filtered.length === 1) {
                      handleProductClick(filtered[0]);
                      setSearch('');
                      return;
                    }
                    // 3. Barcode/SKU not found in memory — ask the API directly
                    // (handles scans when products list isn't fully loaded yet)
                    try {
                      const results = await posApi.getProducts({ barcode: search });
                      if (results.length === 1) {
                        const p = results[0];
                        // Find which variant matched
                        const vIdx = p.variants.findIndex(v => v.sku && v.sku.toLowerCase() === search.toLowerCase());
                        const resolvedIdx = vIdx >= 0 ? vIdx : 0;
                        const variant = p.variants[resolvedIdx];
                        if (variant && (variant.stock ?? 0) > 0) {
                          // Merge into allProductsRef so future lookups find it
                          if (!allProductsRef.current.find(x => x._id === p._id)) {
                            allProductsRef.current = [...allProductsRef.current, p];
                          }
                          addToCart(p, resolvedIdx);
                          setSearch('');
                        } else if (results.length > 0) {
                          handleProductClick(results[0]);
                          setSearch('');
                        }
                      }
                    } catch {
                      // Network error — leave search text so user can see what was scanned
                    }
                  }
                  if (e.key === 'Escape') {
                    setSearch('');
                    setSearchFocused(false);
                  }
                }}
              />
              {search && (
                <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Search suggestions dropdown */}
              {searchFocused && search.length > 0 && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                  {filtered.slice(0, 6).map((p, idx) => (
                    <div
                      key={p._id}
                      className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
                      onClick={() => { handleProductClick(p); setSearch(''); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {p.images?.[0] ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-400 m-2" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.category} • ₦{p.variants[0]?.price?.toLocaleString()}</div>
                        </div>
                      </div>
                      {p.isFavorite && <span className="text-amber-500 text-sm">★</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Quick tips */}
            {search.length === 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs text-gray-400">
                <span className="flex-shrink-0 flex items-center gap-1"><ScanBarcode className="w-3 h-3" /> Scan barcode</span>
                <span className="flex-shrink-0">•</span>
                <span className="flex-shrink-0">Type SKU/PLU + Enter for quick add</span>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setActiveCategory('Favorites')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 ${
                  activeCategory === 'Favorites'
                    ? 'bg-[#C9A84C] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-sm">★</span> Favorites
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeCategory === cat
                      ? 'bg-[#C9A84C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Product grid */}
          {loadingProducts ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(product => {
                  const prices = product.variants.map(v => v.price);
                  const minPrice = Math.min(...prices);
                  const totalStock = product.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
                  const outOfStock = totalStock <= 0;
                  const inCart = cart.filter(i => i.product._id === product._id).reduce((s, i) => s + i.quantity, 0);

                  return (
                    <div
                      key={product._id}
                      onClick={() => !outOfStock && handleProductClick(product)}
                      role="button"
                      tabIndex={outOfStock ? -1 : 0}
                      onKeyDown={e => { if (!outOfStock && (e.key === 'Enter' || e.key === ' ')) handleProductClick(product); }}
                      className={`relative bg-white rounded-2xl border-2 text-left overflow-hidden transition group ${
                        outOfStock
                          ? 'opacity-50 cursor-not-allowed border-gray-100'
                          : inCart > 0
                            ? 'cursor-pointer border-[#C9A84C] shadow-md'
                            : 'cursor-pointer border-gray-100 hover:border-[#C9A84C] hover:shadow-md'
                      }`}
                    >
                      {/* Favorite button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const result = await posApi.toggleFavorite(product._id);
                            product.isFavorite = result.isFavorite;
                            setProducts([...products]);
                          } catch (err) {
                            console.error('Failed to toggle favorite:', err);
                          }
                        }}
                        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition ${
                          product.isFavorite
                            ? 'bg-yellow-400 text-white'
                            : 'bg-white/80 text-gray-300 hover:text-yellow-400'
                        }`}
                      >
                        <span className="text-sm">{product.isFavorite ? '★' : '☆'}</span>
                      </button>
                      {inCart > 0 && (
                        <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-[#C9A84C] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {inCart}
                        </div>
                      )}
                      <div className="aspect-square bg-gray-50">
                        {product.images[0] ? (
                          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-2xl font-black text-gray-300">{product.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                        <p className="text-xs font-bold text-[#C9A84C] mt-1">{formatPrice(minPrice)}</p>
                        {outOfStock && <p className="text-[10px] text-red-500 font-medium mt-0.5">Out of stock</p>}
                        {!outOfStock && totalStock <= 5 && (
                          <p className="text-[10px] text-amber-500 font-medium mt-0.5">Only {totalStock} left</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      {variantProduct && (
        <VariantModal
          product={variantProduct}
          onSelect={vi => { addToCart(variantProduct, vi); setVariantProduct(null); }}
          onClose={() => setVariantProduct(null)}
          preselectedVariantIndex={preselectedVariantIdx}
        />
      )}

      {showPayment && (
        <PaymentModal
          cart={cart}
          preDiscount={orderDiscount}
          preCustomerName={customer?.name || ''}
          preCustomerPhone={customer?.phone || ''}
          preNotes={orderNote}
          onComplete={handleCompleteSale}
          onClose={() => setShowPayment(false)}
        />
      )}

      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => { setCompletedSale(null); setMobileView('products'); searchRef.current?.focus(); }}
        />
      )}

      {/* Actions sheet */}
      {showActions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowActions(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md shadow-2xl pb-safe" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Order Actions</h3>
              <button onClick={() => setShowActions(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {[
                { icon: <FileText className="w-5 h-5" />, label: 'General Note', color: 'text-blue-600 bg-blue-50', action: () => { setNoteInput(orderNote); setNoteModal('general'); setShowActions(false); } },
                { icon: <Users className="w-5 h-5" />, label: 'Customer Note', color: 'text-purple-600 bg-purple-50', action: () => { setNoteInput(''); setNoteModal('customer'); setShowActions(false); } },
                { icon: <Gift className="w-5 h-5" />, label: 'Add Discount', color: 'text-green-600 bg-green-50', action: () => { setNumpadMode('disc'); setNumpadInput(''); setShowActions(false); setMobileView('cart'); } },
                { icon: <ClipboardList className="w-5 h-5" />, label: 'Quotation', color: 'text-amber-600 bg-amber-50', action: () => { window.print(); setShowActions(false); } },
                { icon: <RefreshCw className="w-5 h-5" />, label: 'Refund', color: 'text-orange-600 bg-orange-50', action: () => { router.push('/pos/sales'); setShowActions(false); } },
                { icon: <XCircle className="w-5 h-5" />, label: 'Cancel Order', color: 'text-red-600 bg-red-50', action: () => { setActiveCartItems([]); setSelectedCartItemIdx(null); setActiveCartDiscount(0); setActiveCartNote(''); setShowActions(false); } },
              ].map(({ icon, label, color, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`flex items-center gap-3 p-4 rounded-2xl ${color} font-medium text-sm transition hover:opacity-80 active:scale-95`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}

      {/* Customer modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500" /> Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name</label>
                <input
                  type="text"
                  defaultValue={customer?.name || ''}
                  id="cust-name"
                  placeholder="Customer name"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                <input
                  type="tel"
                  defaultValue={customer?.phone || ''}
                  id="cust-phone"
                  placeholder="Phone number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                {customer && (
                  <button
                    onClick={() => { setActiveCartCustomer(null); setShowCustomerModal(false); }}
                    className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => {
                    const name = (document.getElementById('cust-name') as HTMLInputElement).value.trim();
                    const phone = (document.getElementById('cust-phone') as HTMLInputElement).value.trim();
                    if (name) setActiveCartCustomer({ name, phone });
                    setShowCustomerModal(false);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  Set Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note modal (general or customer) */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setNoteModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">{noteModal === 'general' ? 'General Note' : 'Customer Note'}</h3>
              <button onClick={() => setNoteModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-400">
                {noteModal === 'general' ? 'Internal note attached to this order.' : 'Note visible to the customer on the receipt.'}
              </p>
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Type a note…"
                rows={3}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setNoteModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => { setActiveCartNote(noteInput); setNoteModal(null); }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Open Register Dialog ── */}
      {showOpenRegister && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowOpenRegister(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#C9A84C]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Open Register</h3>
                  <p className="text-xs text-gray-400">Start your POS session</p>
                </div>
                <button onClick={() => setShowOpenRegister(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {registerError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{registerError}</p>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opening Cash Balance (₦)</label>
                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-lg font-semibold focus:outline-none focus:border-[#C9A84C]"
                />
                <p className="text-xs text-gray-400 mt-1">Enter the cash amount in the drawer right now.</p>
              </div>
              <button
                onClick={async () => {
                  setRegisterError('');
                  try {
                    const reg = await posApi.openRegister(parseFloat(openingBalance) || 0);
                    setRegister(reg);
                    setShowOpenRegister(false);
                  } catch (err: any) {
                    setRegisterError(err.message);
                  }
                }}
                className="w-full py-3 bg-[#C9A84C] hover:bg-[#b8963e] text-white rounded-xl font-semibold text-sm transition"
              >
                Open Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hamburger Menu Panel ── */}
      {showMenu && (
        <div className="fixed inset-0 z-[55] flex" onClick={() => setShowMenu(false)}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Slide-in panel */}
          <div className="relative w-72 bg-gray-900 text-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C] flex items-center justify-center font-bold text-lg">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm">{user?.name}</p>
                  <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
                </div>
                <button onClick={() => setShowMenu(false)} className="ml-auto p-1.5 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {register && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs">
                  <p className="text-green-400 font-semibold">Register Open</p>
                  <p className="text-gray-400">Since {new Date(register.openedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
            </div>

            {/* Menu items */}
            <nav className="flex-1 p-3 space-y-1">
              {[
                {
                  icon: <LayoutGrid className="w-5 h-5 text-[#C9A84C]" />,
                  label: 'Dashboard',
                  sub: 'Sessions & stats',
                  action: () => { router.push('/pos/dashboard'); setShowMenu(false); },
                },
                {
                  icon: <Receipt className="w-5 h-5" />,
                  label: 'Orders',
                  sub: 'View session sales',
                  action: () => { router.push('/pos/sales'); setShowMenu(false); },
                },
                {
                  icon: <Monitor className="w-5 h-5" />,
                  label: 'Backend',
                  sub: 'Go to admin panel',
                  action: () => { window.location.href = '/'; setShowMenu(false); },
                },
                ...(register ? [
                {
                  icon: <ArrowDownCircle className="w-5 h-5 text-green-400" />,
                  label: 'Cash In',
                  sub: 'Add cash to drawer',
                  action: () => {
                    setCashMovementType('in');
                    setCashMovementAmount('');
                    setCashMovementReason('');
                    setRegisterError('');
                    setShowCashMovement(true);
                    setShowMenu(false);
                  },
                },
                {
                  icon: <ArrowUpCircle className="w-5 h-5 text-red-400" />,
                  label: 'Cash Out',
                  sub: 'Remove cash from drawer',
                  action: () => {
                    setCashMovementType('out');
                    setCashMovementAmount('');
                    setCashMovementReason('');
                    setRegisterError('');
                    setShowCashMovement(true);
                    setShowMenu(false);
                  },
                }] : []),
                {
                  icon: register
                    ? <Lock className="w-5 h-5 text-amber-400" />
                    : <DollarSign className="w-5 h-5 text-green-400" />,
                  label: register ? 'Close Register' : 'Open Register',
                  sub: register ? 'End session & Z-Report' : 'Start a new session',
                  action: async () => {
                    if (!register) {
                      setOpeningBalance('');
                      setRegisterError('');
                      setShowOpenRegister(true);
                      setShowMenu(false);
                      return;
                    }
                    setRegisterError('');
                    setCloseStep('summary');
                    setCountedCash('');
                    try {
                      const report = await posApi.getRegisterReport(register._id);
                      setRegisterReport(report);
                      setShowCloseRegister(true);
                      setShowMenu(false);
                    } catch (err: any) {
                      setRegisterError(err.message);
                    }
                  },
                },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition text-left"
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
                </button>
              ))}

              {/* Sync offline sales button */}
              {pendingCount > 0 && (
                <button
                  onClick={async () => {
                    if (!navigator.onLine) {
                      showOfflineBanner('error', 'Cannot sync while offline');
                      return;
                    }
                    setSyncStatus('syncing');
                    const { synced, failed } = await syncPendingSales();
                    const remaining = await getPendingSalesCount();
                    setPendingCount(remaining);
                    if (failed > 0) {
                      setSyncStatus('error');
                      setTimeout(() => setSyncStatus('idle'), 5000);
                    } else {
                      setSyncStatus('success');
                      setTimeout(() => setSyncStatus('idle'), 3000);
                    }
                    setShowMenu(false);
                  }}
                  disabled={syncStatus === 'syncing' || !navigator.onLine}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition text-left disabled:opacity-50"
                >
                  <div className="flex-shrink-0">
                    <RefreshCw className={`w-5 h-5 text-blue-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Sync Offline Sales</p>
                    <p className="text-xs text-gray-400">{pendingCount} pending</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
                </button>
              )}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/20 transition text-left"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cash In / Out Modal ── */}
      {showCashMovement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCashMovement(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                {cashMovementType === 'in'
                  ? <><ArrowDownCircle className="w-5 h-5 text-green-500" /> Cash In</>
                  : <><ArrowUpCircle className="w-5 h-5 text-red-500" /> Cash Out</>
                }
              </h3>
              <button onClick={() => setShowCashMovement(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {registerError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{registerError}</p>}
              {/* Toggle in/out */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  onClick={() => setCashMovementType('in')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition ${cashMovementType === 'in' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Cash In
                </button>
                <button
                  onClick={() => setCashMovementType('out')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition ${cashMovementType === 'out' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Cash Out
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₦)</label>
                <input
                  type="number"
                  min="0.01"
                  value={cashMovementAmount}
                  onChange={e => setCashMovementAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-lg font-semibold focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reason</label>
                <input
                  type="text"
                  value={cashMovementReason}
                  onChange={e => setCashMovementReason(e.target.value)}
                  placeholder={cashMovementType === 'in' ? 'e.g. Float top-up' : 'e.g. Petty cash withdrawal'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCashMovement(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  disabled={cashMovementProcessing || !cashMovementAmount || !cashMovementReason}
                  onClick={async () => {
                    if (!register) return;
                    setRegisterError('');
                    setCashMovementProcessing(true);
                    try {
                      await posApi.recordCashMovement({
                        registerId: register._id,
                        type: cashMovementType,
                        amount: parseFloat(cashMovementAmount),
                        reason: cashMovementReason,
                      });
                      setShowCashMovement(false);
                    } catch (err: any) {
                      setRegisterError(err.message);
                    } finally {
                      setCashMovementProcessing(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#b8963e] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                >
                  {cashMovementProcessing ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Register Modal ── */}
      {showCloseRegister && registerReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Steps header */}
            <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Close Register</h3>
                <p className="text-xs text-gray-400">
                  {closeStep === 'summary' ? 'Session Summary' : closeStep === 'count' ? 'Cash Count' : 'Register Closed'}
                </p>
              </div>
              {closeStep !== 'done' && (
                <button onClick={() => { setShowCloseRegister(false); setCloseStep('summary'); }} className="p-1.5 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {closeStep === 'summary' && (
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Sales', value: registerReport.totalSales, isMoney: false },
                    { label: 'Total Revenue', value: registerReport.totalRevenue, isMoney: true },
                    { label: 'Cash Sales', value: registerReport.totalCash, isMoney: true },
                    { label: 'Card Sales', value: registerReport.totalCard, isMoney: true },
                    { label: 'Transfer Sales', value: registerReport.totalTransfer, isMoney: true },
                    { label: 'Cash In', value: registerReport.totalCashIn, isMoney: true },
                    { label: 'Cash Out', value: registerReport.totalCashOut, isMoney: true },
                    { label: 'Expected Cash', value: registerReport.expectedCash, isMoney: true },
                  ].map(({ label, value, isMoney }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-bold text-gray-900 mt-0.5">
                        {isMoney ? formatPrice(value as number) : value}
                      </p>
                    </div>
                  ))}
                </div>
                {registerReport.movements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cash Movements</p>
                    <div className="space-y-1.5">
                      {registerReport.movements.map(m => (
                        <div key={m._id} className="flex items-center justify-between text-sm py-1.5 px-3 bg-gray-50 rounded-lg">
                          <span className={m.type === 'in' ? 'text-green-600' : 'text-red-500'}>
                            {m.type === 'in' ? '+' : '-'}{formatPrice(m.amount)} — {m.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setCountedCash(String(registerReport.expectedCash)); setCloseStep('count'); }}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition"
                >
                  Next: Count Cash
                </button>
              </div>
            )}

            {closeStep === 'count' && (
              <div className="p-5 space-y-4">
                {registerError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{registerError}</p>}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                  <p className="text-amber-800 font-semibold">Expected cash in drawer</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{formatPrice(registerReport.expectedCash)}</p>
                  <p className="text-xs text-amber-600 mt-1">Opening {formatPrice(registerReport.register.openingBalance)} + Cash sales + Cash in - Cash out</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Counted Cash (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={countedCash}
                    onChange={e => setCountedCash(e.target.value)}
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xl font-bold focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
                {countedCash !== '' && (
                  <div className={`rounded-xl p-3 text-sm font-semibold ${
                    parseFloat(countedCash) === registerReport.expectedCash
                      ? 'bg-green-50 text-green-700'
                      : parseFloat(countedCash) > registerReport.expectedCash
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-red-50 text-red-700'
                  }`}>
                    {parseFloat(countedCash) === registerReport.expectedCash
                      ? 'Perfect — no difference'
                      : parseFloat(countedCash) > registerReport.expectedCash
                        ? `Over by ${formatPrice(parseFloat(countedCash) - registerReport.expectedCash)}`
                        : `Short by ${formatPrice(registerReport.expectedCash - parseFloat(countedCash))}`
                    }
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setCloseStep('summary')} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Back
                  </button>
                  <button
                    disabled={closeProcessing}
                    onClick={async () => {
                      if (!register) return;
                      setRegisterError('');
                      setCloseProcessing(true);
                      try {
                        await posApi.closeRegister({
                          registerId: register._id,
                          closingBalance: parseFloat(countedCash) || registerReport.expectedCash,
                        });
                        setRegister(null);
                        setCloseStep('done');
                      } catch (err: any) {
                        setRegisterError(err.message);
                      } finally {
                        setCloseProcessing(false);
                      }
                    }}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                  >
                    {closeProcessing ? 'Closing…' : 'Close Register'}
                  </button>
                </div>
              </div>
            )}

            {closeStep === 'done' && (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Register Closed</h4>
                  <p className="text-sm text-gray-500 mt-1">Your session has been closed successfully.</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Sales</span>
                    <span className="font-semibold">{registerReport.totalSales}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Revenue</span>
                    <span className="font-semibold">{formatPrice(registerReport.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Counted Cash</span>
                    <span className="font-semibold">{formatPrice(parseFloat(countedCash) || registerReport.expectedCash)}</span>
                  </div>
                  <div className={`flex justify-between font-bold pt-1 border-t border-gray-200 ${
                    parseFloat(countedCash) >= registerReport.expectedCash ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Difference</span>
                    <span>{formatPrice(Math.abs(parseFloat(countedCash) - registerReport.expectedCash))}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print Z-Report
                  </button>
                  <button
                    onClick={() => router.push('/pos/dashboard')}
                    className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 flex items-center justify-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" /> Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
