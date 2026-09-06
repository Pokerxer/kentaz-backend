#!/usr/bin/env node
'use strict';

/**
 * Kentaz label bridge — the shop till's printer, reachable from the admin app.
 *
 * Browsers cannot send bytes to a printer; they can only hand a rendered page
 * to the operating system and hope the driver agrees about paper size and
 * orientation. On a cheap USB thermal printer the driver does not agree, and no
 * amount of print CSS can make it. See docs/thermal-printing-xprinter.md.
 *
 * So this runs on the machine the printer is plugged into, listens on loopback
 * only, and passes TSPL straight to the print queue in RAW mode — bypassing the
 * driver's page rendering entirely. The printer is told the media size in its
 * own language and there is nothing left to negotiate.
 *
 * Zero dependencies on purpose: a shop till should be able to run this with
 * nothing but Node installed, and a `node bridge.js` that needs no
 * `npm install` is one that still works in two years.
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { renderJob, renderCalibration } = require('./tspl');

const VERSION = '1.0.0';
const PORT = Number(process.env.KENTAZ_BRIDGE_PORT || 9110);

/**
 * Optional shared secret. Loopback-only binding already means a remote attacker
 * cannot reach this, and the worst a malicious local page could do is waste a
 * roll of labels — so the token is opt-in rather than required, and a shop that
 * wants it sets the same value here and in the admin app.
 */
const TOKEN = process.env.KENTAZ_BRIDGE_TOKEN || '';

/** The studio's own cap, enforced again here: the bridge is the last gate. */
const MAX_LABELS = 200;

const isWindows = process.platform === 'win32';
let tempCounter = 0;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, ...options }, (err, stdout, stderr) => {
      if (err) {
        err.message = `${err.message}\n${String(stderr || '').trim()}`.trim();
        reject(err);
      } else {
        resolve(String(stdout || ''));
      }
    });
  });
}

// ── Talking to the print queue ───────────────────────────────────────────────

/**
 * Windows has no command that sends raw bytes to a *queue* — `copy /b` only
 * reaches a shared printer, which means asking the shop to share the printer
 * first. The spooler API underneath has no such requirement, so this reaches it
 * the one way that needs nothing installed: a PowerShell shim over
 * OpenPrinter/StartDocPrinter/WritePrinter with the datatype set to RAW.
 *
 * RAW is the whole point. It tells the spooler to hand the bytes to the printer
 * untouched instead of running them through the driver's renderer — the same
 * renderer that was turning our tag sideways.
 */
const RAW_PRINT_PS1 = `param([Parameter(Mandatory=$true)][string]$Printer,
                             [Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class KentazRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter")]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter")]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter")]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter")]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void Send(string printer, byte[] bytes) {
    IntPtr handle;
    if (!OpenPrinter(printer, out handle, IntPtr.Zero))
      throw new Exception("Could not open printer '" + printer + "' (error " + Marshal.GetLastWin32Error() + ")");
    try {
      DOCINFO info = new DOCINFO();
      info.pDocName = "Kentaz product tags";
      info.pDataType = "RAW";
      if (!StartDocPrinter(handle, 1, info))
        throw new Exception("StartDocPrinter failed (error " + Marshal.GetLastWin32Error() + ")");
      try {
        if (!StartPagePrinter(handle))
          throw new Exception("StartPagePrinter failed (error " + Marshal.GetLastWin32Error() + ")");
        IntPtr buffer = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, buffer, bytes.Length);
          int written;
          if (!WritePrinter(handle, buffer, bytes.Length, out written))
            throw new Exception("WritePrinter failed (error " + Marshal.GetLastWin32Error() + ")");
        } finally {
          Marshal.FreeCoTaskMem(buffer);
        }
        EndPagePrinter(handle);
      } finally {
        EndDocPrinter(handle);
      }
    } finally {
      ClosePrinter(handle);
    }
  }
}
'@
[KentazRawPrinter]::Send($Printer, [System.IO.File]::ReadAllBytes($File))
`;

let cachedScriptPath = null;

async function rawPrintScript() {
  if (cachedScriptPath && fs.existsSync(cachedScriptPath)) return cachedScriptPath;
  const target = path.join(os.tmpdir(), 'kentaz-rawprint.ps1');
  await fs.promises.writeFile(target, RAW_PRINT_PS1, 'utf8');
  cachedScriptPath = target;
  return target;
}

/**
 * TSPL is ASCII, so latin1 is a byte-for-byte write. Going through a file
 * rather than stdin keeps the payload away from PowerShell's own encoding
 * conversions, which mangle high bytes on the way in.
 */
async function sendRaw(printer, payload) {
  const file = path.join(os.tmpdir(), `kentaz-label-${process.pid}-${tempCounter++}.prn`);
  await fs.promises.writeFile(file, payload, 'latin1');
  try {
    if (isWindows) {
      const script = await rawPrintScript();
      await run('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', script, '-Printer', printer, '-File', file,
      ]);
    } else {
      // CUPS: `-o raw` is the same instruction — do not filter, do not render.
      await run('lp', ['-d', printer, '-o', 'raw', file]);
    }
  } finally {
    await fs.promises.unlink(file).catch(() => {});
  }
}

