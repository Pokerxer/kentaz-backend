# Kentaz label bridge

Prints product tags on the shop's XPrinter without going through the browser's
print dialog.

Run this on the machine the label printer is plugged into. The Tag Studio
(*Products → Print tags*) finds it by itself and prints straight to the printer
— no paper size to pick, no Orientation to guess, no "Scale: 100%" to remember.

**Why it exists.** A browser cannot hand bytes to a printer. It can only hand a
rendered *page* to the printer driver, and a cheap thermal driver then re-decides
the paper size and turns the page to fit its own idea of the media. That is the
sideways tag spanning two stickers, and no print stylesheet can overrule it. The
bridge speaks TSPL — the printer's own language — so the label size becomes an
instruction the printer obeys rather than a request the driver overrules. Full
reasoning in [`docs/thermal-printing-xprinter.md`](../../docs/thermal-printing-xprinter.md).

---

## One-time setup (Windows)

1. **Install Node.js** (LTS) from <https://nodejs.org> — accept every default.
2. **Install the XPrinter driver** for your exact model from
   <https://www.xprintertech.com> → Support → Driver. The printer must show up
   under *Settings → Bluetooth & devices → Printers & scanners*.
   Its paper size does **not** matter here — the bridge bypasses that entirely.
   The driver is needed only because Windows will not expose a print queue
   without one.
3. **Copy this folder** (`tools/label-bridge`) onto the till, e.g. to
   `C:\kentaz-label-bridge`.
4. **Start it.** Open that folder, type `cmd` in the address bar, press Enter,
   then run:

   ```
   node bridge.js
   ```

   It lists what it found and which queue it will use:

   ```
   Kentaz label bridge 1.0.0 listening on http://127.0.0.1:9110
   Platform: win32
   Printers:
     - Xprinter XP-365B
     - Microsoft Print to PDF
   Will default to: Xprinter XP-365B
   ```

5. **Open the Tag Studio** in Chrome or Edge. The thermal panel now reads
   *Direct printing is on*. Press **Calibrate labels** once, then
   **Print one test label**.

Leave the window open while printing — closing it stops the bridge.

There is no `npm install`. The bridge has no dependencies.

### Start it automatically at login

Press `Win + R`, type `shell:startup`, press Enter, and put a shortcut in that
folder pointing at:

```
cmd /c "cd /d C:\kentaz-label-bridge && node bridge.js"
```

---

## macOS / Linux

The same, through CUPS:

```sh
node bridge.js
```

Printer names come from `lpstat -a`, and jobs go out via `lp -o raw`. Add the
printer once in *System Settings → Printers & Scanners* first.

---

## Settings

Both optional, both environment variables.

| Variable | Default | What it does |
| --- | --- | --- |
| `KENTAZ_BRIDGE_PORT` | `9110` | Port on `127.0.0.1`. Change it only if something else already holds 9110 — the admin app must be told the same port. |
| `KENTAZ_BRIDGE_TOKEN` | *(empty)* | Requires callers to send an `x-bridge-token` header. Off by default: the bridge listens on loopback only, and the worst a rogue local page could do is waste a roll of labels. |

The bridge binds to `127.0.0.1` alone. Nothing on the shop network or the
internet can reach it.

---

## Checking it by hand

```sh
# Is it up, and what can it see?
curl http://127.0.0.1:9110/health

# Teach the printer the label pitch (fixes blank labels between tags)
curl -X POST http://127.0.0.1:9110/calibrate \
  -H 'content-type: application/json' \
  -d '{"label":{"widthMm":50,"heightMm":25,"gapMm":2}}'

# One label
curl -X POST http://127.0.0.1:9110/print \
  -H 'content-type: application/json' \
  -d '{"label":{"widthMm":50,"heightMm":25,"gapMm":2},
       "labels":[{"productName":"Sample Tote","size":"M","color":"Black",
                  "sku":"219000000001","copies":1}]}'
```

To read the commands without printing anything:

```sh
node print-test.js
```

---

## When something is wrong

| What you see | What it means |
| --- | --- |
| Studio says it is not connected | The bridge is not running, or Chrome is blocking it. Check the console window, then confirm `curl http://127.0.0.1:9110/health` answers. |
| `Could not open printer '…'` | The name is wrong. Run `/health` and use a name from its `printers` list exactly. |
| Nothing prints, no error shown | The queue is paused or offline. *Printers & scanners* → the printer → *Open print queue*, then clear it. |
| Two stickers advance per tag | The gap sensor does not know this roll. Press **Calibrate labels**, or hold the printer's Feed button until it advances one label and stops. |
| Bars print but will not scan | The label is too narrow for the SKU. The studio warns before printing — use a wider label. |
| `Port 9110 is already in use` | It is already running in another window. |

---

## Files

| File | What it is |
| --- | --- |
| `bridge.js` | The loopback HTTP server, and the raw write to the print queue. |
| `tspl.js` | Tag → TSPL. Pure functions, no I/O. |
| `print-test.js` | Renders sample jobs to stdout so you can read them. |
