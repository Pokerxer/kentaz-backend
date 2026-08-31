# Product Barcode Tags

How the printable tag system works, and its print rules. Code lives in the
admin app: `admin/src/lib/code128.ts`, `admin/src/components/Code128Barcode.tsx`,
`admin/src/components/ProductTag.tsx`, `admin/src/app/products/tags/page.tsx`.

## Design invariants

- **The SKU is the barcode.** Code128 (not EAN-13) so a scan returns the stored
  SKU byte-for-byte. The printed digits under the bars carry the same value.
- **SKUs come from one source: the server's sequence.** Taken atomically from
  the `variantSku` counter — by the `Product` pre-save hook, or up front by
  `POST /api/admin/products/skus/reserve` when the admin form needs a code
  before saving. The form used to invent its own (`KZS-M-GOL-01`), which could
  collide across products and encoded roughly twice as wide in Code128,
  tripping the density guard on a 50 mm label. Removed 2026-08.
- **One SKU names one variant, shop-wide.** Not one variant within its product —
  it is the barcode, and a scan has to resolve to exactly one item.

## SKU format

`2190` + an 8-digit sequence: `219000000001` … `219099999999`, a hundred
million codes. Twelve numeric digits opening `219`, so a generated code reads
like the supplier codes already on the shelves (`219136411102`).

The `2190` band is chosen, not incidental. Every code in the catalogue is
`219101111071` or higher — 1,086 of them across the seed and import scripts,
with the two outliers (`241…`, `638…`) higher still. Nothing starts `2190`. So
generated codes look like catalogue codes while occupying a range the suppliers
have never used. `isGenerated()` tests that band. (Before 2026-08 the prefix was
`9`, which was unmistakable but looked nothing like the rest of the catalogue.)

Numeric matters as much as the shape: Code128 packs digit pairs in subset C, so
12 digits is 101 modules, while a 12-character alphanumeric SKU is roughly
double that — the difference between bars a scanner resolves on a 50 mm label
and bars it does not.

## Cross-product uniqueness

Enforced in three places, weakest to strongest:

1. **In-document** — the pre-save hook renumbers a SKU repeated inside one
   product. Cloning a variant is the usual cause, and the copy is safe to
   renumber.
2. **Cross-product** — the hook rejects a SKU another product holds, naming the
   code. It does *not* renumber: one of the two is a real code off a real box,
   tags may already be on stock, and silently renumbering whichever was saved
   second would orphan them. Excludes the document being saved, so re-saving a
   product is never a conflict.
3. **The unique index on `variants.sku`** — the only thing that closes the race
   where two concurrent saves both read clear and both write.

The index is *not* declared `unique` in the schema: an autoIndex build against a
catalogue that already holds a duplicate fails at boot and surfaces as a log
line nobody acts on. It is created once, deliberately:

```
node scripts/enforceVariantSkuUniqueness.js                # report only; exits 1 if blocked
node scripts/backfillVariantSkus.js --dry-run              # if it reports duplicates or blanks
node scripts/backfillVariantSkus.js
node scripts/enforceVariantSkuUniqueness.js --create-index # enforce
```

Blanks block the build as surely as duplicates do: the index is multikey, so a
variant with no `sku` contributes a null key and two such products collide on
it. Both scripts are idempotent.

`scripts/importProducts.js` uses `insertMany`, which bypasses save middleware
and therefore both hook checks — the index is what covers it, and
`backfillVariantSkus.js` cleans up after it.
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
- **Orientation** (0/90/180/270, persisted as `kentaz.tagRotation`): rotates the
  tag *and* transposes the page box together — see `pageSize()`. Cheap thermal
  drivers describe their media portrait however the labels leave the roll, and
  silently rotate a landscape page to fit; the symptom is a sideways tag whose
  50 mm runs along the feed, so it spans two stickers, the die-cut gap cuts the
  barcode in half, and blank labels follow. `@page` alone cannot argue a driver
  out of this, so it is a setting the shop finds once with the test label.
  Fixed 2026-08 — this is what the first printed rolls got wrong.
- **One tag, one label.** `.tag-rotate` is absolutely positioned, so `.tag-page`
  carries no in-flow content; an in-flow child a fraction of a millimetre taller
  than the page emitted a blank label after every tag. Verified by rendering the
  print CSS through headless Chrome: 3 tags → 3 PDF pages, MediaBox 50×25 mm at
  0°/180° and 25×50 mm at 90°/270°.
- **A4 sheet**: fixed Avery L7654 geometry (physical stock — not adjustable);
  printer drift is corrected with the X/Y nudge, persisted likewise.
- **Scan-density guard**: the studio warns when the narrowest bar of the worst
  SKU drops below 0.19 mm at the chosen label width — below that, tags look
  perfect but scanners fail. Fix: wider label or shorter SKU.
- Print dialog must be **Scale 100%, Margins None**; thermal needs the matching
  paper size and Chrome/Edge (Firefox ignores custom `@page` sizes).
- Calibration: sheet mode prints an empty numbered grid; thermal prints one
  scannable test label. Do both on plain/cheap stock before a real run.
