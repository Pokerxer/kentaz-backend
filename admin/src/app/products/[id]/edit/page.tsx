'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Tag,
  Package,
  Layers,
  ImagePlus,
  Copy,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Search,
  Check,
  Hash,
  Wand2,
  Image as ImageIcon,
  Star,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { api, Product } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { _id: string; name: string; slug: string; }

interface Variant {
  size: string;
  color: string;
  price: number;
  costPrice: number;
  markup: number;
  useMarkup: boolean;
  stock: number;
  sku: string;
}

const EMPTY_VARIANT: Variant = {
  size: '', color: '', price: 0, costPrice: 0, markup: 0, useMarkup: false, stock: 0, sku: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const popularSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44', '46'];
const popularColors = ['Black', 'White', 'Navy', 'Brown', 'Beige', 'Grey', 'Red', 'Blue', 'Green', 'Gold', 'Pink', 'Purple'];

const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', blue: '#1E40AF', navy: '#1E3A8A',
  red: '#DC2626', tan: '#D2B48C', cognac: '#9A6324', burgundy: '#722F37',
  nude: '#E3BC9A', brown: '#8B4513', pink: '#EC4899', green: '#059669',
  yellow: '#FACC15', purple: '#7C3AED', gray: '#6B7280', grey: '#6B7280',
  silver: '#C0C0C0', gold: '#FFD700', cream: '#FFFDD0', beige: '#F5F5DC',
  orange: '#F97316', emerald: '#10B981', khaki: '#C3B091', camel: '#C19A6B',
  olive: '#808000', teal: '#008080', coral: '#FF6B6B', lavender: '#967BB6',
};
function getColorHex(name: string) { return COLOR_MAP[name.toLowerCase().trim()] || '#9CA3AF'; }
function isLightColor(name: string) { return ['white', 'cream', 'beige', 'nude', 'yellow', 'silver', 'ivory'].some(c => name.toLowerCase().includes(c)); }

const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
  'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400',
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
];

function generateSku(productName: string, variant: Variant, index: number) {
  const base = productName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'SKU';
  const size = variant.size ? variant.size.toUpperCase().slice(0, 3) : '';
  const color = variant.color ? variant.color.toUpperCase().slice(0, 3) : '';
  return [base, size, color, String(index + 1).padStart(2, '0')].filter(Boolean).join('-');
}

function calcMargin(cost: number, price: number) {
  if (!cost || !price || price <= cost) return null;
  return Math.round(((price - cost) / price) * 100);
}

