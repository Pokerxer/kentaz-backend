'use strict';

/**
 * Kentaz tag -> TSPL.
 *
 * TSPL is the language XPrinter's label models speak natively (TSPL/TSPL2, the
 * TSC dialect; the same units also emulate EPL/ZPL/DPL). Every number below is
 * in printer dots, and the printer is told the media size itself — so there is
 * no page, no driver paper size, no orientation to negotiate and nothing for
 * Chrome to reinterpret. `SIZE` and `GAP` *are* the label.
 *
 * This is why the direct path fixes the sideways tag that the print-CSS path
 * could not: the rotation was never ours to choose. See
 * docs/thermal-printing-xprinter.md.
 *
 * Pure functions, no I/O — `node -e` can print a job to stdout and you can read
 * exactly what the printer will be told.
 */

/** 203 dpi heads — every XPrinter label model in the shop's price range. */
const DOTS_PER_MM = 8;

/**
 * The printer's internal bitmap fonts, in dots. Only these five exist, and they
 * scale by integer multipliers only — which is why the layout below picks a
 * font rather than a point size.
 */
const FONTS = {
  '1': { w: 8, h: 12 },
  '2': { w: 12, h: 20 },
  '3': { w: 16, h: 24 },
  '4': { w: 24, h: 32 },
  '5': { w: 32, h: 48 },
};

/** Dots the printer reserves under a barcode for its human-readable digits. */
const HRI_HEIGHT_DOTS = 24;

/**
 * Blank modules either side of the symbol. Part of Code128, not decoration —
 * a scanner uses them to find where the symbol starts, so a tag cropped to the
 * first bar is a tag that will not read. TSPL's `BARCODE` draws from `x` and
 * adds nothing, so the space has to be budgeted here or it does not exist.
 */
const QUIET_MODULES = 10;

const mmToDots = mm => Math.round(mm * DOTS_PER_MM);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * TSPL string literals are ASCII and delimited by double quotes, with no
 * escape that is reliable across firmware revisions. So anything that could
 * terminate the literal early — or that the head has no glyph for — is removed
 * here rather than trusted to the printer. A mangled quote does not produce a
 * mangled label; it produces a command the firmware drops, and a blank sticker.
 */
function ascii(value) {
  return String(value ?? '')
    .normalize('NFKD')
    // Curly quotes and dashes turn up in product names and have no glyph.
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00B7/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '')
    .trim();
}

/**
 * How many Code128 modules `value` encodes to, mirroring the subset rules in
 * `admin/src/lib/code128.ts`: subset C packs digit pairs, so a 12-digit SKU is
 * 101 modules where 12 alphanumerics would be roughly double.
 *
 * Used only to choose the module width — the printer does its own encoding, so
 * an estimate off by one symbol costs a hair of margin, never a wrong barcode.
 */
function code128Modules(value) {
  const text = String(value ?? '');
  if (text.length === 0) return 0;
  const digitsOnly = /^\d+$/.test(text);

  let symbols;
  if (digitsOnly && text.length % 2 === 0) {
    symbols = 1 + text.length / 2 + 1;           // start C, pairs, checksum
  } else if (digitsOnly) {
    symbols = 1 + 1 + (text.length - 1) / 2 + 1; // one B symbol, then pairs
  } else {
    symbols = 1 + text.length + 1;               // subset B throughout
  }
  return 11 * symbols + 13;                      // + the 13-module stop pattern
}

/** Total dots a symbol occupies at this module width, quiet zones included. */
function symbolWidth(modules, narrow) {
  return (modules + QUIET_MODULES * 2) * narrow;
}

/**
 * The widest module the symbol can afford on this label.
 *
 * Wider bars scan better, so this takes the most that fits rather than a fixed
 * 2 dots. At 203 dpi one dot is 0.125 mm; the studio's scan-density floor is
 * 0.19 mm, so 2 dots (0.25 mm) is the narrowest worth printing, and the caller
 * is told when even that overflows.
 *
 * "Fits" means with both quiet zones — a symbol that only fits by eating them
 * does not fit, however good the printed label looks.
 */
function moduleWidth(value, usableDots) {
  const modules = code128Modules(value);
  if (modules === 0) return { narrow: 2, modules, fits: false };
  for (const narrow of [4, 3, 2]) {
    if (symbolWidth(modules, narrow) <= usableDots) return { narrow, modules, fits: true };
  }
  return { narrow: 2, modules, fits: false };
}

/** "M · Black" on screen is "M - Black" on a head with no middle-dot glyph. */
function variantLine(tag) {
  return [tag.size, tag.color].filter(Boolean).map(ascii).filter(Boolean).join(' - ');
}

function fit(text, font, xScale, usableDots) {
  const max = Math.floor(usableDots / (FONTS[font].w * xScale));
  const clean = ascii(text);
  return clean.length <= max ? clean : clean.slice(0, Math.max(0, max - 1)).trimEnd() + '.';
}

function centeredX(text, font, xScale, padDots, usableDots) {
  const width = text.length * FONTS[font].w * xScale;
  return padDots + Math.max(0, Math.round((usableDots - width) / 2));
}

/**
 * One label's drawing commands, laid out to mirror `ProductTag.tsx`: wordmark,
 * product name, variant line, then the symbol with its digits beneath.
 *
 * The stack is measured before it is drawn, and shed in a fixed order when the
 * label is too short to hold it — bars shorter first (never below 4 mm, where
 * cheap scanners start failing), then the wordmark, then the variant line. The
 * barcode is the one thing never dropped: a tag that does not scan has no
 * reason to exist.
 */
