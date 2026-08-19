# Product Barcodes & Printable Tags — Design

**Date:** 2026-08-18
**Status:** Built, thermal and A4 sheet. Backfill written but **not run** — existing SKUs
untouched.
**Scope:** Kentaz admin (`admin/src/app/products`) + product model

---

## Problem

Products can reach the shop floor with nothing scannable on them. The POS has a working
barcode scanner path, but nothing in the admin printed labels, so staff fell back to
searching by name at the till.

---

## The central decision: the SKU *is* the barcode

There is one identifier per variant, not two. `variants[].sku` is what the tag prints,
what the scanner reads back, and what the POS matches on.

This was not the first design. The initial plan generated a separate EAN-13 into a new
`variants[].barcode` field. Looking at the actual catalogue killed it:

| Finding | Consequence |
|---|---|
| 1,359 of 1,462 variants already have a SKU | The identifiers exist; a second one is duplication |
| Every SKU is numeric, 1,356 of them 12 digits (`219218111005`) | These are already barcode numbers, entered off real products |
| All 1,359 are distinct | They are usable as unique identifiers as-is |
| Only 133 of 1,356 pass a UPC-A check digit | **They are not standards-compliant codes** |

That last row is the decisive one. Because the numbers are not valid UPC/EAN, printing
them in those symbologies would require *altering the number* to make its check digit
work — and the altered number would no longer match anything at the till.

**Code128** encodes the SKU exactly as stored, byte for byte, and scans back identical.
It also needs no backend change to work with the POS, which already matches
`variants[].sku`.

### Rejected

- **A generated EAN-13 in a second field.** Two identifiers for one thing, a migration,
  and a POS lookup change — to replace numbers the shop already has and trusts.
- **Printing the existing SKUs as UPC-A/EAN-13.** Would silently change 90% of the
  numbers. This is the trap the audit caught.
- **`jsbarcode`.** +30 KB, DOM-oriented rather than print-oriented, and the library is
  not the hard part — the label layout is.

*(A4 sticker sheets were rejected here as "not the shop's hardware", then asked for and
built the same day. See **Two label formats** below.)*

---

## Blank SKUs

103 variants have no SKU, so there is nothing to print on their tag. A `pre('save')`
hook on `productSchema` mints one when a variant is saved without it.

```
9 + 00000000042
^   ^^^^^^^^^^^
|   11-digit sequence from an atomic counter
generated-here marker
```

Twelve digits, matching the catalogue's shape. The leading **9** is the safeguard:
existing SKUs begin with `2` (plus one legacy 6-digit code), so a generated number can
never collide with one typed off a physical product.

Allocation takes a **block** in one atomic `$inc`, so a 12-variant product costs one
round trip and two concurrent saves can never receive overlapping numbers.

**Existing SKUs are never rewritten.** The hook fills blanks and reassigns duplicates
only — anything already there is a real code off a real product, and changing one would
orphan every tag already stuck on stock.

### The backfill is deliberately not run

`scripts/backfillVariantSkus.js` exists, is idempotent, and would fill the 103 blanks —
but it has **not been executed**, at the owner's instruction. The database is exactly as
it was. Run it when ready:

```
node scripts/backfillVariantSkus.js --dry-run   # report only
node scripts/backfillVariantSkus.js             # assign
```

Until then, blank-SKU variants show "no SKU" in the tag studio and are skipped.

---

## Files

### Backend

| File | Concern |
|---|---|
| `models/Counter.js` *(new)* | `{ _id: String, seq: Number }`. Atomic block allocation. |
| `utils/variantSku.js` *(new)* | `allocate(n)`, `fromSequence()`, `isGenerated()`. |
| `models/Product.js` | Pre-save hook filling blank and duplicated SKUs. |
| `scripts/backfillVariantSkus.js` *(new)* | Idempotent; **not yet run**. |

`controllers/posController.js` is **unchanged** — it already matches `variants.sku`.

### Admin

| File | Concern |
|---|---|
| `lib/code128.ts` *(new)* | String → module string. No React, no DOM. |
| `components/Code128Barcode.tsx` *(new)* | Module string → `<svg>`. Nothing else. |
| `components/ProductTag.tsx` *(new)* | The 50 × 25 mm label. Nothing else. |
| `app/products/tags/page.tsx` *(new)* | Tag studio — reads `?ids=`, sets copies, prints. |
| `app/products/[id]/page.tsx` | "Print Tags" button. |
| `app/products/page.tsx` | Row checkboxes + bulk "Print tags" bar. |
| `app/products/new/page.tsx` | "Print tags now" in the save-success state. |
| `app/pos/sell/page.tsx` | Scan resolves to the correct variant (see below). |

`/products/tags` is reached only from the three buttons above. It is deliberately not
linked in the sidebar — it is a destination, not a section.

---

## The tag

```
┌───────────────────────────────┐  @page { size: 50mm 25mm; margin: 0 }
│         K E N T A Z           │  tracked uppercase, 1.9mm
│  FLOWERY EARINGS              │  1 line, ellipsis
│  PINK                         │  size · colour
│  ║│║││║│║│║││║│║││║│║│││║│║   │  Code128, 32mm × 7.5mm
│        219218111005           │  the SKU, monospace
└───────────────────────────────┘
```

