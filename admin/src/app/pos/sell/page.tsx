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
  DollarSign, TrendingUp, ChevronRight,
} from 'lucide-react';
import { posApi, getPosUser, clearPosSession } from '@/lib/posApi';
import type { PosProduct, PosUser, CartItem, Sale, Register, RegisterReport } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────

function calcChange(total: number, paid: number) {
  return Math.max(0, paid - total);
}

// ── Variant Picker Modal ───────────────────────────────────────

const POS_COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', blue: '#1E40AF', navy: '#1E3A8A',
  red: '#DC2626', tan: '#D2B48C', cognac: '#9A6324', burgundy: '#722F37',
  nude: '#E3BC9A', brown: '#8B4513', pink: '#EC4899', green: '#059669',
  yellow: '#FACC15', purple: '#7C3AED', gray: '#6B7280', grey: '#6B7280',
  silver: '#C0C0C0', gold: '#FFD700', cream: '#FFFDD0', beige: '#F5F5DC',
  orange: '#F97316', emerald: '#10B981', khaki: '#C3B091', camel: '#C19A6B',
  olive: '#808000', teal: '#008080', coral: '#FF6B6B', lavender: '#967BB6',
};
function posColorHex(name: string) { return POS_COLOR_MAP[name.toLowerCase().trim()] || '#9CA3AF'; }
function posIsLight(name: string) { return ['white', 'cream', 'beige', 'nude', 'yellow', 'silver', 'ivory'].some(c => name.toLowerCase().includes(c)); }

