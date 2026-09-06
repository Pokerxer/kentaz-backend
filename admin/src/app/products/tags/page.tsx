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
  PlugZap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProductTag, TagData, TAG_WIDTH_MM, TAG_HEIGHT_MM } from '@/components/ProductTag';
import { moduleCount } from '@/lib/code128';
import { api, Product } from '@/lib/api';
import {
  BridgeInfo,
  BridgeLabel,
  probeBridge,
  printViaBridge,
  calibrateViaBridge,
  readBridgePrinter,
  writeBridgePrinter,
} from '@/lib/labelBridge';

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

// ── Thermal label sizing ─────────────────────────────────────────────────────

// The physical envelope thermal printers can take: a 20mm label is below what
// a 203 dpi head can hold a readable Code128 in; past 120mm it is a sheet, not
// a label.
const THERMAL_MIN_W_MM = 20;
const THERMAL_MAX_W_MM = 120;
const THERMAL_MIN_H_MM = 15;
const THERMAL_MAX_H_MM = 100;

interface LabelSize { w: number; h: number }

const THERMAL_PRESETS: { name: string; size: LabelSize }[] = [
  { name: '50 × 25 mm', size: { w: TAG_WIDTH_MM, h: TAG_HEIGHT_MM } },
  { name: '50 × 30 mm', size: { w: 50, h: 30 } },
  { name: '40 × 30 mm', size: { w: 40, h: 30 } },
  { name: '58 × 40 mm', size: { w: 58, h: 40 } },
  { name: '100 × 50 mm', size: { w: 100, h: 50 } },
];

const THERMAL_SIZE_STORAGE_KEY = 'kentaz.tagThermalSize';
const ROTATION_STORAGE_KEY = 'kentaz.tagRotation';
const THERMAL_GAP_STORAGE_KEY = 'kentaz.tagThermalGap';

// The die-cut gap between stickers. The browser never needed this — a page is a
// page — but a printer driven directly has to be told the pitch of the roll, or
// it cannot know where one label ends. 2mm is the common die on 50 × 25 stock;
// 3mm turns up on bigger labels. 0 means continuous paper with no gap at all.
const DEFAULT_GAP_MM = 2;
const MAX_GAP_MM = 10;

function clampGap(mm: number): number {
  if (!Number.isFinite(mm)) return DEFAULT_GAP_MM;
  return Math.round(Math.min(MAX_GAP_MM, Math.max(0, mm)) * 10) / 10;
}

// ── Which way the tag sits on the label ──────────────────────────────────────

/**
 * Thermal drivers disagree about which edge of the label is the page's top.
 * Most of the cheap ones describe their media portrait — 25mm across, 50mm
 * along the feed — whichever way the labels actually come off the roll. Asked
 * to print a landscape page, the driver quietly rotates the content to fit that
 * portrait media, and the result is a tag printed sideways whose 50mm now runs
 * along the feed: it spans two stickers, straddles the die-cut gap that splits
 * the barcode in half, and leaves blank labels behind it.
 *
 * No amount of `@page` sizing argues a driver out of that, because the driver
 * has already decided. So this is a setting rather than a guess: it rotates the
 * tag *and* swaps the page box to match, which turns the driver's rotation into
 * a no-op and puts one tag on one sticker. The shop finds its value once with
 * the test label and never touches it again.
 */
type Rotation = 0 | 90 | 180 | 270;

const ROTATIONS: { value: Rotation; label: string; hint: string }[] = [
  { value: 0, label: '0°', hint: 'Upright. Start here.' },
  { value: 90, label: '90°', hint: 'For a driver that describes the roll portrait and rotates the page itself.' },
  { value: 180, label: '180°', hint: 'Upside down, for a roll that feeds the other way.' },
  { value: 270, label: '270°', hint: 'Like 90°, turned the other way.' },
];

function isRotation(value: unknown): value is Rotation {
  return value === 0 || value === 90 || value === 180 || value === 270;
}

/**
 * The paper the printer is asked for.
 *
 * At 90° and 270° the tag lies across the page, so the page is the label turned
 * on its side. Getting this wrong is the whole bug: a page that disagrees with
 * the media is what makes one tag consume two labels.
 */
