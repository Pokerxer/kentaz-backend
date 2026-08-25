# Product Barcode Tags

How the printable tag system works, and its print rules. Code lives in the
admin app: `admin/src/lib/code128.ts`, `admin/src/components/Code128Barcode.tsx`,
`admin/src/components/ProductTag.tsx`, `admin/src/app/products/tags/page.tsx`.

## Design invariants

- **The SKU is the barcode.** Code128 (not EAN-13) so a scan returns the stored
  SKU byte-for-byte. The printed digits under the bars carry the same value.
- **Monochrome only.** Thermal heads are 1-bit; brand gold dithers or drops out.
- **No price on the tag.** A printed price goes stale; the till is the truth.
- **Quiet zones are part of the symbol** (10 modules each side) — never crop them.

## Encoder (code128.ts)

Pure functions, verified against hand-derived Code128 vectors
(`node --experimental-strip-types` runs the module directly):

- Subset C for even-length digit runs (a 12-digit SKU is 101 modules);
  subset B otherwise; odd digit counts lead with one B symbol.
- Fixed 2026-08: a lone digit no longer emits a dangling CODE_C switch
  (it broke checksum validation in decoders). Regression-tested.

## Sizing & print rules

- **Thermal roll**: any size from the Tag Studio (presets or custom W/H,
  20–120 × 15–100 mm, persisted in localStorage). `@page` size and `.tag-page`
  follow the chosen size; tag typography and bar height scale with it.
- **A4 sheet**: fixed Avery L7654 geometry (physical stock — not adjustable);
  printer drift is corrected with the X/Y nudge, persisted likewise.
- **Scan-density guard**: the studio warns when the narrowest bar of the worst
  SKU drops below 0.19 mm at the chosen label width — below that, tags look
  perfect but scanners fail. Fix: wider label or shorter SKU.
- Print dialog must be **Scale 100%, Margins None**; thermal needs the matching
  paper size and Chrome/Edge (Firefox ignores custom `@page` sizes).
- Calibration: sheet mode prints an empty numbered grid; thermal prints one
  scannable test label. Do both on plain/cheap stock before a real run.
