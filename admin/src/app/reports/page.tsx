'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  api,
  ReportSalesData, ReportProductsData, ReportOrdersData,
  ReportCustomersData, ReportInventoryData, ReportStaffData,
  ReportPurchasesData,
} from '@/lib/api';
import {
  BarChart3, Package, ShoppingCart, Users, Box, UserCog,
  ShoppingBag, Download, RefreshCw, Loader2, AlertCircle,
  TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown,
  Filter, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helpers ────────────────────────────────────────────────────

type ReportType = 'sales' | 'products' | 'orders' | 'customers' | 'inventory' | 'staff' | 'purchases';

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtPeriod(key: string, groupBy: string) {
  if (groupBy === 'month') {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1, 1).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
  }
  return new Date(key + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function exportCSV(headers: string[], rows: (string | number | null)[][], filename: string) {
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Date presets ───────────────────────────────────────────────

type Preset = { label: string; apply: () => [string, string] };

const PRESETS: Preset[] = [
  { label: 'Today',       apply: () => { const d = toDateInput(new Date()); return [d, d]; } },
  { label: 'Last 7D',     apply: () => { const t = new Date(), f = new Date(); f.setDate(f.getDate() - 6); return [toDateInput(f), toDateInput(t)]; } },
  { label: 'Last 30D',    apply: () => { const t = new Date(), f = new Date(); f.setDate(f.getDate() - 29); return [toDateInput(f), toDateInput(t)]; } },
  { label: 'This Month',  apply: () => { const n = new Date(); return [toDateInput(new Date(n.getFullYear(), n.getMonth(), 1)), toDateInput(new Date())]; } },
  { label: 'Last Month',  apply: () => { const n = new Date(); return [toDateInput(new Date(n.getFullYear(), n.getMonth() - 1, 1)), toDateInput(new Date(n.getFullYear(), n.getMonth(), 0))]; } },
  { label: 'Last 3M',     apply: () => { const t = new Date(), f = new Date(); f.setMonth(f.getMonth() - 3); return [toDateInput(f), toDateInput(t)]; } },
  { label: 'This Year',   apply: () => { const n = new Date(); return [toDateInput(new Date(n.getFullYear(), 0, 1)), toDateInput(new Date())]; } },
];

// ── Sort hook ──────────────────────────────────────────────────

function useSortable<T>(data: T[]) {
  const [field, setField] = useState<keyof T | null>(null);
  const [dir,   setDir]   = useState<'asc' | 'desc'>('desc');

  const sort = (f: keyof T) => {
    if (field === f) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setField(f); setDir('desc'); }
  };

  const sorted = field === null ? data : [...data].sort((a, b) => {
    const av = a[field], bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });

  return { sorted, sort, field, dir };
}

// ── Sub-components ─────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl overflow-hidden ${className}`}>
      <div className="h-full w-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-shimmer bg-[length:200%_100%] skeleton-shimmer" />
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string;
  accent?: 'green' | 'red' | 'amber';
}) {
  const accentMap = {
    green: 'from-emerald-500/5 to-emerald-500/10 border-emerald-200',
    red: 'from-red-500/5 to-red-500/10 border-red-200',
    amber: 'from-amber-500/5 to-amber-500/10 border-amber-200',
  };
  const textMap = {
    green: 'text-emerald-600',
    red: 'text-red-500',
    amber: 'text-amber-600',
  };
  const valueColor = accent ? textMap[accent] : 'text-gray-900';
  const gradientClass = accent ? accentMap[accent] : 'from-gray-500/5 to-gray-500/10 border-gray-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px -10px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border ${gradientClass} p-4 relative overflow-hidden`}
    >
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30 ${accent === 'green' ? 'bg-emerald-400' : accent === 'red' ? 'bg-red-400' : accent === 'amber' ? 'bg-amber-400' : 'bg-gray-400'}`} />
      <p className="text-xs text-gray-500 mb-1 relative z-10">{label}</p>
      <p className={`text-xl font-bold ${valueColor} relative z-10 tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 relative z-10">{sub}</p>}
    </motion.div>
  );
}