function pageSize(label: LabelSize, rotation: Rotation): LabelSize {
  return rotation === 90 || rotation === 270
    ? { w: label.h, h: label.w }
    : { w: label.w, h: label.h };
}

/**
 * The CSS transform that turns the tag to face at `rotation` inside the page
 * produced by `pageSize`. Rotates about the origin (transform-origin: 0 0) and
 * then translates by whole millimetres so every corner lands on an exact
 * millimetre — filling the page at every angle:
 *
 *    0°      translate(0, 0)        rotate(0)
 *    180°    translate(w, h)        rotate(180)      (flipped in place)
 *    90°     translate(h, 0)        rotate(90)       (page is w×h -> h×w)
 *    270°    translate(0, w)        rotate(270)
 *
 * The shifts come from the label's own size, never percentages: on the 50×25
 * roll that is 0/0, 50/25, 25/0 and 0/50 mm, all integers, so the barcode bars
 * (drawn on whole millimetre modules) stay on whole raster units when the
 * driver rasterises the page.
 */
function rotateTransform(label: LabelSize, rotation: Rotation): string {
  const { w, h } = label;
  switch (rotation) {
    case 90:
      return `translate(${h}mm, 0) rotate(90deg)`;
    case 180:
      return `translate(${w}mm, ${h}mm) rotate(180deg)`;
    case 270:
      return `translate(0, ${w}mm) rotate(270deg)`;
    default:
      return `translate(0, 0) rotate(0deg)`;
  }
}

const DEFAULT_THERMAL: LabelSize = { w: TAG_WIDTH_MM, h: TAG_HEIGHT_MM };

/** Snap to 0.1mm and hold inside the physical envelope. */
function clampLabelSize(size: LabelSize): LabelSize {
  const clamp = (v: number, min: number, max: number) =>
    Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 10) / 10 : min;
  return {
    w: clamp(size.w, THERMAL_MIN_W_MM, THERMAL_MAX_W_MM),
    h: clamp(size.h, THERMAL_MIN_H_MM, THERMAL_MAX_H_MM),
  };
}

// The narrowest bar a cheap scanner still reads reliably. Below this the
// symbol may look perfect and still refuse to scan — the failure mode the
// density warning exists to prevent.
const MIN_SCANNABLE_MODULE_MM = 0.19;