function VariantModal({ product, onSelect, onClose }: { product: PosProduct; onSelect: (vi: number) => void; onClose: () => void; }) {
  const variants = product.variants;
  const hasSizes = variants.some(v => v.size);
  const hasColors = variants.some(v => v.color);
  const allSizes = variants.filter(v => v.size).map(v => v.size!);
  const allColors = variants.filter(v => v.color).map(v => v.color!);
  const uniqueSizes = hasSizes ? Array.from(new Set(allSizes)) : [];
  const uniqueColors = hasColors ? Array.from(new Set(allColors)) : [];
  const firstAvailableSize = uniqueSizes.find(s => variants.some(v => v.size === s && (v.stock ?? 0) > 0)) ?? uniqueSizes[0] ?? null;

  const [selectedSize, setSelectedSize] = useState<string | null>(firstAvailableSize);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

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
                  const hex = posColorHex(c);
                  const light = posIsLight(c);
                  return <button key={c} type="button" onClick={() => inStock && setSelectedColor(c)} title={c.charAt(0).toUpperCase() + c.slice(1)} className={`relative w-9 h-9 rounded-full border-2 transition-all ${selected ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : inStock ? light ? 'border-gray-300 hover:border-gray-600' : 'border-transparent hover:border-gray-400' : 'border-gray-200 opacity-40 cursor-not-allowed'}`} style={{ backgroundColor: hex }}>{!inStock && <svg className="absolute inset-0 w-full h-full rounded-full" viewBox="0 0 36 36"><line x1="4" y1="32" x2="32" y2="4" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" /></svg>}</button>;
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
  onComplete,
  onClose,
}: {
  cart: CartItem[];
  preDiscount?: number;
  preCustomerName?: string;
  preCustomerPhone?: string;
  preNotes?: string;
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
  const total = Math.max(0, subtotal - discountAmount);
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
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Cash tendered */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Amount Tendered</label>
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
  function print() { window.print(); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl print:shadow-none print:rounded-none print:max-w-none">
        <div className="print:hidden flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold">Sale Complete!</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        {/* Receipt body */}
        <div id="receipt" className="p-6 space-y-4">
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-black tracking-tight">KENTAZ</h2>
            <p className="text-xs text-gray-500">Point of Sale Receipt</p>
            <p className="text-xs font-mono text-gray-600 mt-1">{sale.receiptNumber}</p>
            <p className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleString()}</p>
          </div>

          {sale.customerName && (
            <div className="text-sm">
              <span className="text-gray-500">Customer: </span>
              <span className="font-medium">{sale.customerName}</span>
              {sale.customerPhone && <span className="text-gray-400"> · {sale.customerPhone}</span>}
            </div>
          )}

          <div className="space-y-2">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div className="flex-1 pr-2">
                  <p className="font-medium text-gray-800">{item.productName}</p>
                  {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                  <p className="text-xs text-gray-500">{item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <span className="font-semibold text-gray-900">{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatPrice(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span><span>-{formatPrice(sale.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>TOTAL</span><span>{formatPrice(sale.total)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment ({sale.paymentMethod})</span><span>{formatPrice(sale.amountPaid)}</span>
            </div>
            {sale.change > 0 && (
              <div className="flex justify-between font-semibold text-green-700">
                <span>Change</span><span>{formatPrice(sale.change)}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-3 text-center text-xs text-gray-400">
            <p>Cashier: {sale.cashierName}</p>
            <p className="mt-1">Thank you for shopping at Kentaz!</p>
          </div>
        </div>

        <div className="print:hidden px-5 pb-5 flex gap-3">
          <button
            onClick={print}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#b8973e] text-white rounded-xl text-sm font-bold transition"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main POS Page ──────────────────────────────────────────────

export default function PosPage() {
  const router = useRouter();
  const [user, setUser] = useState<PosUser | null>(null);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [variantProduct, setVariantProduct] = useState<PosProduct | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState('');
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart extras
  const [selectedCartIdx, setSelectedCartIdx] = useState<number | null>(null);
  const [numpadMode, setNumpadMode] = useState<'qty' | 'price' | 'disc'>('qty');
  const [numpadInput, setNumpadInput] = useState('');
  const [customer, setCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [orderDiscount, setOrderDiscount] = useState(0);
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

  // Auth check + load current register (non-blocking)
  useEffect(() => {
    const u = getPosUser();
    if (!u) { router.replace('/pos/login'); return; }
    setUser(u);
    posApi.getCurrentRegister().then(reg => {
      if (reg) setRegister(reg);
      // No register open — show prompt from menu, not blocking modal
    }).catch(() => {});
  }, [router]);

  // Load products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await posApi.getProducts();
      setProducts(data);
      const cats = ['All', ...Array.from(new Set(data.map(p => p.category))).sort()];
      setCategories(cats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Filtered products
  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Add to cart
  function addToCart(product: PosProduct, variantIndex: number) {
    const variant = product.variants[variantIndex];
    if (!variant || (variant.stock ?? 0) <= 0) return;

    setCart(prev => {
      const existing = prev.findIndex(i => i.product._id === product._id && i.variantIndex === variantIndex);
      if (existing >= 0) {
        const updated = [...prev];
        const maxQty = variant.stock ?? 99;
        updated[existing] = { ...updated[existing], quantity: Math.min(updated[existing].quantity + 1, maxQty) };
        return updated;
      }
      const label = [variant.size, variant.color].filter(Boolean).join(' / ');
      return [...prev, { product, variantIndex, quantity: 1, price: variant.price, variantLabel: label }];
    });
    setVariantProduct(null);
    setMobileView('cart');
  }

  function handleProductClick(product: PosProduct) {
    if (product.variants.length === 0) return;
    const available = product.variants.filter(v => (v.stock ?? 0) > 0);
    if (available.length === 0) return; // all out of stock
    if (product.variants.length === 1) {
      addToCart(product, 0);
    } else {
      setVariantProduct(product);
    }
  }

  function updateQty(idx: number, delta: number) {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[idx];
      const maxQty = item.product.variants[item.variantIndex]?.stock ?? 99;
      const newQty = item.quantity + delta;
      if (newQty <= 0) { updated.splice(idx, 1); return updated; }
      updated[idx] = { ...item, quantity: Math.min(newQty, maxQty) };
      return updated;
    });
  }

  function removeItem(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx));
    if (selectedCartIdx === idx) setSelectedCartIdx(null);
  }

  function selectCartItem(idx: number) {
    setSelectedCartIdx(idx);
    setNumpadInput('');
    if (numpadMode === 'disc') setNumpadMode('qty');
  }

  function pressNumpad(key: string) {
    setNumpadInput(prev => {
      if (key === '⌫') return prev.slice(0, -1);
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
      setOrderDiscount(Math.min(100, Math.max(0, val)));
      return;
    }
    if (selectedCartIdx === null) return;
    setCart(prev => {
      const updated = [...prev];
      const item = updated[selectedCartIdx];
      if (!item) return prev;
      if (numpadMode === 'qty') {
        const qty = Math.max(1, Math.floor(val));
        const maxQty = item.product.variants[item.variantIndex]?.stock ?? 999;
        updated[selectedCartIdx] = { ...item, quantity: Math.min(qty, maxQty) };
      } else {
        updated[selectedCartIdx] = { ...item, price: Math.max(0, val) };
      }
      return updated;
    });
  }, [numpadInput, numpadMode, selectedCartIdx]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = orderDiscount > 0 ? (subtotal * orderDiscount) / 100 : 0;
  const cartTotal = Math.max(0, subtotal - discountAmount);

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
    try {
      const sale = await posApi.createSale({
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
      });
      setCompletedSale(sale);
      setShowPayment(false);
      setCart([]);
      setSelectedCartIdx(null);
      setNumpadInput('');
      setOrderDiscount(0);
      setCustomer(null);
      setOrderNote('');
      loadProducts();
    } catch (err: any) {
      setError(err.message);
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
            <p className="font-bold text-sm leading-none">Kentaz POS</p>
            <p className="text-gray-400 text-xs">{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              <button onClick={() => { setCart([]); setSelectedCartIdx(null); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
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
                  <button onClick={() => setCustomer(null)} className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
                </div>
              )}
              {orderNote && (
                <div className="flex items-center justify-between text-xs text-blue-600">
                  <span className="truncate italic">"{orderNote}"</span>
                  <button onClick={() => setOrderNote('')} className="text-blue-400 hover:text-blue-600 ml-1 flex-shrink-0"><X className="w-3 h-3" /></button>
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
                  const isSelected = selectedCartIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => selectCartItem(idx)}
                      className={`px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition ${isSelected ? 'bg-amber-50 border-l-2 border-[#C9A84C]' : 'hover:bg-gray-50'}`}
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                        {item.product.images[0] ? (
                          <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-sm font-bold text-gray-400">{item.product.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.product.name}</p>
                        {item.variantLabel && <p className="text-[10px] text-gray-400 leading-none mt-0.5">{item.variantLabel}</p>}
                        <p className="text-xs text-[#C9A84C] font-bold mt-0.5">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                        <button
                          onClick={e => { e.stopPropagation(); removeItem(idx); }}
                          className="text-red-400 hover:text-red-600 mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Numpad */}
          <div className="border-t bg-gray-50 flex-shrink-0">
            {/* Mode + display */}
            <div className="flex items-stretch border-b">
              {(['qty', 'price', 'disc'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setNumpadMode(m); setNumpadInput(''); }}
                  className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition border-r last:border-r-0 ${
                    numpadMode === m ? 'bg-[#C9A84C] text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {m === 'disc' ? 'Disc%' : m}
                </button>
              ))}
              <div className="flex-[2] flex items-center justify-end px-3 bg-white">
                <span className="text-lg font-black text-gray-800 font-mono">
                  {numpadInput !== '' ? numpadInput : (
                    selectedCartIdx !== null && numpadMode !== 'disc'
                      ? (numpadMode === 'qty' ? cart[selectedCartIdx]?.quantity : cart[selectedCartIdx]?.price)
                      : numpadMode === 'disc' ? (orderDiscount || '0') : '—'
                  )}
                  {numpadInput !== '' && <span className="text-[#C9A84C] animate-pulse">|</span>}
                </span>
              </div>
            </div>
            {/* Keys */}
            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {['7','8','9','4','5','6','1','2','3','.','0','⌫'].map(key => (
                <button
                  key={key}
                  onClick={() => pressNumpad(key)}
                  className={`py-3 text-base font-bold transition active:scale-95 ${
                    key === '⌫' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {key === '⌫' ? '⌫' : key}
                </button>
              ))}
            </div>
          </div>

          {/* Action + footer */}
          <div className="border-t bg-white flex-shrink-0 p-3 space-y-2.5">
            {/* Action button */}
            <button
              onClick={() => setShowActions(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <Tag className="w-4 h-4" /> Actions
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            </button>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              {orderDiscount > 0 && (
                <div className="flex justify-between text-red-500 text-xs">
                  <span>Discount ({orderDiscount}%)</span><span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base text-gray-900 pt-1 border-t border-gray-100">
                <span>Total</span><span className="text-[#C9A84C]">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0 || processing}
              className="w-full py-3 bg-[#C9A84C] hover:bg-[#b8973e] text-white font-black rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              {processing ? 'Processing…' : `Charge ${formatPrice(cartTotal)}`}
            </button>
          </div>
        </div>

        {/* Products panel */}
        <div className={`${mobileView === 'products' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 overflow-hidden bg-gray-50`}>
          {/* Search + categories */}
          <div className="bg-white border-b px-4 py-3 space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] bg-gray-50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                    <button
                      key={product._id}
                      onClick={() => handleProductClick(product)}
                      disabled={outOfStock}
                      className={`relative bg-white rounded-2xl border-2 text-left overflow-hidden transition group ${
                        outOfStock
                          ? 'opacity-50 cursor-not-allowed border-gray-100'
                          : inCart > 0
                            ? 'border-[#C9A84C] shadow-md'
                            : 'border-gray-100 hover:border-[#C9A84C] hover:shadow-md'
                      }`}
                    >
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
                    </button>
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
          onSelect={vi => addToCart(variantProduct, vi)}
          onClose={() => setVariantProduct(null)}
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
                { icon: <XCircle className="w-5 h-5" />, label: 'Cancel Order', color: 'text-red-600 bg-red-50', action: () => { setCart([]); setSelectedCartIdx(null); setOrderDiscount(0); setOrderNote(''); setShowActions(false); } },
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
                    onClick={() => { setCustomer(null); setShowCustomerModal(false); }}
                    className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => {
                    const name = (document.getElementById('cust-name') as HTMLInputElement).value.trim();
                    const phone = (document.getElementById('cust-phone') as HTMLInputElement).value.trim();
                    if (name) setCustomer({ name, phone });
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
                  onClick={() => { setOrderNote(noteInput); setNoteModal(null); }}
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
                    onClick={handleLogout}
                    className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
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