// ─── Variant Builder ──────────────────────────────────────────────────────────
function VariantBuilder({ onGenerate }: { onGenerate: (sizes: string[], colors: string[]) => void; }) {
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const addSize = (val: string) => { const v = val.trim(); if (v && !sizes.includes(v)) setSizes(s => [...s, v]); setSizeInput(''); };
  const addColor = (val: string) => { const v = val.trim(); if (v && !colors.includes(v)) setColors(c => [...c, v]); setColorInput(''); };
  const combos = Math.max(sizes.length > 0 && colors.length > 0 ? sizes.length * colors.length : sizes.length || colors.length || 0, 0);
  if (!open) return (<button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#C9A84C]/40 rounded-xl text-sm text-[#C9A84C] hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 font-medium transition-all w-full justify-center"><Sparkles className="h-4 w-4" /> Generate variants from sizes & colors</button>);
  return (
    <div className="border border-[#C9A84C]/30 bg-amber-50/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#C9A84C]" /> Variant Builder</p><button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button></div>
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sizes</p><div className="flex flex-wrap gap-1.5 mb-2">{sizes.map(s => (<span key={s} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg">{s}<button type="button" onClick={() => setSizes(prev => prev.filter(x => x !== s))} className="hover:text-red-300"><X className="h-3 w-3" /></button></span>))}</div><div className="flex flex-wrap gap-1.5 mb-2">{popularSizes.filter(s => !sizes.includes(s)).map(s => (<button key={s} type="button" onClick={() => addSize(s)} className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors bg-white">+ {s}</button>))}</div><div className="flex gap-2"><input type="text" value={sizeInput} onChange={e => setSizeInput(e.target.value)} placeholder="Custom size…" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(sizeInput); } }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white" /><button type="button" onClick={() => addSize(sizeInput)} disabled={!sizeInput.trim()} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40">Add</button></div></div>
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Colors</p><div className="flex flex-wrap gap-2 mb-2">{colors.map(c => { const hex = getColorHex(c); const light = isLightColor(c); return (<span key={c} className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 border border-gray-200 bg-white rounded-lg text-xs font-medium text-gray-700"><span className={`w-4 h-4 rounded-full border flex-shrink-0 ${light ? 'border-gray-300' : 'border-transparent'}`} style={{ backgroundColor: hex }} />{c}<button type="button" onClick={() => setColors(prev => prev.filter(x => x !== c))} className="hover:text-red-500 ml-0.5"><X className="h-3 w-3" /></button></span>); })}</div><div className="flex flex-wrap gap-1.5 mb-2">{popularColors.filter(c => !colors.includes(c)).map(c => { const hex = getColorHex(c); const light = isLightColor(c); return (<button key={c} type="button" onClick={() => addColor(c)} className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors bg-white"><span className={`w-3 h-3 rounded-full border flex-shrink-0 ${light ? 'border-gray-300' : 'border-transparent'}`} style={{ backgroundColor: hex }} />+ {c}</button>); })}</div><div className="flex gap-2 items-center"><input type="text" value={colorInput} onChange={e => setColorInput(e.target.value)} placeholder="Custom color…" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColor(colorInput); } }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white" />{colorInput.trim() && <span className={`w-7 h-7 rounded-full border flex-shrink-0 ${isLightColor(colorInput) ? 'border-gray-300' : 'border-transparent'}`} style={{ backgroundColor: getColorHex(colorInput) }} />}<button type="button" onClick={() => addColor(colorInput)} disabled={!colorInput.trim()} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40">Add</button></div></div>
      <button type="button" disabled={combos === 0} onClick={() => { onGenerate(sizes, colors); setOpen(false); }} className="w-full py-3 bg-[#C9A84C] text-white rounded-xl text-sm font-bold hover:bg-[#B8953F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"><Layers className="h-4 w-4" />{combos > 0 ? `Generate ${combos} variant${combos !== 1 ? 's' : ''}` : 'Add sizes or colors above'}</button>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionCard({ icon, iconBg, title, subtitle, children }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}>{icon}</div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white transition-all placeholder:text-gray-400';