function SortTh({ label, field, sortField, sortDir, onSort, className = '' }: {
  label: string; field: string; sortField: any; sortDir: string;
  onSort: (f: any) => void; className?: string;
}) {
  const active = sortField === field;
  return (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap transition-colors ${className} ${active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <motion.span
          initial={false}
          animate={{ opacity: active ? 1 : 0.3 }}
          transition={{ duration: 0.15 }}
        >
          {active
            ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
            : <ChevronsUpDown className="w-3 h-3" />}
        </motion.span>
      </span>
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:    'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100   text-blue-700',
    shipped:    'bg-purple-100 text-purple-700',
    delivered:  'bg-green-100  text-green-700',
    cancelled:  'bg-red-100    text-red-700',
    received:   'bg-green-100  text-green-700',
    out:        'bg-red-100    text-red-700',
    low:        'bg-amber-100  text-amber-700',
    ok:         'bg-emerald-100 text-emerald-700',
    confirmed:  'bg-blue-100   text-blue-700',
    completed:  'bg-green-100  text-green-700',
  };
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status.replace(/_/g, ' ')}
    </motion.span>
  );
}

// ── Status picker ──────────────────────────────────────────────

type StatusOption = { value: string; label: string; color: string; dot: string };

const ORDER_STATUS_OPTIONS: StatusOption[] = [
  { value: '',           label: 'All Statuses',   color: 'text-gray-600',    dot: 'bg-gray-400'    },
  { value: 'pending',    label: 'Pending',         color: 'text-yellow-700',  dot: 'bg-yellow-400'  },
  { value: 'processing', label: 'Processing',      color: 'text-blue-700',    dot: 'bg-blue-500'    },
  { value: 'shipped',    label: 'Shipped',         color: 'text-purple-700',  dot: 'bg-purple-500'  },
  { value: 'delivered',  label: 'Delivered',       color: 'text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'cancelled',  label: 'Cancelled',       color: 'text-red-700',     dot: 'bg-red-500'     },
];

const INV_FILTER_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All Products',    color: 'text-gray-600',    dot: 'bg-gray-400'    },
  { value: 'low', label: 'Low Stock (≤5)',  color: 'text-amber-700',   dot: 'bg-amber-400'   },
  { value: 'out', label: 'Out of Stock',    color: 'text-red-700',     dot: 'bg-red-500'     },
];

