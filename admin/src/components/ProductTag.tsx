'use client';

import { Code128Barcode } from '@/components/Code128Barcode';

// The label stock in the shop. One tag per page on the thermal printer.
export const TAG_WIDTH_MM = 50;
export const TAG_HEIGHT_MM = 25;

export interface TagData {
  productName: string;
  size?: string;
  color?: string;
  /** The SKU. It is the barcode — the bars and the printed digits carry the
   *  same value, and it is what the POS matches on. */
  sku?: string;
}

/** "M · Black", "M", "Black", or "—" when a product has no variant axes. */
function variantLine({ size, color }: TagData): string {
  return [size, color].filter(Boolean).join(' · ') || '—';
}

interface Props {
  tag: TagData;
  /** Draws a hairline border so the edges are visible on screen previews. */
  outlined?: boolean;
  /** Defaults to the thermal roll; sheet mode passes the label's own size. */
  widthMm?: number;
  heightMm?: number;
}

/**
 * A single 50 × 25 mm product tag.
 *
 * Deliberately monochrome. Thermal printers are one-bit devices: the brand
 * gold (#C9A84C) either dithers into mud or drops out entirely, so the
 * wordmark carries the brand instead of a logo image. For the same reason the
 * wordmark is tracked uppercase sans rather than Playfair — hairline serifs
 * disappear at 6 pt on a 203 dpi head.
 *
 * No price. A printed price goes stale the moment a discount runs, and a tag
 * that disagrees with the till is worse than a tag with no price at all.
 */
export function ProductTag({
  tag,
  outlined,
  widthMm = TAG_WIDTH_MM,
  heightMm = TAG_HEIGHT_MM,
}: Props) {
  const sku = (tag.sku || '').trim();

  // Leave 9mm each side for the label's own padding plus the barcode's quiet
  // zones. On the 50mm thermal label this lands on exactly 32mm, so the roll
  // output is unchanged; a 45.7mm sticker gets a proportionally smaller symbol
  // that is still far above the width where scanners start failing.
  const symbolWidthMm = Math.max(20, widthMm - 18);

  return (
    <div
      className="kentaz-tag"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '1.2mm 2mm',
        boxSizing: 'border-box',
        background: '#fff',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        border: outlined ? '0.2mm solid #E5E5E5' : undefined,
      }}
    >
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div
          style={{
            fontSize: '1.9mm',
            fontWeight: 700,
            letterSpacing: '0.42mm',
            lineHeight: 1.15,
            textTransform: 'uppercase',
          }}
        >
          Kentaz
        </div>
        <div
          style={{
            fontSize: '2.4mm',
            fontWeight: 600,
            lineHeight: 1.2,
            marginTop: '0.4mm',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={tag.productName}
        >
          {tag.productName}
        </div>
        <div style={{ fontSize: '2mm', lineHeight: 1.2, color: '#333' }}>
          {variantLine(tag)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Code128Barcode value={sku} symbolWidthMm={symbolWidthMm} barHeightMm={7.5} />
        {/* The same value the bars carry, so a scanner failure never stops
            staff reading the code off the label by eye. */}
        <div
          style={{
            fontSize: '2.1mm',
            lineHeight: 1.1,
            marginTop: '0.5mm',
            letterSpacing: '0.15mm',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
            fontVariantNumeric: 'tabular-nums',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sku || 'NO SKU'}
        </div>
      </div>
    </div>
  );
}
