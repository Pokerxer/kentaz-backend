'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Loader2,
  AlertTriangle,
  Info,
  Package,
  Layers,
  LayoutGrid,
  RotateCcw,
  Minus,
  Plus,
  Ruler,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProductTag, TagData, TAG_WIDTH_MM, TAG_HEIGHT_MM } from '@/components/ProductTag';
import { api, Product } from '@/lib/api';

// A whole roll is 500-1000 labels. This cap is not a technical limit — it is
// there so a mistyped "match stock" cannot quietly send 4,000 pages to a
// printer that has no way to tell you it is drowning.
const MAX_LABELS = 200;

type TagFormat = 'thermal' | 'sheet';

/**
 * Avery L7654 on A4. Every number is off the manufacturer's spec sheet; they
 * are not adjustable, because they describe a physical piece of paper. Printer
 * drift is corrected with the offset nudges instead.
 */
const SHEET = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  labelWidthMm: 45.7,
  labelHeightMm: 25.4,
  columns: 4,
  rows: 10,
  marginLeftMm: 5.95,
  marginTopMm: 21.5,
  pitchXMm: 50.8,
  pitchYMm: 25.4,
} as const;

const PER_SHEET = SHEET.columns * SHEET.rows; // 40

// Bigger than any drift worth correcting in software; past this the paper is
// loaded wrong, and nudging only hides the real problem.
const MAX_OFFSET_MM = 10;
const OFFSET_STEP_MM = 0.5;

const OFFSET_STORAGE_KEY = 'kentaz.tagSheetOffset';

interface Offset { x: number; y: number }

const NO_OFFSET: Offset = { x: 0, y: 0 };