function StatusPicker({ label, value, options, onChange }: {
  label: string; value: string;
  options: StatusOption[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] min-w-[168px] transition-colors"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`} />
        <span className={`flex-1 text-left font-medium ${selected.color}`}>{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 w-full bg-white rounded-xl border border-gray-100 shadow-xl shadow-gray-200/60 py-1 overflow-hidden">
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${active ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                <span className={`flex-1 text-left ${opt.color} font-medium`}>{opt.label}</span>
                {active && <span className="text-[#C9A84C] text-xs font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-4 max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search…"
        className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
      />
    </div>
  );
}

// ── Tfoot helpers ──────────────────────────────────────────────

const TF = 'px-3 py-2.5 text-xs font-semibold text-gray-700';
const TFR = TF + ' text-right';

// ── Report tables ──────────────────────────────────────────────

function SalesTable({ data }: { data: ReportSalesData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() =>
    q ? data.rows.filter(r => r.period.includes(q)) : data.rows
  , [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Total Revenue"    value={fmt(s.totalRevenue)} sub={`${s.totalCount} transactions`} />
        <KpiCard label="Net Revenue"      value={fmt(s.netRevenue)} accent="green" />
        <KpiCard label="Online Revenue"   value={fmt(s.onlineRevenue)} sub={`${s.onlineCount} orders`} />
        <KpiCard label="POS Revenue"      value={fmt(s.posRevenue)} sub={`${s.posCount} sales`} />
        <KpiCard label="POS Refunds"      value={fmt(s.posRefundAmount)} sub={`${s.posRefundCount} refunds`} accent="red" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <SortTh label="Period"         field="period"          sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Online Orders"  field="onlineCount"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Online Revenue" field="onlineRevenue"   sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="POS Sales"      field="posCount"        sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="POS Revenue"    field="posRevenue"      sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Refunds"        field="posRefundCount"  sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Refund Amt"     field="posRefundAmount" sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total Orders"   field="totalCount"      sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total Revenue"  field="totalRevenue"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Net Revenue"    field="netRevenue"      sortField={field} sortDir={dir} onSort={sort} className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2.5 font-medium text-gray-700">{fmtPeriod(row.period, data.groupBy)}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{row.onlineCount}</td>
                <td className="px-3 py-2.5 text-right">{fmt(row.onlineRevenue)}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{row.posCount}</td>
                <td className="px-3 py-2.5 text-right">{fmt(row.posRevenue)}</td>
                <td className="px-3 py-2.5 text-right text-red-400">{row.posRefundCount || '—'}</td>
                <td className="px-3 py-2.5 text-right text-red-500">{row.posRefundAmount > 0 ? fmt(row.posRefundAmount) : '—'}</td>
                <td className="px-3 py-2.5 text-right font-medium">{row.totalCount}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(row.totalRevenue)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{fmt(row.netRevenue)}</td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td className={TF}>Totals</td>
              <td className={TFR}>{s.onlineCount}</td>
              <td className={TFR}>{fmt(s.onlineRevenue)}</td>
              <td className={TFR}>{s.posCount}</td>
              <td className={TFR}>{fmt(s.posRevenue)}</td>
              <td className={TFR + ' text-red-400'}>{s.posRefundCount}</td>
              <td className={TFR + ' text-red-500'}>{fmt(s.posRefundAmount)}</td>
              <td className={TFR}>{s.totalCount}</td>
              <td className={TFR}>{fmt(s.totalRevenue)}</td>
              <td className={TFR + ' text-emerald-600'}>{fmt(s.netRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function ProductsTable({ data }: { data: ReportProductsData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() => {
    if (!q) return data.rows;
    const lq = q.toLowerCase();
    return data.rows.filter(r => r.name.toLowerCase().includes(lq) || (r.category || '').toLowerCase().includes(lq));
  }, [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Products Sold"  value={data.rows.length.toLocaleString()} sub={`${s.totalQty} units`} />
        <KpiCard label="Total Revenue"  value={fmt(s.totalRevenue)} />
        <KpiCard label="Gross Profit"   value={fmt(s.grossProfit)} accent={s.grossProfit >= 0 ? 'green' : 'red'} />
        <KpiCard label="Net Qty Sold"   value={s.netQty.toLocaleString()} sub="after refunds" />
        <KpiCard label="Avg Margin"     value={s.marginPct != null ? `${s.marginPct}%` : '—'} accent="amber" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
              <SortTh label="Product"       field="name"             sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Category"      field="category"         sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="POS Qty"       field="posQty"           sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="POS Revenue"   field="posRevenue"       sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Online Qty"    field="onlineQty"        sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Online Rev"    field="onlineRevenue"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total Qty"     field="totalQty"         sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Refunded"      field="posRefundedQty"   sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Net Qty"       field="netQty"           sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total Revenue" field="totalRevenue"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Gross Profit"  field="grossProfit"      sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Margin %"      field="marginPct"        sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Stock"         field="currentStock"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={row._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2 text-xs text-gray-300 font-bold">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {row.image
                      ? <img src={row.image} alt={row.name} className="w-7 h-7 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                      : <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0" />}
                    <span className="font-medium text-gray-800 truncate max-w-[160px]">{row.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{row.category || '—'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{row.posQty}</td>
                <td className="px-3 py-2 text-right">{fmt(row.posRevenue)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{row.onlineQty}</td>
                <td className="px-3 py-2 text-right">{fmt(row.onlineRevenue)}</td>
                <td className="px-3 py-2 text-right font-medium">{row.totalQty}</td>
                <td className="px-3 py-2 text-right text-red-400">{row.posRefundedQty > 0 ? row.posRefundedQty : '—'}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-600">{row.netQty}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(row.totalRevenue)}</td>
                <td className="px-3 py-2 text-right">
                  <span className={row.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(row.grossProfit)}</span>
                </td>
                <td className="px-3 py-2 text-right text-amber-600">
                  {row.marginPct != null ? `${row.marginPct}%` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {row.currentStock != null ? row.currentStock : '—'}
                </td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td colSpan={7} className={TF}>Totals</td>
              <td className={TFR}>{s.totalQty}</td>
              <td className={TFR + ' text-red-400'}>—</td>
              <td className={TFR + ' text-emerald-600'}>{s.netQty}</td>
              <td className={TFR}>{fmt(s.totalRevenue)}</td>
              <td className={TFR + (s.grossProfit >= 0 ? ' text-emerald-600' : ' text-red-500')}>{fmt(s.grossProfit)}</td>
              <td className={TFR + ' text-amber-600'}>{s.marginPct != null ? `${s.marginPct}%` : '—'}</td>
              <td className={TFR}>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function OrdersTable({ data }: { data: ReportOrdersData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() => {
    if (!q) return data.rows;
    const lq = q.toLowerCase();
    return data.rows.filter(r =>
      r.ref.toLowerCase().includes(lq) ||
      r.customerName.toLowerCase().includes(lq) ||
      r.customerEmail.toLowerCase().includes(lq) ||
      r.status.toLowerCase().includes(lq)
    );
  }, [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Total Orders"    value={s.count.toLocaleString()} />
        <KpiCard label="Revenue"         value={fmt(s.revenue)} sub="non-cancelled" />
        <KpiCard label="Avg Order Value" value={fmt(s.avgOrder)} />
        <KpiCard label="Delivered"       value={s.deliveredCount.toLocaleString()} accent="green" />
        <KpiCard label="Cancelled"       value={s.cancelledCount.toLocaleString()} accent="red" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <SortTh label="Order #"    field="ref"           sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Customer"   field="customerName"  sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Date"       field="date"          sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Location"   field="shippingState" sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Items"      field="itemCount"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total"      field="total"         sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Status"     field="status"        sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Payment"    field="paymentStatus" sortField={field} sortDir={dir} onSort={sort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={row._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">#{row.ref}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-gray-800">{row.customerName}</p>
                  <p className="text-xs text-gray-400">{row.customerEmail}</p>
                </td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500">
                  {[row.shippingCity, row.shippingState].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500">{row.itemCount}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(row.total)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{row.paymentStatus}</td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className={TF}>Totals · {s.count} orders</td>
              <td className={TFR}></td>
              <td className={TFR}>{fmt(s.revenue)}</td>
              <td colSpan={2} className={TF}>
                <span className="text-emerald-600">{s.deliveredCount} delivered</span>
                {' · '}
                <span className="text-red-500">{s.cancelledCount} cancelled</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function CustomersTable({ data }: { data: ReportCustomersData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() => {
    if (!q) return data.rows;
    const lq = q.toLowerCase();
    return data.rows.filter(r => r.name.toLowerCase().includes(lq) || r.email.toLowerCase().includes(lq));
  }, [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Customers"         value={s.count.toLocaleString()} />
        <KpiCard label="Total Revenue"     value={fmt(s.totalRevenue)} />
        <KpiCard label="Avg Spend"         value={fmt(s.avgSpend)} />
        <KpiCard label="Repeat Customers"  value={s.repeatCount.toLocaleString()} accent="green" sub="2+ orders" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
              <SortTh label="Customer"    field="name"           sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Joined"      field="joined"         sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Orders"      field="orderCount"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Cancelled"   field="cancelledCount" sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total Spent" field="totalSpent"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Avg Order"   field="avgOrder"       sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Last Order"  field="lastOrder"      sortField={field} sortDir={dir} onSort={sort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={row._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2 text-xs font-bold text-gray-300">{i + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-800">{row.name}</p>
                  <p className="text-xs text-gray-400">{row.email}</p>
                </td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.joined ? fmtDate(row.joined) : '—'}</td>
                <td className="px-3 py-2 text-right font-medium">{row.orderCount}</td>
                <td className="px-3 py-2 text-right text-red-400">{row.cancelledCount > 0 ? row.cancelledCount : '—'}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(row.totalSpent)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmt(row.avgOrder)}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(row.lastOrder)}</td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className={TF}>Totals · {s.count} customers</td>
              <td className={TFR}>—</td>
              <td className={TFR}>{fmt(s.totalRevenue)}</td>
              <td className={TFR}>{fmt(s.avgSpend)}</td>
              <td className={TF}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function InventoryTable({ data }: { data: ReportInventoryData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() => {
    if (!q) return data.rows;
    const lq = q.toLowerCase();
    return data.rows.filter(r =>
      r.productName.toLowerCase().includes(lq) ||
      (r.category || '').toLowerCase().includes(lq) ||
      (r.sku || '').toLowerCase().includes(lq) ||
      r.variantLabel.toLowerCase().includes(lq)
    );
  }, [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Total Variants"  value={s.total.toLocaleString()} />
        <KpiCard label="Out of Stock"    value={s.outCount.toLocaleString()} sub="need restocking" accent="red" />
        <KpiCard label="Low Stock"       value={s.lowCount.toLocaleString()} sub="≤ 5 units" accent="amber" />
        <KpiCard label="In Stock"        value={s.okCount.toLocaleString()} accent="green" />
        <KpiCard label="Cost Value"      value={fmt(s.totalCostValue)} sub="at cost" />
        <KpiCard label="Retail Value"    value={fmt(s.totalRetailValue)} sub="at retail" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <SortTh label="Product"     field="productName"  sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Category"    field="category"     sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Variant"     field="variantLabel" sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="SKU"         field="sku"          sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Price"       field="price"        sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Cost"        field="costPrice"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Stock"       field="stock"        sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Cost Value"  field="costValue"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Retail Value" field="retailValue" sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Status"      field="stockStatus"  sortField={field} sortDir={dir} onSort={sort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={`${row.productId}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {row.image
                      ? <img src={row.image} alt={row.productName} className="w-7 h-7 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                      : <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0" />}
                    <span className="font-medium text-gray-800 truncate max-w-[150px]">{row.productName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{row.category}</td>
                <td className="px-3 py-2.5 text-gray-600">{row.variantLabel}</td>
                <td className="px-3 py-2.5 text-xs font-mono text-gray-400">{row.sku || '—'}</td>
                <td className="px-3 py-2.5 text-right">{fmt(row.price)}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{fmt(row.costPrice)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{row.stock}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{row.costValue > 0 ? fmt(row.costValue) : '—'}</td>
                <td className="px-3 py-2.5 text-right text-indigo-600">{row.retailValue > 0 ? fmt(row.retailValue) : '—'}</td>
                <td className="px-3 py-2.5"><StatusBadge status={row.stockStatus} /></td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td colSpan={7} className={TF}>Totals · {s.total} variants</td>
              <td className={TFR}>{fmt(s.totalCostValue)}</td>
              <td className={TFR + ' text-indigo-600'}>{fmt(s.totalRetailValue)}</td>
              <td className={TF}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function StaffTable({ data }: { data: ReportStaffData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() => {
    if (!q) return data.rows;
    const lq = q.toLowerCase();
    return data.rows.filter(r => r.name.toLowerCase().includes(lq) || (r.email || '').toLowerCase().includes(lq));
  }, [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Staff Members"     value={s.staffCount.toLocaleString()} />
        <KpiCard label="Total Revenue"     value={fmt(s.totalRevenue)} />
        <KpiCard label="Net Revenue"       value={fmt(s.netRevenue)} accent="green" />
        <KpiCard label="Total Transactions" value={s.totalTx.toLocaleString()} />
        <KpiCard label="Items Sold"        value={s.totalItems.toLocaleString()} />
        <KpiCard label="Total Refunds"     value={fmt(s.refundAmount)} accent="red" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
              <SortTh label="Staff Member"   field="name"            sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Transactions"   field="transactions"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Items Sold"     field="itemsSold"       sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Revenue"        field="revenue"         sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Refund Amt"     field="refundAmount"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Net Revenue"    field="netRevenue"      sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Avg Sale"       field="avgTransaction"  sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Cash"           field="cashRevenue"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Card"           field="cardRevenue"     sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Transfer"       field="transferRevenue" sortField={field} sortDir={dir} onSort={sort} className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={row._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2 text-xs font-bold text-gray-300">{i + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-800">{row.name}</p>
                  {row.email && <p className="text-xs text-gray-400">{row.email}</p>}
                </td>
                <td className="px-3 py-2 text-right font-medium">{row.transactions}</td>
                <td className="px-3 py-2 text-right text-gray-500">{row.itemsSold}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(row.revenue)}</td>
                <td className="px-3 py-2 text-right text-red-500">{row.refundAmount > 0 ? fmt(row.refundAmount) : '—'}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-600">{fmt(row.netRevenue)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmt(row.avgTransaction)}</td>
                <td className="px-3 py-2 text-right text-emerald-600">{fmt(row.cashRevenue)}</td>
                <td className="px-3 py-2 text-right text-blue-600">{fmt(row.cardRevenue)}</td>
                <td className="px-3 py-2 text-right text-violet-600">{fmt(row.transferRevenue)}</td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td colSpan={2} className={TF}>Totals</td>
              <td className={TFR}>{s.totalTx}</td>
              <td className={TFR}>{s.totalItems}</td>
              <td className={TFR}>{fmt(s.totalRevenue)}</td>
              <td className={TFR + ' text-red-500'}>{fmt(s.refundAmount)}</td>
              <td className={TFR + ' text-emerald-600'}>{fmt(s.netRevenue)}</td>
              <td colSpan={4} className={TF}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function PurchasesTable({ data }: { data: ReportPurchasesData }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [data]);
  const filtered = useMemo(() => {
    if (!q) return data.rows;
    const lq = q.toLowerCase();
    return data.rows.filter(r => r.ref.toLowerCase().includes(lq) || r.supplier.toLowerCase().includes(lq));
  }, [data.rows, q]);
  const { sorted, sort, field, dir } = useSortable(filtered);
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Purchase Orders"  value={s.count.toLocaleString()} />
        <KpiCard label="Total Cost"       value={fmt(s.totalCost)} />
        <KpiCard label="Returns"          value={fmt(s.returnsTotal)} accent="red" />
        <KpiCard label="Net Cost"         value={fmt(s.netCost)} accent="green" />
      </div>
      <TableSearch value={q} onChange={setQ} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <SortTh label="Ref"          field="ref"          sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Supplier"     field="supplier"     sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Date"         field="date"         sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Items"        field="itemsOrdered" sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Total Cost"   field="totalCost"    sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Returns"      field="returnsTotal" sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Net Cost"     field="netCost"      sortField={field} sortDir={dir} onSort={sort} className="text-right" />
              <SortTh label="Status"       field="status"       sortField={field} sortDir={dir} onSort={sort} />
              <SortTh label="Created By"   field="performedBy"  sortField={field} sortDir={dir} onSort={sort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row, i) => (
              <motion.tr
                key={row._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-gray-50/60 transition-colors group"
              >
                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">{row.ref}</td>
                <td className="px-3 py-2.5 font-medium text-gray-800">{row.supplier}</td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{row.itemsOrdered}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(row.totalCost)}</td>
                <td className="px-3 py-2.5 text-right text-red-500">{row.returnsTotal > 0 ? fmt(row.returnsTotal) : '—'}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{fmt(row.netCost)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{row.performedBy}</td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/60 border-t-2 border-gray-200">
            <tr>
              <td colSpan={3} className={TF}>Totals · {s.count} orders</td>
              <td className={TFR}>—</td>
              <td className={TFR}>{fmt(s.totalCost)}</td>
              <td className={TFR + ' text-red-500'}>{fmt(s.returnsTotal)}</td>
              <td className={TFR + ' text-emerald-600'}>{fmt(s.netCost)}</td>
              <td colSpan={2} className={TF}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

// ── CSV export helpers per report ──────────────────────────────

function doExport(type: ReportType, data: any) {
  const ts = new Date().toISOString().slice(0, 10);
  if (type === 'sales') {
    const d = data as ReportSalesData;
    exportCSV(
      ['Period', 'Online Orders', 'Online Revenue', 'POS Sales', 'POS Revenue', 'POS Refunds', 'Refund Amt', 'Total Orders', 'Total Revenue', 'Net Revenue'],
      d.rows.map(r => [fmtPeriod(r.period, d.groupBy), r.onlineCount, r.onlineRevenue, r.posCount, r.posRevenue, r.posRefundCount, r.posRefundAmount, r.totalCount, r.totalRevenue, r.netRevenue]),
      `sales-report-${ts}.csv`
    );
  } else if (type === 'products') {
    const d = data as ReportProductsData;
    exportCSV(
      ['Product', 'Category', 'POS Qty', 'POS Revenue', 'Online Qty', 'Online Revenue', 'Total Qty', 'Refunded Qty', 'Net Qty', 'Total Revenue', 'Gross Profit', 'Margin %', 'Current Stock'],
      d.rows.map(r => [r.name, r.category, r.posQty, r.posRevenue, r.onlineQty, r.onlineRevenue, r.totalQty, r.posRefundedQty, r.netQty, r.totalRevenue, r.grossProfit, r.marginPct, r.currentStock]),
      `products-report-${ts}.csv`
    );
  } else if (type === 'orders') {
    const d = data as ReportOrdersData;
    exportCSV(
      ['Order #', 'Customer', 'Email', 'Date', 'City', 'State', 'Items', 'Total', 'Status', 'Payment'],
      d.rows.map(r => [r.ref, r.customerName, r.customerEmail, fmtDate(r.date), r.shippingCity, r.shippingState, r.itemCount, r.total, r.status, r.paymentStatus]),
      `orders-report-${ts}.csv`
    );
  } else if (type === 'customers') {
    const d = data as ReportCustomersData;
    exportCSV(
      ['Name', 'Email', 'Joined', 'Orders', 'Cancelled', 'Total Spent', 'Avg Order', 'Last Order'],
      d.rows.map(r => [r.name, r.email, r.joined ? fmtDate(r.joined) : '', r.orderCount, r.cancelledCount, r.totalSpent, r.avgOrder, fmtDate(r.lastOrder)]),
      `customers-report-${ts}.csv`
    );
  } else if (type === 'inventory') {
    const d = data as ReportInventoryData;
    exportCSV(
      ['Product', 'Category', 'Variant', 'SKU', 'Price', 'Cost', 'Stock', 'Cost Value', 'Retail Value', 'Status'],
      d.rows.map(r => [r.productName, r.category, r.variantLabel, r.sku, r.price, r.costPrice, r.stock, r.costValue, r.retailValue, r.stockStatus]),
      `inventory-report-${ts}.csv`
    );
  } else if (type === 'staff') {
    const d = data as ReportStaffData;
    exportCSV(
      ['Staff', 'Email', 'Transactions', 'Items Sold', 'Revenue', 'Refund Amt', 'Net Revenue', 'Avg Sale', 'Cash', 'Card', 'Transfer'],
      d.rows.map(r => [r.name, r.email, r.transactions, r.itemsSold, r.revenue, r.refundAmount, r.netRevenue, r.avgTransaction, r.cashRevenue, r.cardRevenue, r.transferRevenue]),
      `staff-report-${ts}.csv`
    );
  } else if (type === 'purchases') {
    const d = data as ReportPurchasesData;
    exportCSV(
      ['Ref', 'Supplier', 'Date', 'Items', 'Total Cost', 'Returns', 'Net Cost', 'Status', 'Created By'],
      d.rows.map(r => [r.ref, r.supplier, fmtDate(r.date), r.itemsOrdered, r.totalCost, r.returnsTotal, r.netCost, r.status, r.performedBy]),
      `purchases-report-${ts}.csv`
    );
  }
}

// ── Main page ──────────────────────────────────────────────────

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'sales',     label: 'Sales',     icon: BarChart3,    color: 'text-amber-600'   },
  { key: 'products',  label: 'Products',  icon: Package,      color: 'text-indigo-600'  },
  { key: 'orders',    label: 'Orders',    icon: ShoppingCart, color: 'text-blue-600'    },
  { key: 'customers', label: 'Customers', icon: Users,        color: 'text-emerald-600' },
  { key: 'inventory', label: 'Inventory', icon: Box,          color: 'text-orange-600'  },
  { key: 'staff',     label: 'Staff',     icon: UserCog,      color: 'text-purple-600'  },
  { key: 'purchases', label: 'Purchases', icon: ShoppingBag,  color: 'text-rose-600'    },
];

const defaultTo   = toDateInput(new Date());
const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return toDateInput(d); })();

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [from, setFrom]             = useState(defaultFrom);
  const [to,   setTo]               = useState(defaultTo);
  const [groupBy, setGroupBy]       = useState<'day' | 'month'>('day');
  const [invFilter, setInvFilter]   = useState<'all' | 'low' | 'out'>('all');
  const [orderStatus, setOrderStatus] = useState('');

  const [data,    setData]    = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const hasGenerated = useRef(false);

  const generate = useCallback(async (type = reportType) => {
    setLoading(true); setError(''); setData(null);
    try {
      let result;
      if      (type === 'sales')     result = await api.reports.sales({ from, to, groupBy });
      else if (type === 'products')  result = await api.reports.products({ from, to });
      else if (type === 'orders')    result = await api.reports.orders({ from, to, status: orderStatus });
      else if (type === 'customers') result = await api.reports.customers({ from, to });
      else if (type === 'inventory') result = await api.reports.inventory({ filter: invFilter });
      else if (type === 'staff')     result = await api.reports.staff({ from, to });
      else if (type === 'purchases') result = await api.reports.purchases({ from, to });
      setData(result);
      hasGenerated.current = true;
    } catch (e: any) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [reportType, from, to, groupBy, invFilter, orderStatus]);

  const switchType = (t: ReportType) => {
    setReportType(t);
    setData(null);
    hasGenerated.current = false;
  };

  const applyPreset = (preset: Preset) => {
    const [f, t] = preset.apply();
    setFrom(f); setTo(t);
  };

  const isInventory = reportType === 'inventory';

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Title ── */}
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

        {/* ── Report type tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
        >
          {REPORT_TYPES.map((rt, idx) => {
            const Icon = rt.icon;
            const active = reportType === rt.key;
            return (
              <motion.button
                key={rt.key}
                onClick={() => switchType(rt.key)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : rt.color}`} />
                {rt.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Filters + Generate ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm"
        >

          {/* Quick presets (not for inventory) */}
          {!isInventory && (
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">

            {/* Date range (not for inventory) */}
            {!isInventory && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>
              </>
            )}

            {/* Sales: group by */}
            {reportType === 'sales' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as 'day' | 'month')}
                  className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </select>
              </div>
            )}

            {/* Orders: status filter */}
            {reportType === 'orders' && (
              <StatusPicker
                label="Status"
                value={orderStatus}
                options={ORDER_STATUS_OPTIONS}
                onChange={setOrderStatus}
              />
            )}

            {/* Inventory: stock filter */}
            {isInventory && (
              <StatusPicker
                label="Stock Filter"
                value={invFilter}
                options={INV_FILTER_OPTIONS}
                onChange={v => setInvFilter(v as 'all' | 'low' | 'out')}
              />
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {data && (
                <motion.button
                  onClick={() => doExport(reportType, data)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </motion.button>
              )}
              <motion.button
                onClick={() => generate()}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[#C9A84C] text-white hover:bg-[#b8933e] transition-colors disabled:opacity-60"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><TrendingUp className="w-4 h-4" /> Generate Report</>
                }
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Report content ── */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-12 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <AlertCircle className="w-10 h-10 text-red-400" />
              </motion.div>
              <p className="text-gray-600 text-sm">{error}</p>
              <button onClick={() => generate()} className="text-sm text-[#C9A84C] hover:underline">Retry</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-64" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!loading && !error && !data && !hasGenerated.current && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 gap-4"
            >
              <motion.div
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
              >
                {(() => {
                  const rt = REPORT_TYPES.find(r => r.key === reportType)!;
                  const Icon = rt.icon;
                  return <Icon className={`w-10 h-10 ${rt.color} opacity-30`} />;
                })()}
              </motion.div>
              <div className="text-center">
                <p className="font-medium text-gray-700">
                  {REPORT_TYPES.find(r => r.key === reportType)?.label} Report
                </p>
                <p className="text-sm text-gray-400 mt-1">Set your filters and click Generate Report</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!loading && !error && data && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">
                {data.rows?.length ?? 0} {data.rows?.length === 1 ? 'row' : 'rows'}
                {!isInventory && data.from && data.to && (
                  <> · {fmtDate(data.from)} – {fmtDate(data.to)}</>
                )}
              </p>
              <button
                onClick={() => generate()}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {data.rows?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Filter className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">No data for the selected period</p>
              </div>
            ) : (
              <>
                {reportType === 'sales'     && <SalesTable     data={data} />}
                {reportType === 'products'  && <ProductsTable  data={data} />}
                {reportType === 'orders'    && <OrdersTable    data={data} />}
                {reportType === 'customers' && <CustomersTable data={data} />}
                {reportType === 'inventory' && <InventoryTable data={data} />}
                {reportType === 'staff'     && <StaffTable     data={data} />}
                {reportType === 'purchases' && <PurchasesTable data={data} />}
              </>
            )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  );
}