async function listPrinters() {
  try {
    if (isWindows) {
      const out = await run('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        'Get-CimInstance -ClassName Win32_Printer | Select-Object -ExpandProperty Name',
      ]);
      return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    const out = await run('lpstat', ['-a']);
    return out.split(/\r?\n/).map(line => line.split(/\s+/)[0]).filter(Boolean);
  } catch {
    // No queues, or no spooler running. An empty list is a legitimate answer;
    // the admin page shows it as "no printers found" rather than an error.
    return [];
  }
}

/**
 * The queue most likely to be the label printer. Never guessed silently — the
 * admin page shows which one was chosen and lets the shop pick another, because
 * a till with both a receipt printer and a label printer will have two.
 */
function guessLabelPrinter(printers) {
  const looksLikeLabel = /xprinter|xp-\s*\d|label|tsc|gprinter|zebra|godex/i;
  return printers.find(name => looksLikeLabel.test(name)) || printers[0] || null;
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-bridge-token');
  // Chrome's Private Network Access preflight: a page served over the network
  // reaching 127.0.0.1 is refused without this, which is exactly the case when
  // the admin app is not being run locally.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      // A tag job is kilobytes. Anything past this is a mistake or an abuse.
      if (size > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Body is not valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function validateLabel(label) {
  const width = Number(label && label.widthMm);
  const height = Number(label && label.heightMm);
  const gap = Number(label && label.gapMm != null ? label.gapMm : 2);
  if (!(width >= 20 && width <= 120)) throw new Error('widthMm must be between 20 and 120');
  if (!(height >= 15 && height <= 100)) throw new Error('heightMm must be between 15 and 100');
  if (!(gap >= 0 && gap <= 10)) throw new Error('gapMm must be between 0 and 10');
  return { widthMm: width, heightMm: height, gapMm: gap };
}

async function resolvePrinter(requested) {
  const printers = await listPrinters();
  if (requested) {
    // Matched case-insensitively: Windows queue names are displayed with the
    // casing the driver chose, and staff retype them.
    const hit = printers.find(name => name.toLowerCase() === String(requested).toLowerCase());
    if (hit) return hit;
    if (printers.length === 0) return String(requested); // no spooler listing; try anyway
    throw new Error(`No printer named "${requested}". Available: ${printers.join(', ')}`);
  }
  const guess = guessLabelPrinter(printers);
  if (!guess) throw new Error('No printers are installed on this machine');
  return guess;
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://127.0.0.1');

  if (TOKEN && url.pathname !== '/health' && req.headers['x-bridge-token'] !== TOKEN) {
    json(res, 401, { ok: false, error: 'Bad or missing x-bridge-token' });
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const printers = await listPrinters();
      json(res, 200, {
        ok: true,
        name: 'kentaz-label-bridge',
        version: VERSION,
        platform: process.platform,
        requiresToken: Boolean(TOKEN),
        printers,
        suggestedPrinter: guessLabelPrinter(printers),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/print') {
      const body = await readBody(req);
      if (!Array.isArray(body.labels) || body.labels.length === 0) {
        json(res, 400, { ok: false, error: 'labels must be a non-empty array' });
        return;
      }
      // Cheap checks first, and the cap before the spooler is even consulted:
      // an oversized job should say so, not blame a missing printer.
      const label = validateLabel(body.label);
      const job = renderJob({ label, options: body.options, labels: body.labels });

      if (job.printed > MAX_LABELS) {
        json(res, 400, {
          ok: false,
          error: `${job.printed} labels is over the ${MAX_LABELS}-label limit for one job`,
        });
        return;
      }

      const printer = await resolvePrinter(body.printer);
      await sendRaw(printer, job.tspl);
      json(res, 200, { ok: true, printer, printed: job.printed, warnings: job.warnings });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/calibrate') {
      const body = await readBody(req);
      const label = validateLabel(body.label);
      const printer = await resolvePrinter(body.printer);
      await sendRaw(printer, renderCalibration(label));
      json(res, 200, { ok: true, printer });
      return;
    }

    json(res, 404, { ok: false, error: `No route for ${req.method} ${url.pathname}` });
  } catch (err) {
    json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Loopback only. This is not a service for the network to reach — it is the
// admin page in *this* browser talking to the printer on *this* desk.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Kentaz label bridge ${VERSION} listening on http://127.0.0.1:${PORT}`);
  console.log(`Platform: ${process.platform}${TOKEN ? ' · token required' : ''}`);
  listPrinters().then(printers => {
    if (printers.length === 0) {
      console.log('No printers found. Install the XPrinter driver, then restart this bridge.');
      return;
    }
    console.log('Printers:');
    for (const name of printers) console.log(`  - ${name}`);
    const guess = guessLabelPrinter(printers);
    if (guess) console.log(`Will default to: ${guess}`);
  });
});

server.on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — the bridge may already be running.`);
    process.exit(1);
  }
  throw err;
});
