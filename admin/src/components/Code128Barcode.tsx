'use client';

import { encodeCode128 } from '@/lib/code128';

// Quiet zones — the blank margins either side of the symbol. A scanner uses
// them to find where the barcode begins, so they are part of the barcode, not
// padding around it. Code128 wants at least 10 modules; printing without them
// is the commonest reason a label that looks perfect refuses to scan.
const QUIET = 10;

interface Props {
  /** The SKU. Printed as bars here, and as text by the caller. */
  value: string;
  /** Width of the symbol itself, excluding quiet zones. */
  symbolWidthMm?: number;
  barHeightMm?: number;
  className?: string;
}

/**
 * A Code128 symbol as inline SVG, drawn in module units so the bars land on
 * exact fractions of a millimetre however the label is scaled.
 *
 * The symbol is a fixed width regardless of how many modules the SKU needs, so
 * every tag looks the same; a longer SKU simply gets narrower bars.
 */
export function Code128Barcode({
  value,
  symbolWidthMm = 32,
  barHeightMm = 9,
  className,
}: Props) {
  let modules: string;
  try {
    modules = encodeCode128(value);
  } catch {
    // One bad SKU must not blank a whole print run — show the problem on the
    // label, where staff will see it before it reaches a shelf.
    return (
      <div
        className={className}
        style={{
          width: `${symbolWidthMm}mm`,
          height: `${barHeightMm}mm`,
          border: '0.2mm dashed #000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8mm',
          textAlign: 'center',
        }}
      >
        No SKU to print
      </div>
    );
  }

  const count = modules.length;
  const total = count + QUIET * 2;
  const moduleMm = symbolWidthMm / count;
  const barModules = barHeightMm / moduleMm;

  // Collapse runs of set modules into one rect each — fewer, wider rects print
  // more cleanly than a hundred abutting slivers.
  const bars: { x: number; width: number }[] = [];
  let inRun = false;
  for (let i = 0; i < count; i++) {
    if (modules[i] !== '1') { inRun = false; continue; }
    if (inRun) bars[bars.length - 1].width += 1;
    else bars.push({ x: QUIET + i, width: 1 });
    inRun = true;
  }

  return (
    <svg
      className={className}
      width={`${total * moduleMm}mm`}
      height={`${barHeightMm}mm`}
      viewBox={`0 0 ${total} ${barModules}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Barcode ${value}`}
    >
      {/* An explicit white ground: thermal paper is white, but a preview on a
          tinted surface would otherwise show through the quiet zones. */}
      <rect x={0} y={0} width={total} height={barModules} fill="#fff" />
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.width} height={barModules} fill="#000" />
      ))}
    </svg>
  );
}