**Monochrome only.** Thermal printers are 1-bit. Gold `#C9A84C` renders as mud or drops
out entirely, so the tracked wordmark carries the brand rather than a logo image.

**No price.** A printed price goes stale the moment a discount runs, and a tag that
disagrees with the till is worse than one with no price at all.

**Subset C for even-length numeric SKUs.** A 12-digit SKU is 101 modules in subset C but
178 in B — across a 32 mm label, the difference between a 0.32 mm bar and a 0.18 mm one.
Cheap scanners start failing below about 0.19 mm. Odd-length numeric SKUs spend one
symbol in B then switch to C.

**10-module quiet zones** either side are non-negotiable — omitting them is the single
most common cause of a barcode that will not scan.

### Studio controls

- Copies per variant, default 1
- "Match stock on hand" shortcut
- Per-variant include/exclude
- **200-label cap per job** — a stray click should not burn a whole roll
- Calibration print to check alignment before committing

---

## Two label formats

The same tag prints to two kinds of stock. The format dropdown is the only switch;
`ProductTag` takes `widthMm` / `heightMm` and is otherwise identical in both.

| | Thermal (default) | A4 sheet |
|---|---|---|
| Stock | 50 × 25 mm roll | Avery L7654 |
| `@page` | `50mm 25mm` | `A4` |
| Per page | 1 | 40 — 4 across × 10 down |
| Label | 50 × 25 mm | 45.7 × 25.4 mm |
| Barcode symbol | 32 mm | 27.7 mm |
| Calibration | one test label | 40 dashed outlines on plain paper |

**Sheet geometry** — left margin 5.95 mm, top margin 21.5 mm, pitch 50.8 mm across and
25.4 mm down. These describe a physical piece of paper and are not configurable.

### Printer drift is corrected with a nudge, not by editing the geometry

Sheet-fed printers routinely place the image 1–2 mm off. The studio exposes X/Y offsets
in millimetres (±10 mm, half-millimetre steps) applied as a `transform` on the grid
*inside* the page — so the paper stays exactly A4 however far the labels move, and a
label pushed past the edge is clipped by the sheet rather than spilling onto the next
one.

The nudge is **saved** (`localStorage`, `kentaz.tagSheetOffset`). Drift is a property of
the printer, not of one print job; making the user rediscover it costs a sheet of forty
stickers every time.

**The calibration sheet is the cheap way in.** Forty empty outlines on plain paper, held
against a real sticker sheet, finds the drift for the price of one sheet of A4. It
carries no barcodes — it is checking alignment, not scanning — and prints a caption
recording the nudge that produced it, so a stack of test sheets stays legible.

**The print dialog must be set to Scale 100% and Margins None.** "Fit to page" rescales
the whole sheet and every label shifts. The studio says so on screen in sheet mode,
because there is no way to detect it from the page.

---

## Found while building

Three defects that would each have voided printed tags:

1. **The edit form dropped fields it did not list.** `products/[id]/edit` maps fetched
   variants field by field into local state; anything unlisted is lost on save. Caught
   while the design still had a separate `barcode` field. The SKU was already carried,
   but the pattern is a live hazard — noted in memory.

2. **"Duplicate variant" cloned the SKU.** Both product forms shallow-copy the source
   variant (`{ ...vs[idx] }`), which would put one code on two different sizes. The
   clone now clears `sku`. The hook also reassigns duplicates defensively.

3. **The POS resolved a product-level scan to `variantIndex: 0`.** Pre-existing bug:
   scanning a multi-variant product rang up the wrong size and decremented the wrong
   stock line. Variant SKUs now match first; a product-level barcode auto-selects only
   when there is exactly one variant, otherwise the picker opens rather than guessing.

---

## Verification

- 103/103 backend tests pass, 12 of them new: block allocation (12 variants → one
  `$inc`), existing SKUs never overwritten, blanks and duplicates filled, whitespace-only
  treated as blank, generated codes provably unable to collide with the `2…` range.
- The Code128 encoder round-trips 811 strings — real SKU shapes, both parities, and
  fuzzed input — through an independent decoder that verifies the checksum.
- `tsc --noEmit` and `next build` both pass; `/products/tags` prerenders.
- Printing checked by generating real PDFs from the actual print stylesheet and parsing
  `/MediaBox`, with the cell geometry measured in `print` media:
  - **thermal** — 45 tags → 45 pages, each **50 × 25 mm**, admin chrome absent
  - **sheet** — 45 tags → **2 pages of 210 × 297 mm**, 40 + 5 labels, every cell within
    0.2 mm of the L7654 spec
  - **nudge** — moves cells by exactly the millimetres asked, page stays A4, survives a
    reload
  - **calibration** — 1 A4 page, 40 outlines, no barcodes

  Chromium rounds the CSS page box to whole PostScript points (50 mm reads back as
  50.12, A4 as 209.89), so page sizes are asserted with tolerance rather than equality.

Still requires a human:

- Print one label on the shop's thermal printer and scan it into the POS to confirm it
  selects the correct variant.
- Print the calibration sheet on plain paper, hold it against a real L7654 sheet, and set
  the nudge if the printer drifts.

---

## Out of scope

- GS1 registration and externally valid barcodes
- Sticker sheets other than Avery L7654
- Printing prices on tags
- Barcode support for bookings, gift cards or bundles