function drawTag(tag, label) {
  const widthDots = mmToDots(label.widthMm);
  const heightDots = mmToDots(label.heightMm);
  const padX = mmToDots(1.5);
  const padY = mmToDots(0.8);
  const usable = widthDots - padX * 2;

  // The same scale curve as ProductTag, against the same 25 mm reference stock.
  const s = clamp(label.heightMm / 25, 0.72, 1.6);
  const nameFont = s >= 1.25 ? '3' : '2';
  const metaFont = s >= 1.25 ? '2' : '1';

  const sku = ascii(tag.sku);
  const name = fit(tag.productName, nameFont, 1, usable);
  const meta = fit(variantLine(tag) || '-', metaFont, 1, usable);
  const { narrow, fits } = moduleWidth(sku, usable);

  let barHeight = mmToDots(clamp(label.heightMm * 0.3, 4.5, 10));
  let showBrand = true;
  let showMeta = true;

  const stackHeight = () =>
    padY
    + (showBrand ? FONTS['1'].h + 2 : 0)
    + FONTS[nameFont].h + 2
    + (showMeta ? FONTS[metaFont].h + 4 : 0)
    + barHeight
    + HRI_HEIGHT_DOTS
    + padY;

  while (stackHeight() > heightDots && barHeight > mmToDots(4)) barHeight -= 4;
  if (stackHeight() > heightDots) showBrand = false;
  if (stackHeight() > heightDots) showMeta = false;

  const lines = [];
  let y = padY;

  if (showBrand) {
    const brand = 'KENTAZ';
    lines.push(`TEXT ${centeredX(brand, '1', 1, padX, usable)},${y},"1",0,1,1,"${brand}"`);
    y += FONTS['1'].h + 2;
  }

  lines.push(`TEXT ${centeredX(name, nameFont, 1, padX, usable)},${y},"${nameFont}",0,1,1,"${name}"`);
  y += FONTS[nameFont].h + 2;

  if (showMeta) {
    lines.push(`TEXT ${centeredX(meta, metaFont, 1, padX, usable)},${y},"${metaFont}",0,1,1,"${meta}"`);
    y += FONTS[metaFont].h + 4;
  }

  if (sku) {
    // Centre the symbol *and* its quiet zones, then start the bars one quiet
    // zone in — so the blank margin is reserved rather than left to luck.
    const total = symbolWidth(code128Modules(sku), narrow);
    const x = padX + Math.max(0, Math.round((usable - total) / 2)) + QUIET_MODULES * narrow;
    // readable=2 centres the digits under the bars, so staff can always read
    // the code off the label by eye when a scanner refuses it.
    lines.push(`BARCODE ${x},${y},"128",${barHeight},2,0,${narrow},${narrow * 2},"${sku}"`);
  } else {
    lines.push(`TEXT ${padX},${y},"${nameFont}",0,1,1,"NO SKU"`);
  }

  return { lines, fits: Boolean(sku) && fits, narrowDots: narrow };
}

/**
 * A whole job: the media declaration once, then each label.
 *
 * `DIRECTION` is the only orientation control that matters here, and unlike the
 * browser's it is obeyed: 1 prints with the label's top leaving the printer
 * first, 0 flips it. Nothing downstream re-reads it.
 */
function renderJob(job) {
  const label = {
    widthMm: Number(job.label.widthMm),
    heightMm: Number(job.label.heightMm),
    gapMm: Number(job.label.gapMm ?? 2),
  };
  const options = job.options || {};
  const direction = Number(options.direction) === 0 ? 0 : 1;
  const density = clamp(Math.round(Number(options.density ?? 8)), 0, 15);
  const speed = clamp(Math.round(Number(options.speed ?? 4)), 1, 6);

  const out = [
    `SIZE ${label.widthMm} mm,${label.heightMm} mm`,
    `GAP ${label.gapMm} mm,0 mm`,
    `DIRECTION ${direction}`,
    'REFERENCE 0,0',
    `OFFSET ${Number(options.offsetMm ?? 0)} mm`,
    `DENSITY ${density}`,
    `SPEED ${speed}`,
    'SET TEAR ON',
    'CODEPAGE 1252',
  ];

  const warnings = [];
  let printed = 0;

  for (const entry of job.labels) {
    const copies = clamp(Math.round(Number(entry.copies ?? 1)), 1, 999);
    const { lines, fits, narrowDots } = drawTag(entry, label);
    if (!fits && entry.sku) {
      warnings.push(
        `${entry.sku}: needs ${(symbolWidth(code128Modules(entry.sku), narrowDots) / DOTS_PER_MM).toFixed(1)} mm ` +
        `with its quiet zones, which the ${label.widthMm} mm label cannot hold. It will print, but ` +
        `may not scan — use a wider label or a shorter SKU.`,
      );
    }
    out.push('CLS', ...lines, `PRINT 1,${copies}`);
    printed += copies;
  }

  return { tspl: out.join('\r\n') + '\r\n', printed, warnings };
}

/**
 * Teach the printer where one sticker ends and the next begins.
 *
 * "A blank label after every tag" and "one tag across two stickers" both
 * survive a correct layout if the gap sensor was never calibrated for this
 * roll — the printer simply does not know the pitch. This is the same routine
 * as holding the Feed button, but for the media size actually in use.
 */
function renderCalibration(label) {
  return [
    `SIZE ${Number(label.widthMm)} mm,${Number(label.heightMm)} mm`,
    `GAP ${Number(label.gapMm ?? 2)} mm,0 mm`,
    'GAPDETECT',
    'CLS',
    '',
  ].join('\r\n');
}

module.exports = {
  DOTS_PER_MM,
  QUIET_MODULES,
  ascii,
  code128Modules,
  symbolWidth,
  moduleWidth,
  drawTag,
  renderJob,
  renderCalibration,
};