function CategoryDropdown({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-sm text-left transition-all ${
          open ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/20' : 'border-gray-200 hover:border-gray-300'
        } ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
        <span className="truncate">{selected?.label || 'Select category'}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2.5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input autoFocus type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-4 py-5 text-center text-sm text-gray-400">No categories found</p>
              : filtered.map(o => (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[#C9A84C]/5 transition-colors ${
                    o.value === value ? 'bg-[#C9A84C]/10 text-[#C9A84C] font-medium' : 'text-gray-700'
                  }`}>
                  {o.label}
                  {o.value === value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Variant Row / Card ───────────────────────────────────────────────────────

function VariantRow({ variant, idx, totalVariants, productName, onChange, onDuplicate, onRemove }: {
  variant: Variant; idx: number; totalVariants: number; productName: string;
  onChange: (field: keyof Variant, value: any) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const margin = calcMargin(variant.costPrice, variant.price);

  const handleMarkupToggle = () => {
    const next = !variant.useMarkup;
    onChange('useMarkup', next);
    if (next && variant.costPrice && variant.markup) {
      onChange('price', Math.round(variant.costPrice * (1 + variant.markup / 100)));
    }
  };

  const handleCostOrMarkup = (field: 'costPrice' | 'markup', val: number) => {
    onChange(field, val);
    if (variant.useMarkup) {
      const cost = field === 'costPrice' ? val : variant.costPrice;
      const mkp  = field === 'markup' ? val : variant.markup;
      if (cost && mkp) onChange('price', Math.round(cost * (1 + mkp / 100)));
    }
  };

  const autoSku = () => onChange('sku', generateSku(productName, variant, idx));

  return (
    <>
      {/* Desktop row */}
      <tr className="hidden md:table-row hover:bg-gray-50/50 transition-colors group border-b border-gray-100 last:border-0">
        <td className="px-3 py-3 text-xs text-gray-400 font-mono w-8">{idx + 1}</td>
        <td className="px-3 py-3">
          <div className="flex gap-1.5">
            <input type="text" placeholder="Size" value={variant.size}
              onChange={e => onChange('size', e.target.value)} list={`sz-${idx}`}
              className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white" />
            <datalist id={`sz-${idx}`}>{popularSizes.map(s => <option key={s} value={s} />)}</datalist>
            <input type="text" placeholder="Color" value={variant.color}
              onChange={e => onChange('color', e.target.value)} list={`cl-${idx}`}
              className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white" />
            <datalist id={`cl-${idx}`}>{popularColors.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₦</span>
            <input type="number" min="0" placeholder="0" value={variant.costPrice || ''}
              onChange={e => handleCostOrMarkup('costPrice', parseFloat(e.target.value) || 0)}
              className="w-full pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white" />
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₦</span>
                <input type="number" min="0" placeholder="0" value={variant.price || ''}
                  onChange={e => onChange('price', parseFloat(e.target.value) || 0)}
                  readOnly={variant.useMarkup}
                  className={`w-full pl-6 pr-2 py-2 border rounded-lg text-sm transition-all ${variant.useMarkup ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white'}`} />
              </div>
              <button type="button" onClick={handleMarkupToggle} title={variant.useMarkup ? 'Switch to fixed' : 'Use markup %'}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${variant.useMarkup ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                <Wand2 className="h-3.5 w-3.5" />
              </button>
              {variant.useMarkup && (
                <div className="relative w-16">
                  <input type="number" min="0" placeholder="%" value={variant.markup || ''}
                    onChange={e => handleCostOrMarkup('markup', parseFloat(e.target.value) || 0)}
                    className="w-full pl-2 pr-5 py-2 border border-[#C9A84C]/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 bg-[#C9A84C]/5" />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#C9A84C]">%</span>
                </div>
              )}
            </div>
            {margin !== null && <span className="text-[10px] text-green-600 font-medium">{margin}% margin</span>}
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <input type="text" placeholder="SKU-001" value={variant.sku}
              onChange={e => onChange('sku', e.target.value)}
              className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white font-mono" />
            <button type="button" onClick={autoSku} title="Auto-generate SKU"
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-[#C9A84C] bg-gray-50 hover:bg-[#C9A84C]/10 rounded-lg transition-all">
              <Hash className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={onDuplicate} title="Duplicate"
              className="p-1.5 text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded-lg transition-all">
              <Copy className="h-3.5 w-3.5" />
            </button>
            {totalVariants > 1 && (
              <button type="button" onClick={onRemove} title="Remove"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Mobile card */}
      <div className="md:hidden bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variant {idx + 1}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={onDuplicate}
              className="p-1.5 text-gray-400 hover:text-[#C9A84C] bg-white rounded-lg border border-gray-200 transition-all">
              <Copy className="h-3.5 w-3.5" />
            </button>
            {totalVariants > 1 && (
              <button type="button" onClick={onRemove}
                className="p-1.5 text-gray-400 hover:text-red-500 bg-white rounded-lg border border-gray-200 transition-all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs text-gray-500 mb-1">Size</p>
            <input type="text" placeholder="e.g. M" value={variant.size}
              onChange={e => onChange('size', e.target.value)} list={`msz-${idx}`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]" />
            <datalist id={`msz-${idx}`}>{popularSizes.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Color</p>
            <input type="text" placeholder="e.g. Black" value={variant.color}
              onChange={e => onChange('color', e.target.value)} list={`mcl-${idx}`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]" />
            <datalist id={`mcl-${idx}`}>{popularColors.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs text-gray-500 mb-1">Cost Price</p>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₦</span>
              <input type="number" min="0" placeholder="0" value={variant.costPrice || ''}
                onChange={e => handleCostOrMarkup('costPrice', parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Sale Price</p>
              <button type="button" onClick={handleMarkupToggle}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${variant.useMarkup ? 'bg-[#C9A84C] text-white' : 'bg-gray-200 text-gray-500'}`}>
                {variant.useMarkup ? 'Auto' : 'Fixed'}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₦</span>
              <input type="number" min="0" placeholder="0" value={variant.price || ''}
                readOnly={variant.useMarkup}
                onChange={e => onChange('price', parseFloat(e.target.value) || 0)}
                className={`w-full pl-6 pr-2 py-2 border rounded-lg text-sm transition-all ${variant.useMarkup ? 'bg-gray-100 border-gray-200 text-gray-500' : 'border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-white'}`} />
            </div>
            {margin !== null && <p className="text-[10px] text-green-600 mt-0.5 font-medium">{margin}% margin</p>}
          </div>
        </div>
        {variant.useMarkup && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Markup %</p>
            <div className="relative w-32">
              <input type="number" min="0" placeholder="%" value={variant.markup || ''}
                onChange={e => handleCostOrMarkup('markup', parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-6 py-2 border border-[#C9A84C]/30 rounded-lg text-sm bg-[#C9A84C]/5 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#C9A84C]">%</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs text-gray-500 mb-1">SKU / Barcode</p>
            <div className="flex items-center gap-1.5">
              <input type="text" placeholder="ABC-001" value={variant.sku}
                onChange={e => onChange('sku', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]" />
              <button type="button" onClick={autoSku}
                className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-[#C9A84C] transition-colors">
                <Hash className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    images: [] as string[],
    tags: [] as string[],
    featured: false,
    status: 'draft' as 'draft' | 'published' | 'archived',
  });

  const [variants, setVariants] = useState<Variant[]>([{ ...EMPTY_VARIANT }]);

  // Load product + categories in parallel
  useEffect(() => {
    Promise.all([
      api.categories.getAll(),
      api.products.getById(productId),
    ]).then(([cats, product]) => {
      setCategories((cats as Category[]).filter((c: any) => c.slug !== 'other'));
      const p = product as Product;
      setOriginalProduct(p);
      setFormData({
        name: p.name || '',
        description: p.description || '',
        category: p.category || '',
        subcategory: (p as any).subcategory || '',
        images: p.images?.map((img: any) => img.url) || [],
        tags: p.tags || [],
        featured: p.featured || false,
        status: p.status || 'draft',
      });
      setVariants(
        p.variants?.length > 0
          ? p.variants.map((v: any) => ({
              size: v.size || '',
              color: v.color || '',
              price: v.price || 0,
              costPrice: v.costPrice || 0,
              markup: v.markup || 0,
              useMarkup: v.useMarkup || false,
              stock: v.stock || 0,
              sku: v.sku || '',
            }))
          : [{ ...EMPTY_VARIANT }]
      );
    }).catch(() => {
      setError('Failed to load product');
    }).finally(() => setFetching(false));
  }, [productId]);

  // Track unsaved changes
  useEffect(() => {
    if (!originalProduct) return;
    const orig = originalProduct;
    const changed =
      formData.name !== (orig.name || '') ||
      formData.description !== (orig.description || '') ||
      formData.category !== (orig.category || '') ||
      formData.status !== (orig.status || 'draft') ||
      formData.featured !== (orig.featured || false) ||
      JSON.stringify(formData.images) !== JSON.stringify(orig.images?.map((i: any) => i.url) || []) ||
      JSON.stringify(formData.tags) !== JSON.stringify(orig.tags || []) ||
      JSON.stringify(variants) !== JSON.stringify(
        orig.variants?.map((v: any) => ({
          size: v.size || '', color: v.color || '', price: v.price || 0,
          costPrice: v.costPrice || 0, markup: v.markup || 0,
          useMarkup: v.useMarkup || false, stock: v.stock || 0, sku: v.sku || '',
        })) || []
      );
    setHasChanges(changed);
  }, [formData, variants, originalProduct]);

  const setField = (field: string, value: any) => setFormData(f => ({ ...f, [field]: value }));

  const updateVariant = (idx: number, field: keyof Variant, value: any) =>
    setVariants(vs => vs.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  const addVariant = () => setVariants(vs => [...vs, { ...EMPTY_VARIANT }]);
  const removeVariant = (idx: number) => setVariants(vs => vs.filter((_, i) => i !== idx));
  const duplicateVariant = (idx: number) =>
    setVariants(vs => { const n = [...vs]; n.splice(idx + 1, 0, { ...vs[idx] }); return n; });

  const generateVariants = (sizes: string[], colors: string[]) => {
    const combos: Variant[] = [];
    if (sizes.length > 0 && colors.length > 0) { for (const size of sizes) for (const color of colors) combos.push({ ...EMPTY_VARIANT, size, color }); }
    else if (sizes.length > 0) { for (const size of sizes) combos.push({ ...EMPTY_VARIANT, size }); }
    else if (colors.length > 0) { for (const color of colors) combos.push({ ...EMPTY_VARIANT, color }); }
    if (combos.length > 0) {
      setVariants(prev => {
        const existing = prev.filter(v => v.price > 0 || v.stock > 0 || v.sku);
        const newCombos = combos.filter(c => !existing.some(e => e.size === c.size && e.color === c.color));
        return [...existing, ...newCombos];
      });
    }
  };

  const addImage = (url: string) => {
    if (!formData.images.includes(url) && formData.images.length < 10)
      setField('images', [...formData.images, url]);
  };
  const removeImage = (url: string) => setField('images', formData.images.filter(u => u !== url));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    try {
      for (const file of files) {
        if (formData.images.length >= 10) break;
        const result = await api.upload.image(file);
        addImage(result.url);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !formData.tags.includes(t)) { setField('tags', [...formData.tags, t]); setTagInput(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Product name is required'); return; }
    if (!formData.category) { setError('Please select a category'); return; }
    const validVariants = variants.filter(v => v.price > 0);
    if (validVariants.length === 0) { setError('At least one variant must have a price'); return; }

    setError(null);
    setLoading(true);
    try {
      await api.products.update(productId, {
        ...formData,
        variants: validVariants,
        images: formData.images.map(url => ({ url })),
      });
      setHasChanges(false);
      setSuccess('Product updated!');
      setTimeout(() => router.push('/products'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const priceRange = (() => {
    const prices = variants.map(v => v.price).filter(p => p > 0);
    if (!prices.length) return null;
    const mn = Math.min(...prices), mx = Math.max(...prices);
    return mn === mx ? `₦${mn.toLocaleString()}` : `₦${mn.toLocaleString()} – ₦${mx.toLocaleString()}`;
  })();

  if (fetching) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mx-auto" />
            <p className="text-sm text-gray-400">Loading product…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto pb-28 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C9A84C] transition-colors mb-4 group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Products
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="w-1.5 h-7 bg-[#C9A84C] rounded-full" />
                Edit Product
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 ml-5 truncate max-w-sm">
                {formData.name || 'Unnamed product'}
              </p>
            </div>
            {hasChanges && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-600 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Main content ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Basic Info */}
              <SectionCard
                icon={<Package className="h-4 w-4 text-white" />}
                iconBg="bg-gradient-to-br from-[#C9A84C] to-[#B8953F] shadow-[#C9A84C]/20"
                title="Basic Information"
                subtitle="Name, description, category"
              >
                <div className="space-y-4 pt-1">
                  <div>
                    <FieldLabel required>Product Name</FieldLabel>
                    <input type="text" value={formData.name} onChange={e => setField('name', e.target.value)}
                      placeholder="e.g. Executive Slim Fit Blazer" className={inputCls} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <FieldLabel>Description</FieldLabel>
                      <span className="text-xs text-gray-400">{formData.description.length} chars</span>
                    </div>
                    <textarea value={formData.description} onChange={e => setField('description', e.target.value)}
                      rows={4} placeholder="Describe the product…" className={`${inputCls} resize-none`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Category</FieldLabel>
                      <CategoryDropdown
                        options={categories.map(c => ({ value: c.name, label: c.name }))}
                        value={formData.category}
                        onChange={v => setField('category', v)}
                      />
                    </div>
                    <div>
                      <FieldLabel>Subcategory</FieldLabel>
                      <input
                        type="text"
                        value={formData.subcategory}
                        onChange={e => setField('subcategory', e.target.value)}
                        placeholder="e.g. T-Shirts, Face Cream"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <FieldLabel>Visibility</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {(['draft', 'published'] as const).map(s => (
                          <button key={s} type="button" onClick={() => setField('status', s)}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                              formData.status === s
                                ? s === 'published' ? 'border-green-500 bg-green-50 text-green-700' : 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                            }`}>
                            {s === 'published' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            <span className="capitalize">{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Images */}
              <SectionCard
                icon={<ImagePlus className="h-4 w-4 text-white" />}
                iconBg="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20"
                title="Product Images"
                subtitle={`${formData.images.length} / 10 selected`}
              >
                <div className="space-y-4 pt-1">
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {formData.images.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-100 hover:border-[#C9A84C] transition-all">
                          <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button type="button" onClick={() => removeImage(img)}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                            <X className="h-3 w-3 text-gray-700 hover:text-red-600" />
                          </button>
                          {i === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#C9A84C] text-white text-[10px] font-semibold rounded-md">Cover</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">Quick pick</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {STOCK_IMAGES.map((img, i) => (
                        <button key={i} type="button" onClick={() => addImage(img)}
                          disabled={formData.images.includes(img) || formData.images.length >= 10}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            formData.images.includes(img) ? 'border-[#C9A84C] opacity-60' : 'border-transparent hover:border-[#C9A84C]/50 hover:shadow-md'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          {formData.images.includes(img) && (
                            <div className="absolute inset-0 bg-[#C9A84C]/30 flex items-center justify-center">
                              <CheckCircle className="h-6 w-6 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Upload + URL actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={formData.images.length >= 10}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage || formData.images.length >= 10}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingImage ? 'Uploading…' : 'Upload from device'}
                    </button>

                    {showUrlInput ? (
                      <div className="flex gap-2 w-full">
                        <input autoFocus type="url" placeholder="https://example.com/image.jpg"
                          value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (imageUrlInput.trim()) { addImage(imageUrlInput.trim()); setImageUrlInput(''); setShowUrlInput(false); } } }}
                          className={`${inputCls} flex-1`} />
                        <button type="button"
                          onClick={() => { if (imageUrlInput.trim()) { addImage(imageUrlInput.trim()); setImageUrlInput(''); setShowUrlInput(false); } }}
                          className="px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F]">Add</button>
                        <button type="button" onClick={() => { setShowUrlInput(false); setImageUrlInput(''); }}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowUrlInput(true)}
                        className="flex items-center gap-1.5 text-sm text-[#C9A84C] hover:text-[#B8953F] font-medium transition-colors">
                        <ImageIcon className="h-4 w-4" />
                        Paste image URL
                      </button>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Variants */}
              <SectionCard
                icon={<Layers className="h-4 w-4 text-white" />}
                iconBg="bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20"
                title="Variants & Pricing"
                subtitle={`${variants.length} variant${variants.length !== 1 ? 's' : ''} · ${priceRange || 'No prices set'}`}
              >
                <div className="pt-1 space-y-4">
                  <VariantBuilder onGenerate={generateVariants} />
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Size / Color</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cost Price</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sale Price <span className="text-gray-400 normal-case font-normal">(₦ / auto)</span></th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-3 py-2.5 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, i) => (
                          <VariantRow key={i} variant={v} idx={i} totalVariants={variants.length}
                            productName={formData.name}
                            onChange={(field, val) => updateVariant(i, field, val)}
                            onDuplicate={() => duplicateVariant(i)}
                            onRemove={() => removeVariant(i)} />
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <button type="button" onClick={addVariant}
                        className="flex items-center gap-1.5 text-sm text-[#C9A84C] hover:text-[#B8953F] font-medium transition-colors">
                        <Plus className="h-4 w-4" />Add variant
                      </button>
                    </div>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {variants.map((v, i) => (
                      <VariantRow key={i} variant={v} idx={i} totalVariants={variants.length}
                        productName={formData.name}
                        onChange={(field, val) => updateVariant(i, field, val)}
                        onDuplicate={() => duplicateVariant(i)}
                        onRemove={() => removeVariant(i)} />
                    ))}
                    <button type="button" onClick={addVariant}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#C9A84C]/30 rounded-xl text-sm text-[#C9A84C] hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 transition-all font-medium">
                      <Plus className="h-4 w-4" />Add variant
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-5">

              {/* Save card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Publish</h3>
                  {hasChanges && (
                    <span className="sm:hidden text-xs text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Unsaved
                    </span>
                  )}
                </div>

                <div>
                  <FieldLabel>Status</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(['draft', 'published'] as const).map(s => (
                      <button key={s} type="button" onClick={() => setField('status', s)}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${
                          formData.status === s
                            ? s === 'published' ? 'border-green-500 bg-green-50 text-green-700' : 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {s === 'published' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl cursor-pointer hover:border-amber-200 hover:bg-amber-50/50 transition-all group">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Featured</p>
                      <p className="text-xs text-gray-400">Show on homepage</p>
                    </div>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full p-0.5 transition-all ${formData.featured ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.featured ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                  </div>
                  <input type="checkbox" checked={formData.featured} onChange={e => setField('featured', e.target.checked)} className="sr-only" />
                </label>

                <button type="submit" disabled={loading || !formData.name || !formData.category}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#C9A84C] to-[#B8953F] text-white rounded-xl font-semibold text-sm hover:from-[#B8953F] hover:to-[#A88430] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#C9A84C]/20 hover:-translate-y-0.5 active:translate-y-0">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Changes</>}
                </button>
                <Link href="/products"
                  className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1">
                  Discard changes
                </Link>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-[#C9A84C]" />
                  <h3 className="font-semibold text-gray-900 text-sm">Tags</h3>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {formData.tags.map(tag => (
                      <span key={tag} onClick={() => setField('tags', formData.tags.filter(t => t !== tag))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#C9A84C]/10 text-[#C9A84C] rounded-full text-xs font-medium cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors border border-[#C9A84C]/20 hover:border-red-200">
                        {tag}<X className="h-3 w-3" />
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" placeholder="Add tag…" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className={`${inputCls} flex-1 text-xs py-2`} />
                  <button type="button" onClick={addTag}
                    className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors">
                    Add
                  </button>
                </div>
              </div>

              {/* Live summary */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-[#C9A84C]" />
                  <h3 className="font-semibold text-sm">Summary</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: 'Variants', value: variants.length },
                    { label: 'Total stock', value: variants.reduce((s, v) => s + (v.stock || 0), 0) + ' units' },
                    { label: 'Price range', value: priceRange || '—' },
                    { label: 'Images', value: formData.images.length },
                    { label: 'Tags', value: formData.tags.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky bottom bar (mobile) */}
          <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-xl z-40">
            <Link href="/products"
              className="flex-1 flex items-center justify-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={loading || !formData.name || !formData.category}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm disabled:opacity-50 shadow-lg shadow-[#C9A84C]/30">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