/** The preset matching this size, or "custom" when the shop dialed one in. */
function presetKeyFor(size: LabelSize): string {
  const hit = THERMAL_PRESETS.find(
    p => p.size.w === size.w && p.size.h === size.h,
  );
  return hit ? `${hit.size.w}x${hit.size.h}` : 'custom';
}

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
  const [thermal, setThermal] = useState<LabelSize>(DEFAULT_THERMAL);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [gap, setGap] = useState<number>(DEFAULT_GAP_MM);

  // The local print bridge, if this machine is running one. `null` after the
  // probe means "not there", which is a normal state and not an error — the
  // browser print path is unchanged for shops that never install it.
  const [bridge, setBridge] = useState<BridgeInfo | null>(null);
  const [probing, setProbing] = useState(true);
  const [bridgePrinter, setBridgePrinter] = useState<string | null>(null);
  const [directBusy, setDirectBusy] = useState(false);
  const [directNote, setDirectNote] =
    useState<{ tone: 'info' | 'warn' | 'error'; text: string } | null>(null);

  useEffect(() => setMounted(true), []);

  // The drift is a property of the printer, not of this print job — remember it
  // so the next batch does not cost another sheet to rediscover. Read after
  // mount rather than in the initialiser, so the server and client agree.
  useEffect(() => {
    // Each setting is restored in its own try, and none of them may `return`:
    // an early exit here used to mean that a shop which had never nudged the
    // sheet also never got its saved label size back.
    const read = (key: string) => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        // A corrupt or blocked store is not worth a broken page.
        return null;
      }
    };

    const savedOffset = read(OFFSET_STORAGE_KEY) as Partial<Offset> | null;
    if (savedOffset) {
      setOffset({ x: clampOffset(Number(savedOffset.x)), y: clampOffset(Number(savedOffset.y)) });
    }

    // A shop that prints 58 × 40 rolls should not have to re-dial it every visit.
    const savedSize = read(THERMAL_SIZE_STORAGE_KEY) as Partial<LabelSize> | null;
    if (savedSize) {
      setThermal(clampLabelSize({ w: Number(savedSize.w), h: Number(savedSize.h) }));
    }

    // Least of all the rotation: it is a property of the printer's driver, and
    // rediscovering it costs a wasted strip of labels every time.
    const savedRotation = read(ROTATION_STORAGE_KEY);
    if (isRotation(savedRotation)) setRotation(savedRotation);

    const savedGap = read(THERMAL_GAP_STORAGE_KEY);
    if (typeof savedGap === 'number') setGap(clampGap(savedGap));
  }, []);

  /**
   * Look for the label bridge on this machine. Runs once on mount and on
   * demand, because the usual sequence is "open the studio, notice it is not
   * connected, start the bridge" — and having to reload the page at that point
   * is the kind of small friction that makes a shop give up on the fix.
   */
  const checkBridge = useCallback(async () => {
    setProbing(true);
    const info = await probeBridge();
    setBridge(info);
    setProbing(false);
    if (!info) return;
    // Prefer the printer the shop chose last time, but only if it is still
    // installed — a remembered name that no longer exists is worse than none.
    const saved = readBridgePrinter();
    setBridgePrinter(
      saved && info.printers.includes(saved) ? saved : info.suggestedPrinter,
    );
  }, []);

  useEffect(() => { void checkBridge(); }, [checkBridge]);

  const rotate = useCallback((next: Rotation) => {
    setRotation(next);
    try {
      window.localStorage.setItem(ROTATION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Rotating still works for this session even if it cannot be saved.
    }
  }, []);

  const resize = useCallback((patch: Partial<LabelSize>) => {
    setThermal(current => {
      const next = clampLabelSize({ w: patch.w ?? current.w, h: patch.h ?? current.h });
      try {
        window.localStorage.setItem(THERMAL_SIZE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Resizing still works for this session even if it cannot be saved.
      }
      return next;
    });
  }, []);

  const changeGap = useCallback((mm: number) => {
    const next = clampGap(mm);
    setGap(next);
    try {
      window.localStorage.setItem(THERMAL_GAP_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The gap still applies this session even if it cannot be saved.
    }
  }, []);

  const choosePrinter = useCallback((name: string) => {
    setBridgePrinter(name);
    writeBridgePrinter(name);
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
  // committed to the DOM before the print dialog reads the page. Two frames:
  // the first commits, the second lets layout settle — printing one frame
  // early has been observed to snapshot stale layout in Chromium.
  useEffect(() => {
    if (!job) return;
    const clear = () => setJob(null);
    window.addEventListener('afterprint', clear);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => window.print());
    });
    return () => {
      window.removeEventListener('afterprint', clear);
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
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
  // The paper to ask the print dialog for — the label, transposed when the tag
  // is turned sideways on it.
  const thermalPage = pageSize(thermal, rotation);

  // Scan-density check: the label width fixes how wide the symbol can be, and
  // a long SKU squeezed into it produces bars too narrow for a scanner to
  // resolve. Report the worst offender, not an average — one bad SKU is
  // enough to make a print run unscannable.
  const labelWidthMm = sheetMode ? SHEET.labelWidthMm : thermal.w;
  const symbolWidthMm = Math.max(20, labelWidthMm - 18);
  let densest: { sku: string; moduleMm: number } | null = null;
  for (const row of printable) {
    try {
      const moduleMm = symbolWidthMm / moduleCount(row.sku as string);
      if (!densest || moduleMm < densest.moduleMm) {
        densest = { sku: row.sku as string, moduleMm };
      }
    } catch {
      // Unencodable SKUs are already flagged on the label itself.
    }
  }
  const tooDense = densest !== null && densest.moduleMm < MIN_SCANNABLE_MODULE_MM;

  /**
   * Whether this print goes straight to the printer instead of through the
   * browser. Thermal only: an A4 sheet is a page, the driver has no quarrel
   * with A4, and there is nothing to route around.
   */
  const direct = !sheetMode && bridge !== null;

  const sendDirect = async (labels: BridgeLabel[]) => {
    setDirectBusy(true);
    setDirectNote(null);
    try {
      const result = await printViaBridge(
        labels,
        { widthMm: thermal.w, heightMm: thermal.h, gapMm: gap },
        bridgePrinter,
      );
      // The bridge reports the queue it actually reached; remember that name
      // rather than the one we asked for.
      choosePrinter(result.printer);
      const count = `${result.printed} label${result.printed === 1 ? '' : 's'}`;
      setDirectNote(
        result.warnings.length > 0
          ? { tone: 'warn', text: `Sent ${count} to ${result.printer}. ${result.warnings.join(' ')}` }
          : { tone: 'info', text: `Sent ${count} to ${result.printer}.` },
      );
    } catch (err) {
      setDirectNote({
        tone: 'error',
        text: err instanceof Error ? err.message : 'The label bridge refused the job.',
      });
    } finally {
      setDirectBusy(false);
    }
  };

  const print = () => {
    if (direct) {
      // Copies stay a count rather than repeated rows: the printer repeats a
      // label itself, far faster than they can be sent one at a time.
      void sendDirect(printable.map(row => ({
        productName: row.productName,
        size: row.size,
        color: row.color,
        sku: row.sku,
        copies: row.copies,
      })));
      return;
    }
    const queue: TagData[] = [];
    for (const row of printable) {
      for (let i = 0; i < row.copies; i++) queue.push(rowToTag(row));
    }
    if (queue.length > 0) setJob({ kind: 'tags', format, tags: queue });
  };

  const printCalibration = () => {
    if (direct) {
      void sendDirect([{ ...CALIBRATION_TAG, copies: 1 }]);
      return;
    }
    setJob(sheetMode
      ? { kind: 'calibration', format: 'sheet' }
      : { kind: 'tags', format: 'thermal', tags: [CALIBRATION_TAG] });
  };

  /**
   * Teach the printer the pitch of this roll. Nothing is printed — it feeds a
   * label or two while it finds the gaps, and afterwards it knows where every
   * label starts. This is the fix for blank stickers between tags, and for a
   * tag that lands halfway down the label.
   */
  const calibrateRoll = async () => {
    setDirectBusy(true);
    setDirectNote(null);
    try {
      const printer = await calibrateViaBridge(
        { widthMm: thermal.w, heightMm: thermal.h, gapMm: gap },
        bridgePrinter,
      );
      choosePrinter(printer);
      setDirectNote({
        tone: 'info',
        text: `${printer} calibrated for ${thermal.w} × ${thermal.h} mm labels with a ${gap} mm gap. `
          + 'It may have fed a label or two while finding them.',
      });
    } catch (err) {
      setDirectNote({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Calibration failed.',
      });
    } finally {
      setDirectBusy(false);
    }
  };

  const setAllCopies = (fn: (row: TagRow) => number) => {
    setRows(rs => rs.map(r => ({ ...r, copies: Math.max(0, fn(r)) })));
  };

  return (
    <AdminLayout>
      <PrintStyles
        format={job?.format ?? format}
        thermal={thermal}
        rotation={rotation}
      />

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
                : direct
                  ? `${thermal.w} × ${thermal.h} mm thermal labels · direct to ${bridgePrinter ?? 'printer'}`
                  : `${thermal.w} × ${thermal.h} mm thermal labels · one per label${rotation ? ` · turned ${rotation}°` : ''}`}
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

            {sheetMode ? (
              <Notice tone="info" icon={<Info className="h-4 w-4" />}>
                In the browser&rsquo;s print dialog set <strong>Scale: 100%</strong> — not
                &ldquo;Fit to page&rdquo; — and <strong>Margins: None</strong>. Any other setting
                resizes the page and every label lands off its sticker. Print the calibration
                sheet on plain paper first and hold it against a real sheet.
              </Notice>
            ) : direct ? (
              <>
                {/* Nothing about paper size, scale, margins or Orientation
                    appears here, because none of them apply any more: the
                    printer is being told the label size in its own language
                    and there is no page for a driver to reinterpret. */}
                <Notice tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
                  <strong>Direct printing is on.</strong> Tags go straight to the printer, so
                  there is no print dialog, no paper size to choose and no Orientation to guess —
                  the label size below is what the printer prints. If a tag ever comes out
                  sideways again, it will not be from here.
                </Notice>

                <div className="mb-6 px-4 py-3 bg-white border border-gray-200 rounded-xl flex flex-wrap items-center gap-3">
                  <PlugZap className="h-4 w-4 text-emerald-600" />
                  <label htmlFor="tag-printer" className="text-xs font-medium text-gray-500">
                    Printer
                  </label>
                  <select
                    id="tag-printer"
                    value={bridgePrinter ?? ''}
                    onChange={e => choosePrinter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                  >
                    {bridge.printers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <SizeControl
                    label="Gap"
                    value={gap}
                    min={0}
                    max={MAX_GAP_MM}
                    onChange={changeGap}
                  />
                  <div className="flex-1" />
                  <ToolbarButton
                    onClick={() => void calibrateRoll()}
                    disabled={directBusy}
                    icon={<Ruler className="h-3.5 w-3.5" />}
                  >
                    Calibrate labels
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => void checkBridge()}
                    disabled={probing}
                    icon={<RefreshCw className={`h-3.5 w-3.5 ${probing ? 'animate-spin' : ''}`} />}
                  >
                    Recheck
                  </ToolbarButton>
                </div>

                {directNote && (
                  <Notice
                    tone={directNote.tone}
                    icon={directNote.tone === 'error'
                      ? <AlertTriangle className="h-4 w-4" />
                      : <Info className="h-4 w-4" />}
                  >
                    {directNote.text}
                  </Notice>
                )}
              </>
            ) : probing ? (
              /* Enumerating printers on Windows goes through PowerShell and can
                 take a second. Flashing "printing sideways?" at a shop that does
                 have the bridge, just because the answer has not arrived yet,
                 teaches exactly the wrong thing. */
              <Notice tone="info" icon={<Loader2 className="h-4 w-4 animate-spin" />}>
                Looking for the label bridge on this computer…
              </Notice>
            ) : (
              <>
                {/* The browser path. Everything below is an attempt to talk a
                    driver out of a decision it has already made, which is why
                    the bridge is offered first. */}
                <Notice tone="warn" icon={<PlugZap className="h-4 w-4" />}>
                  <strong>Printing sideways, or one tag across two stickers?</strong> That is the
                  printer driver turning the page, and no setting on this screen can overrule it —
                  the browser can only hand over a page and hope. The fix is to bypass the driver:
                  run the <strong>label bridge</strong> on the computer the printer is plugged
                  into, and tags go straight to the printer with no dialog and nothing to guess.
                  Setup is about two minutes — see{' '}
                  <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs">tools/label-bridge/README.md</code>{' '}
                  in the Kentaz project folder. Once it is running, press{' '}
                  <button
                    type="button"
                    onClick={() => void checkBridge()}
                    disabled={probing}
                    className="underline font-medium hover:text-amber-900 disabled:opacity-50"
                  >
                    {probing ? 'checking…' : 'check again'}
                  </button>.
                </Notice>

                <Notice tone="info" icon={<Info className="h-4 w-4" />}>
                  The tag prints on the paper <strong>your printer driver</strong> is set to — the
                  browser cannot force a size the driver does not know. So first create a die-cut
                  paper of exactly <strong>{thermal.w} × {thermal.h} mm</strong> in the driver,
                  then in this browser&rsquo;s print dialog pick that paper, set{' '}
                  <strong>Scale: 100%</strong> (not &ldquo;Fit to page&rdquo;) and{' '}
                  <strong>Margins: None</strong>. Use Chrome or Edge — Firefox cannot create custom
                  label sizes.
                </Notice>
                {rotation !== 0 && (
                  <Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
                    Orientation is {rotation}°. The page above is transposed to{' '}
                    <strong>{thermalPage.w} × {thermalPage.h} mm</strong>, so the driver must also
                    have a paper defined at exactly that size — otherwise it falls back to its own
                    default paper and turns the tag sideways. On XPrinter that means creating{' '}
                    <em>both</em> sizes ({thermal.w} × {thermal.h} and{' '}
                    {thermalPage.w} × {thermalPage.h}) in the driver. If a label printed at 0° came
                    out upright, leave Orientation at{' '}
                    <strong>0°</strong> and skip the others.
                  </Notice>
                )}
                <details className="mb-6 px-4 py-3 bg-white border border-gray-200 rounded-xl">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-[#C9A84C]" />
                    Thermal printer setup — XPrinter and other label printers
                    <span className="ml-auto font-normal text-gray-400 text-xs">one-time, ~2 minutes</span>
                  </summary>
                  <div className="mt-3 text-sm text-gray-600 space-y-3">
                    <p>
                      Label printers size and turn the page from the paper sizes in their{' '}
                      <strong>driver</strong>, not from the web page. Sideways tags mean the
                      driver&rsquo;s paper does not match the label. Set it up once:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong>Install the driver</strong> for your exact model. XPrinter: go to{' '}
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">xprintertech.com → Support → Driver</code>,
                        download and install.
                      </li>
                      <li>
                        <strong>Create the label paper size</strong> (Windows): Start → Printers →
                        right-click your XPrinter → <em>Printing preferences</em> →{' '}
                        <em>Page setup / Label size</em> → add a die-cut label of exactly{' '}
                        <strong>{thermal.w} mm wide × {thermal.h} mm tall</strong> and save it.
                        Then repeat under right-click → <em>Printer properties</em> →{' '}
                        <em>Advanced</em> → <em>Printing defaults</em> — apps often read that copy,
                        not the first.
                      </li>
                      <li>
                        <strong>Calibrate the media</strong>: hold <strong>Feed</strong> /{' '}
                        <strong>Pause</strong> until the printer advances a label and learns the
                        gaps between stickers.
                      </li>
                      <li>
                        <strong>Print from this page</strong>: in the browser print dialog select
                        the paper you just created, <strong>Scale = 100%</strong>,{' '}
                        <strong>Margins = None</strong>, <strong>Background graphics: on</strong>.
                      </li>
                      <li>
                        <strong>Test at 0°</strong>: click &ldquo;Print one test label&rdquo;.
                        One tag must fill one sticker dead square. If it is still sideways, the
                        driver is turning the page — that is fixed in the driver&rsquo;s own
                        paper/orientation settings, not by changing Orientation here.
                      </li>
                    </ol>
                    <p>
                      <strong>Two classic gotchas:</strong> &ldquo;Fit to page&rdquo; or any scale
                      below 100% shrinks the tag just enough to slip off the sticker, and the
                      driver&rsquo;s built-in &ldquo;minimum margins&rdquo; clips it. The browser
                      must be at Margins: None; keep margins at 0 in the driver too.
                    </p>
                  </div>
                </details>
              </>
            )}

            {tooDense && densest && (
              <Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
                At this label width the bars on SKU <span className="font-mono">{densest.sku}</span>{' '}
                come out {densest.moduleMm.toFixed(2)} mm wide — scanners struggle below{' '}
                {MIN_SCANNABLE_MODULE_MM} mm and the tag may not scan. Pick a wider label, or
                shorten the SKU.
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
                  <option value="thermal">Thermal roll</option>
                  <option value="sheet">A4 sheet — Avery L7654</option>
                </select>
                {!sheetMode && (
                  <>
                    <label
                      htmlFor="tag-size-preset"
                      className="text-xs font-medium text-gray-500"
                    >
                      Label size
                    </label>
                    <select
                      id="tag-size-preset"
                      value={presetKeyFor(thermal)}
                      onChange={e => {
                        if (e.target.value === 'custom') return;
                        const hit = THERMAL_PRESETS.find(
                          p => `${p.size.w}x${p.size.h}` === e.target.value,
                        );
                        if (hit) resize(hit.size);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                    >
                      {THERMAL_PRESETS.map(p => (
                        <option key={`${p.size.w}x${p.size.h}`} value={`${p.size.w}x${p.size.h}`}>
                          {p.name}
                        </option>
                      ))}
                      <option value="custom">Custom…</option>
                    </select>
                    <SizeControl
                      label="W"
                      value={thermal.w}
                      min={THERMAL_MIN_W_MM}
                      max={THERMAL_MAX_W_MM}
                      onChange={w => resize({ w })}
                    />
                    <SizeControl
                      label="H"
                      value={thermal.h}
                      min={THERMAL_MIN_H_MM}
                      max={THERMAL_MAX_H_MM}
                      onChange={h => resize({ h })}
                    />
                    {/* Only meaningful on the browser path. Printing direct,
                        the printer's own DIRECTION already put the tag the
                        right way up, and offering a control that does nothing
                        is how a shop ends up back where it started. */}
                    {!direct && (
                      <>
                        <label htmlFor="tag-rotation" className="text-xs font-medium text-gray-500">
                          Orientation
                        </label>
                        <select
                          id="tag-rotation"
                          value={rotation}
                          onChange={e => rotate(Number(e.target.value) as Rotation)}
                          title={ROTATIONS.find(r => r.value === rotation)?.hint}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                        >
                          {ROTATIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </>
                )}
                <div className="flex-1" />
                <ToolbarButton
                  onClick={printCalibration}
                  disabled={directBusy}
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
                    widthMm={sheetMode ? SHEET.labelWidthMm : thermal.w}
                    heightMm={sheetMode ? SHEET.labelHeightMm : thermal.h}
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
            disabled={total === 0 || overCap || directBusy}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {directBusy
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Printer className="h-4 w-4" />}
            {directBusy
              ? 'Sending…'
              : `Print ${total > 0 ? total : ''} tag${total === 1 ? '' : 's'}${direct ? ' directly' : ''}`}
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
                  <div className="tag-rotate">
                    <ProductTag tag={tag} widthMm={thermal.w} heightMm={thermal.h} />
                  </div>
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

function PrintStyles({
  format,
  thermal,
  rotation,
}: {
  format: TagFormat;
  thermal: LabelSize;
  rotation: Rotation;
}) {
  const page = pageSize(thermal, rotation);
  return (
    <style>{`
      #tag-print-root { display: none; }

      @media print {
        /* Matches the label stock. Without this the printer pages at A4 and
           every tag lands in the top-left corner of a blank sheet. At 90° and
           270° the page is the label on its side — see pageSize(). */
        @page { size: ${format === 'sheet' ? 'A4' : `${page.w}mm ${page.h}mm`}; margin: 0; }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }

        body > *:not(#tag-print-root) { display: none !important; }
        #tag-print-root { display: block !important; }

        .tag-page {
          position: relative;
          width: ${page.w}mm;
          height: ${page.h}mm;
          overflow: hidden;
          break-after: page;
          page-break-after: always;
        }
        .tag-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        /* The tag itself, pinned to the page origin and turned to face the
           label. Absolute rather than in-flow so the page box has no line
           content of its own: an in-flow child a fraction of a millimetre
           taller than the page emits a blank label after every tag, which on
           a roll is half the stock.

           The transform rotates about the origin (top-left) and then shifts
           by whole millimetres so the tag lands exactly inside the page for
           every angle. No percentage centring: a translate(-50%,-50%)
           rotate() composed with a 50% transform-origin lands the crisp
           barcode bars on fractional pixels, and a thermal driver rasterising
           that can turn the symbol slightly diagonal. An integer shift keeps
           every bar on a whole raster unit, so all four angles print square. */
        .tag-rotate {
          position: absolute;
          top: 0;
          left: 0;
          width: ${thermal.w}mm;
          height: ${thermal.h}mm;
          transform-origin: 0 0;
          transform: ${rotateTransform(thermal, rotation)};
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

function ToolbarButton({ onClick, icon, children, disabled }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:text-[#C9A84C] hover:border-[#C9A84C]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 disabled:hover:border-gray-200 transition-all"
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

function SizeControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (mm: number) => void;
}) {
  const id = `tag-size-${label.toLowerCase()}`;
  const step = 1;
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-500 w-3">{label}</label>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="p-1 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
        aria-label={`Label ${label} one millimetre smaller`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-14 px-2 py-1 text-center border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="p-1 rounded-lg text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
        aria-label={`Label ${label} one millimetre larger`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs text-gray-400">mm</span>
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: 'warn' | 'error' | 'info' | 'success'; icon: React.ReactNode; children: React.ReactNode }) {
  const styles = tone === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : tone === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
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