/** Where label `index` sits on the sheet — filled left to right, top to bottom. */
function cellPosition(index: number) {
  const row = Math.floor(index / SHEET.columns);
  const col = index % SHEET.columns;
  return {
    left: `${SHEET.marginLeftMm + col * SHEET.pitchXMm}mm`,
    top: `${SHEET.marginTopMm + row * SHEET.pitchYMm}mm`,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function clampOffset(mm: number): number {
  if (!Number.isFinite(mm)) return 0;
  // One decimal: printers drift in whole and half millimetres, and 1.3333 in
  // the box reads as precision that isn't there.
  return Math.round(Math.min(MAX_OFFSET_MM, Math.max(-MAX_OFFSET_MM, mm)) * 10) / 10;
}

type PrintJob =
  | { kind: 'tags'; format: TagFormat; tags: TagData[] }
  /** The empty dashed grid, for plain paper. Only sheet mode has one to check. */
  | { kind: 'calibration'; format: 'sheet' };

interface TagRow {
  key: string;
  productId: string;
  productName: string;
  size?: string;
  color?: string;
  sku?: string;
  stock: number;
  copies: number;
  include: boolean;
}

function toRows(products: Product[]): TagRow[] {
  return products.flatMap(product =>
    (product.variants || []).map((variant, index) => {
      const sku = (variant.sku || '').trim();
      return {
        key: `${product._id}:${index}`,
        productId: product._id,
        productName: product.name,
        size: variant.size || undefined,
        color: variant.color || undefined,
        sku: sku || undefined,
        stock: variant.stock ?? 0,
        copies: 1,
        include: Boolean(sku),
      };
    }),
  );
}

function rowToTag(row: TagRow): TagData {
  return {
    productName: row.productName,
    size: row.size,
    color: row.color,
    sku: row.sku,
  };
}

const CALIBRATION_TAG: TagData = {
  productName: 'Alignment test',
  size: 'TEST',
  color: 'Calibration',
  // Scannable, so the test label proves the printer's output can actually be
  // read — not merely that it landed on the sticker.
  sku: '000000000000',
};

function TagStudio() {
  const params = useSearchParams();
  const router = useRouter();

  const ids = useMemo(() => {
    const raw = params.get('ids') || params.get('id') || '';
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }, [params]);

  const [rows, setRows] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState<PrintJob | null>(null);
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<TagFormat>('thermal');
  const [offset, setOffset] = useState<Offset>(NO_OFFSET);

  useEffect(() => setMounted(true), []);

  // The drift is a property of the printer, not of this print job — remember it
  // so the next batch does not cost another sheet to rediscover. Read after
  // mount rather than in the initialiser, so the server and client agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OFFSET_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Offset>;
      setOffset({ x: clampOffset(Number(saved?.x)), y: clampOffset(Number(saved?.y)) });
    } catch {
      // A corrupt or blocked store is not worth a broken page; zero is correct.
    }
  }, []);

  const nudge = useCallback((patch: Partial<Offset>) => {
    setOffset(current => {
      const next = {
        x: clampOffset(patch.x ?? current.x),
        y: clampOffset(patch.y ?? current.y),
      };
      try {
        window.localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Nudging still works for this session even if it cannot be saved.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.all(ids.map(id => api.products.getById(id)));
        if (!cancelled) setRows(toRows(results));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load those products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ids]);

  // Printing is driven by state rather than called inline so the labels are
  // committed to the DOM before the print dialog reads the page.
  useEffect(() => {
    if (!job) return;
    const clear = () => setJob(null);
    window.addEventListener('afterprint', clear);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      window.removeEventListener('afterprint', clear);
      cancelAnimationFrame(frame);
    };
  }, [job]);

  const update = useCallback((key: string, patch: Partial<TagRow>) => {
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const printable = rows.filter(r => r.include && r.sku);
  const total = printable.reduce((n, r) => n + r.copies, 0);
  const missing = rows.filter(r => !r.sku);
  const overCap = total > MAX_LABELS;
  const sheetMode = format === 'sheet';
  const sheets = Math.ceil(total / PER_SHEET);

  const print = () => {
    const queue: TagData[] = [];
    for (const row of printable) {
      for (let i = 0; i < row.copies; i++) queue.push(rowToTag(row));
    }
    if (queue.length > 0) setJob({ kind: 'tags', format, tags: queue });
  };

  const printCalibration = () => {
    setJob(sheetMode
      ? { kind: 'calibration', format: 'sheet' }
      : { kind: 'tags', format: 'thermal', tags: [CALIBRATION_TAG] });
  };

  const setAllCopies = (fn: (row: TagRow) => number) => {
    setRows(rs => rs.map(r => ({ ...r, copies: Math.max(0, fn(r)) })));
  };

  return (
    <AdminLayout>
      <PrintStyles format={job?.format ?? format} />

      <div className="max-w-5xl mx-auto pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Print product tags</h1>
            <p className="text-sm text-gray-500">
              {sheetMode
                ? `${SHEET.labelWidthMm} × ${SHEET.labelHeightMm} mm on A4 · ${PER_SHEET} per sheet`
                : `${TAG_WIDTH_MM} × ${TAG_HEIGHT_MM} mm thermal labels · one per page`}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 py-16 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading products…
          </div>
        )}

        {!loading && error && (
          <Notice tone="error" icon={<AlertTriangle className="h-4 w-4" />}>{error}</Notice>
        )}

        {!loading && !error && ids.length === 0 && (
          <Empty
            title="Nothing selected"
            body="Open a product and choose Print tags, or select products on the list and print them together."
          />
        )}

        {!loading && !error && ids.length > 0 && rows.length === 0 && (
          <Empty
            title="No variants to tag"
            body="These products have no variants, so there is nothing to put a tag on."
          />
        )}

        {!loading && rows.length > 0 && (
          <>
            {missing.length > 0 && (
              <Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
                {missing.length} variant{missing.length === 1 ? ' has' : 's have'} no SKU and cannot be
                printed. Open the product and save it once — a SKU is assigned automatically on save.
              </Notice>
            )}

            {sheetMode && (
              <Notice tone="info" icon={<Info className="h-4 w-4" />}>
                In the browser&rsquo;s print dialog set <strong>Scale: 100%</strong> — not
                &ldquo;Fit to page&rdquo; — and <strong>Margins: None</strong>. Any other setting
                resizes the page and every label lands off its sticker. Print the calibration
                sheet on plain paper first and hold it against a real sheet.
              </Notice>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
                <label htmlFor="tag-format" className="text-xs font-medium text-gray-500">
                  Label stock
                </label>
                <select
                  id="tag-format"
                  value={format}
                  onChange={e => setFormat(e.target.value as TagFormat)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                >
                  <option value="thermal">Thermal {TAG_WIDTH_MM}×{TAG_HEIGHT_MM}mm</option>
                  <option value="sheet">A4 sheet — Avery L7654</option>
                </select>
                <div className="flex-1" />
                <ToolbarButton
                  onClick={printCalibration}
                  icon={sheetMode ? <LayoutGrid className="h-3.5 w-3.5" /> : <Ruler className="h-3.5 w-3.5" />}
                >
                  {sheetMode ? 'Print calibration sheet' : 'Print one test label'}
                </ToolbarButton>
              </div>

              {sheetMode && (
                <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Alignment nudge</span>
                    <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs">
                      Shift every label on the sheet. Positive moves right and down.
                    </p>
                  </div>
                  <OffsetControl
                    label="X"
                    value={offset.x}
                    onChange={x => nudge({ x })}
                  />
                  <OffsetControl
                    label="Y"
                    value={offset.y}
                    onChange={y => nudge({ y })}
                  />
                  {(offset.x !== 0 || offset.y !== 0) && (
                    <ToolbarButton
                      onClick={() => nudge(NO_OFFSET)}
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      Reset nudge
                    </ToolbarButton>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
                <span className="text-xs font-medium text-gray-500 mr-1">Copies</span>
                <ToolbarButton onClick={() => setAllCopies(() => 1)} icon={<RotateCcw className="h-3.5 w-3.5" />}>
                  One each
                </ToolbarButton>
                <ToolbarButton onClick={() => setAllCopies(r => r.stock)} icon={<Layers className="h-3.5 w-3.5" />}>
                  Match stock on hand
                </ToolbarButton>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="px-4 py-2 font-medium w-10"></th>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Variant</th>
                      <th className="px-4 py-2 font-medium">SKU / barcode</th>
                      <th className="px-4 py-2 font-medium text-right">Stock</th>
                      <th className="px-4 py-2 font-medium text-center w-36">Copies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr
                        key={row.key}
                        className={`border-b border-gray-100 last:border-0 ${row.sku ? '' : 'bg-amber-50/40'}`}
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={row.include && Boolean(row.sku)}
                            disabled={!row.sku}
                            onChange={e => update(row.key, { include: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]/30 disabled:opacity-40"
                            aria-label={`Include ${row.productName}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-gray-900">{row.productName}</td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {[row.size, row.color].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                          {row.sku || <span className="text-amber-700">no SKU</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{row.stock}</td>
                        <td className="px-4 py-2.5">
                          <Stepper
                            value={row.copies}
                            disabled={!row.sku || !row.include}
                            onChange={n => update(row.key, { copies: n })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Preview</h2>
              <div className="flex flex-wrap gap-3">
                {printable.slice(0, 8).map(row => (
                  <ProductTag
                    key={row.key}
                    tag={rowToTag(row)}
                    outlined
                    widthMm={sheetMode ? SHEET.labelWidthMm : TAG_WIDTH_MM}
                    heightMm={sheetMode ? SHEET.labelHeightMm : TAG_HEIGHT_MM}
                  />
                ))}
                {printable.length === 0 && (
                  <p className="text-sm text-gray-400">Nothing selected to print.</p>
                )}
                {printable.length > 8 && (
                  <p className="text-sm text-gray-400 self-center">
                    …and {printable.length - 8} more
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur px-6 py-3 flex items-center gap-4 z-20">
          <div className="text-sm">
            <span className={`font-semibold ${overCap ? 'text-red-600' : 'text-gray-900'}`}>
              {total}
            </span>
            <span className="text-gray-500"> label{total === 1 ? '' : 's'} across {printable.length} variant{printable.length === 1 ? '' : 's'}</span>
            {sheetMode && total > 0 && !overCap && (
              <span className="text-gray-500"> · {sheets} sheet{sheets === 1 ? '' : 's'}</span>
            )}
            {overCap && (
              <span className="text-red-600 ml-2">
                — over the {MAX_LABELS}-label limit for one job
              </span>
            )}
          </div>
          <div className="flex-1" />
          <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900">Cancel</Link>
          <button
            onClick={print}
            disabled={total === 0 || overCap}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print {total > 0 ? total : ''} tag{total === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {/* Portalled to <body> so the print stylesheet can hide the admin chrome
          by simply hiding every other direct child of the body. */}
      {mounted && job && createPortal(
        <div id="tag-print-root">
          {job.format === 'thermal'
            ? job.kind === 'tags' && job.tags.map((tag, i) => (
                <div className="tag-page" key={i}>
                  <ProductTag tag={tag} />
                </div>
              ))
            : job.kind === 'calibration'
              ? <CalibrationSheet offset={offset} />
              : chunk(job.tags, PER_SHEET).map((page, sheetIndex) => (
                  <Sheet key={sheetIndex} offset={offset}>
                    {page.map((tag, i) => (
                      <div className="tag-cell" key={i} style={cellPosition(i)}>
                        <ProductTag
                          tag={tag}
                          widthMm={SHEET.labelWidthMm}
                          heightMm={SHEET.labelHeightMm}
                        />
                      </div>
                    ))}
                  </Sheet>
                ))}
        </div>,
        document.body,
      )}
    </AdminLayout>
  );
}

/**
 * One A4 page. The nudge is a transform on the grid rather than on the page,
 * so the paper stays 210 × 297 mm however far the labels are shifted — and the
 * page's `overflow: hidden` clips anything pushed off the edge instead of
 * spilling it onto the next sheet.
 */
function Sheet({ offset, children }: { offset: Offset; children: React.ReactNode }) {
  return (
    <div className="tag-sheet">
      <div
        className="tag-sheet-grid"
        style={{ transform: `translate(${offset.x}mm, ${offset.y}mm)` }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Empty outlines on plain paper, to hold against a real sticker sheet before
 * committing one. Cheap to print, and the only way to find the drift without
 * spending a sheet of forty stickers to discover it.
 */
function CalibrationSheet({ offset }: { offset: Offset }) {
  return (
    <div className="tag-sheet">
      {/* Outside the transform, so the caption records the nudge that produced
          this sheet while the cells are the thing that moves. */}
      <div className="tag-sheet-caption">
        Kentaz · Avery L7654 alignment · nudge X {offset.x} mm, Y {offset.y} mm ·
        print at 100% scale, no margins
      </div>
      <div
        className="tag-sheet-grid"
        style={{ transform: `translate(${offset.x}mm, ${offset.y}mm)` }}
      >
        {Array.from({ length: PER_SHEET }, (_, i) => (
          <div className="tag-cell tag-cell-outline" key={i} style={cellPosition(i)}>
            <span>
              R{Math.floor(i / SHEET.columns) + 1}C{(i % SHEET.columns) + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintStyles({ format }: { format: TagFormat }) {
  return (
    <style>{`
      #tag-print-root { display: none; }

      @media print {
        /* Matches the label stock. Without this the printer pages at A4 and
           every tag lands in the top-left corner of a blank sheet. */
        @page { size: ${format === 'sheet' ? 'A4' : `${TAG_WIDTH_MM}mm ${TAG_HEIGHT_MM}mm`}; margin: 0; }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }

        body > *:not(#tag-print-root) { display: none !important; }
        #tag-print-root { display: block !important; }

        .tag-page {
          width: 50mm;
          height: 25mm;
          overflow: hidden;
          break-after: page;
          page-break-after: always;
        }
        .tag-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        /* --- A4 sticker sheet --- */

        .tag-sheet {
          position: relative;
          width: ${SHEET.pageWidthMm}mm;
          height: ${SHEET.pageHeightMm}mm;
          overflow: hidden;
          break-after: page;
          page-break-after: always;
        }
        .tag-sheet:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .tag-sheet-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .tag-cell {
          position: absolute;
          width: ${SHEET.labelWidthMm}mm;
          height: ${SHEET.labelHeightMm}mm;
          overflow: hidden;
        }

        .tag-cell-outline {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0.2mm dashed #000;
          box-sizing: border-box;
          font-size: 2.4mm;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          color: #000;
        }

        .tag-sheet-caption {
          position: absolute;
          top: 8mm;
          left: ${SHEET.marginLeftMm}mm;
          right: ${SHEET.marginLeftMm}mm;
          font-size: 3mm;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          color: #000;
        }

        /* Thermal heads are one-bit; make sure nothing is dropped as
           "background graphics". */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}</style>
  );
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="p-1 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
        aria-label="One fewer"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-14 px-2 py-1 text-center border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="p-1 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
        aria-label="One more"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ToolbarButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-all"
    >
      {icon}
      {children}
    </button>
  );
}

function OffsetControl({ label, value, onChange }: { label: string; value: number; onChange: (mm: number) => void }) {
  const id = `tag-offset-${label.toLowerCase()}`;
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-500 w-3">{label}</label>
      <button
        type="button"
        onClick={() => onChange(value - OFFSET_STEP_MM)}
        className="p-1 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
        aria-label={`Move ${label} half a millimetre back`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        id={id}
        type="number"
        step={OFFSET_STEP_MM}
        min={-MAX_OFFSET_MM}
        max={MAX_OFFSET_MM}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-16 px-2 py-1 text-center border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
      />
      <button
        type="button"
        onClick={() => onChange(value + OFFSET_STEP_MM)}
        className="p-1 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
        aria-label={`Move ${label} half a millimetre forward`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs text-gray-400">mm</span>
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: 'warn' | 'error' | 'info'; icon: React.ReactNode; children: React.ReactNode }) {
  const styles = tone === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : tone === 'info'
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-amber-50 border-amber-200 text-amber-800';
  return (
    <div className={`flex items-start gap-2 px-4 py-3 border rounded-xl text-sm mb-6 ${styles}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-20">
      <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-900 font-medium">{title}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{body}</p>
      <Link
        href="/products"
        className="inline-block mt-5 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors"
      >
        Back to products
      </Link>
    </div>
  );
}

export default function ProductTagsPage() {
  return (
    <Suspense fallback={null}>
      <TagStudio />
    </Suspense>
  );
}
