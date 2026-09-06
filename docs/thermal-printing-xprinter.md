# Thermal printing on the shop's XPrinter

Why tags printed sideways across two stickers, why three rounds of print-CSS
fixes did not stop it, and what actually resolved it. Companion to
[`barcode-tags.md`](barcode-tags.md), which covers the tag itself.

## The symptom

On the 50 × 25 mm roll, one tag came out turned 90°, its long edge running along
the feed. It spanned two stickers, the die-cut gap cut the barcode in half, and
blank labels followed. Setup: **XPrinter, USB, Windows PC, Chrome.**

## The root cause

**A browser cannot send bytes to a printer.** It can only hand a rendered *page*
to the printer driver, together with a request for a paper size. What happens
next is the driver's decision, and by then the page has left.

Two things then go wrong, and they compound:

1. **The driver's stock wins.** If the queue has no die-cut stock matching the
   label, it prints on whatever stock it does have and scales or rotates the
   page to fit. `@page { size: 50mm 25mm }` is a request, not an instruction.
2. **Chrome infers orientation from the page shape.** A page wider than it is
   tall is sent as *landscape*. A 50 × 25 mm label is wider than it is tall, so
   Chrome asks for landscape on media the driver holds as 50 across × 25 down —
   and the driver rotates the content to satisfy it. The tag turns 90°, its
   50 mm now running along the feed, straddling the gap.

Which means the fix had to sit in the driver, not in the app. Three attempts
proved that the hard way:

| Attempt | What it did | Why it was not enough |
| --- | --- | --- |
| `@page` sized to the label | Stopped tags landing in an A4 corner | The driver still substituted its own stock |
| Absolutely-positioned `.tag-rotate` | Stopped the blank label after every tag | Real fix, unrelated axis — kept |
| Orientation 0/90/180/270 + transposed page | Could cancel the rotation *if* the driver held a stock at the transposed size too | Needed two stocks defined by hand, and a shop guessing between four settings on live labels |

The orientation control is a workaround for a decision made downstream. It can
work, but only after correct driver setup, and it cannot be verified from here.

## The resolution: speak the printer's language

XPrinter's label models are **TSPL/TSPL2** devices (the TSC dialect; they also
emulate EPL, ZPL and DPL). In TSPL the media size is not a request:

```
SIZE 50 mm,25 mm
GAP 2 mm,0 mm
DIRECTION 1
CLS
TEXT 176,6,"1",0,1,1,"KENTAZ"
BARCODE 49,58,"128",60,2,0,3,6,"219000000001"
PRINT 1,2
```

There is no page, no paper size to substitute, no orientation to infer and
nothing downstream that re-reads any of it. `SIZE` and `GAP` *are* the label.

`tools/label-bridge` runs on the till, listens on `127.0.0.1` only, and writes
these bytes to the Windows print queue with the datatype set to **RAW** — which
tells the spooler to pass them through untouched rather than run them through
the driver's renderer, the renderer that was doing the rotating. On
macOS/Linux the same job goes out as `lp -o raw`.

Setup and troubleshooting: [`tools/label-bridge/README.md`](../tools/label-bridge/README.md).

### What this also bought

- **Better bars.** The bridge takes the widest module the label affords rather
  than a fixed width: 3 dots (0.375 mm) on the 50 mm roll, against a 0.19 mm
  scan floor. The browser path rasterises to whatever the driver's DPI happens
  to be.
- **Quiet zones are budgeted, not incidental.** `BARCODE` draws from `x` and
  adds nothing, so the 10 modules each side are reserved explicitly, and a
  symbol that would eat them is reported as not fitting.
- **Copies cost nothing.** `PRINT 1,n` repeats a label in firmware; the browser
  path had to emit and rasterise `n` pages.
- **Gap calibration is reachable.** `GAPDETECT` teaches the printer the pitch of
  the loaded roll — the actual fix for blank stickers between tags, which no
  amount of layout work addresses.

## If you would rather not run the bridge

The browser path still works and is unchanged. It needs the driver set up by
hand, and the studio spells this out on screen. In short, on Windows:

1. Install the **label** driver for the exact model from
   <https://www.xprintertech.com> — not a generic or receipt driver. XPrinter's
   Windows drivers are Seagull-built; stock is defined under *Printing
   Preferences → Page Setup / Stock → New*.
2. Define a die-cut stock at exactly the label size, then define it **again**
   under *Printer properties → Advanced → Printing Defaults*. Applications
   commonly read that second copy, and a shop that sets only the first sees no
   change at all.
3. Calibrate the gap sensor — hold **Feed** until it advances one label and
   stops.
4. In Chrome: that paper, **Scale 100%** (never "Fit to page"), **Margins:
   None**, background graphics on.
5. Print one test label. If it is still turned, work the Orientation control in
   the studio until a tag lands square on one sticker, then leave it.

Chrome is required — Firefox ignores custom `@page` sizes.

## Verified, and not

Checked on macOS against a stub spooler, 2026-09:

- TSPL geometry holds for every studio label size (50 × 25, 40 × 30, 58 × 40,
  100 × 50, 120 × 100): symbol and both quiet zones inside the label, vertical
  stack inside the label, text never off the edge.
- 20 × 15 mm with a 12-digit SKU is correctly reported as not fitting — it needs
  30.3 mm — rather than printing a symbol that silently will not scan.
- Bridge endpoints: health, CORS/Private-Network preflight, printer selection,
  the exact bytes reaching the spooler, the 200-label cap, unknown-printer
  rejection, malformed JSON, temp-file cleanup.

**Not verified:** the Windows raw-spooler path
(`OpenPrinter`/`StartDocPrinter`/`WritePrinter` with `pDataType = "RAW"`), and
printing to a physical XPrinter. Neither is reachable from a Mac. The first real
test is **Calibrate labels**, then **Print one test label**, on the shop's till.

## Sources

- [TSPL/TSPL2 programming manual (TSC)](https://www.servopack.de/support/tsc/TSPL_TSPL2_Programming.pdf) — `SIZE`, `GAP`, `DIRECTION`, `BARCODE`, `GAPDETECT`
- [Send raw data to printers using the Win32 API (Microsoft)](https://learn.microsoft.com/en-us/previous-versions/troubleshoot/windows/win32/win32-raw-data-to-printer)
- [RAW data type (Microsoft printer driver docs)](https://learn.microsoft.com/en-us/windows-hardware/drivers/print/raw-data-type)
- [What is raw printing (QZ Tray)](https://github.com/qzind/tray/wiki/What-is-Raw-Printing)
- [Xprinter Windows printer drivers by Seagull](https://www.bartendersoftware.com/resources/printer-drivers/xprinter) — where label stock is defined
- [XP-365B product page (Xprinter)](https://www.xprintertech.com/xp-365b-xp-365bm-3-inch-label-printer) — TSPL/EPL/ZPL/DPL support, 203 dpi
- [Thermal label gap sensing (BarcodeFactory)](https://www.barcodefactory.com/solutions/stock-labels/thermal-label-gap-sensing)
- [Barcode label printing sideways (Lightspeed Retail)](https://x-series-support.lightspeedhq.com/hc/en-us/articles/25533870668059-Barcode-label-printing-sideways)
