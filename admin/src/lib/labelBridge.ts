/**
 * Client for the local label bridge (`tools/label-bridge`).
 *
 * The browser cannot hand bytes to a printer — only a rendered page to a
 * driver, which then re-decides the paper size and turns the page to fit its
 * own idea of the media. On the shop's USB XPrinter that is the sideways tag
 * spanning two stickers, and it is not reachable from CSS. See
 * docs/thermal-printing-xprinter.md.
 *
 * So when the bridge is running on the same machine, tags go to it instead and
 * the printer is driven in its own language. Everything here degrades quietly:
 * a shop without the bridge sees the browser print path exactly as before, and
 * a probe that fails is an absence, not an error.
 */

const PORT_STORAGE_KEY = 'kentaz.labelBridgePort';
const PRINTER_STORAGE_KEY = 'kentaz.labelBridgePrinter';

export const DEFAULT_BRIDGE_PORT = 9110;

/**
 * Long enough for a cold PowerShell to enumerate printers on a tired till,
 * short enough that a shop *without* the bridge is not staring at a spinner.
 */
const PROBE_TIMEOUT_MS = 2500;
const PRINT_TIMEOUT_MS = 20000;

export interface BridgeInfo {
  version: string;
  platform: string;
  printers: string[];
  suggestedPrinter: string | null;
  requiresToken: boolean;
}

export interface BridgeLabel {
  productName: string;
  size?: string;
  color?: string;
  sku?: string;
  copies: number;
}

export interface BridgeLabelSize {
  widthMm: number;
  heightMm: number;
  gapMm: number;
}

export interface PrintResult {
  printer: string;
  printed: number;
  warnings: string[];
}

/** 127.0.0.1 rather than "localhost": no DNS, and no IPv6 ::1 mismatch. */
function baseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

function readNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw ? Number(JSON.parse(raw)) : NaN;
    return Number.isInteger(value) && value > 0 && value < 65536 ? value : fallback;
  } catch {
    return fallback;
  }
}

export function readBridgePort(): number {
  return readNumber(PORT_STORAGE_KEY, DEFAULT_BRIDGE_PORT);
}

export function readBridgePrinter(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PRINTER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string) : null;
  } catch {
    return null;
  }
}

export function writeBridgePrinter(printer: string | null): void {
  try {
    if (printer) window.localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
    else window.localStorage.removeItem(PRINTER_STORAGE_KEY);
  } catch {
    // Choosing a printer still works for this session even if it cannot be saved.
  }
}

async function request<T>(
  port: number,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl(port)}${path}`, {
      ...init,
      signal: controller.signal,
      // The bridge is not a session-bearing service, and sending credentials
      // would force it to name an exact origin in its CORS reply.
      credentials: 'omit',
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) {
      throw new Error(body?.error || `Bridge returned ${response.status}`);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Is the bridge there? `null` means no — which is the normal state for a shop
 * that prints through the browser, so it is never surfaced as a failure.
 */
export async function probeBridge(port = readBridgePort()): Promise<BridgeInfo | null> {
  try {
    const body = await request<BridgeInfo & { name: string }>(
      port,
      '/health',
      { method: 'GET' },
      PROBE_TIMEOUT_MS,
    );
    // Something else could be sitting on this port. Only our own bridge counts.
    if (body.name !== 'kentaz-label-bridge') return null;
    return {
      version: body.version,
      platform: body.platform,
      printers: body.printers || [],
      suggestedPrinter: body.suggestedPrinter ?? null,
      requiresToken: Boolean(body.requiresToken),
    };
  } catch {
    // Not running, blocked, or a different service. All the same to the caller.
    return null;
  }
}

export async function printViaBridge(
  labels: BridgeLabel[],
  label: BridgeLabelSize,
  printer: string | null,
  port = readBridgePort(),
): Promise<PrintResult> {
  const body = await request<PrintResult>(
    port,
    '/print',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printer: printer || undefined, label, labels }),
    },
    PRINT_TIMEOUT_MS,
  );
  return { printer: body.printer, printed: body.printed, warnings: body.warnings || [] };
}

/**
 * Teach the printer the pitch of the roll it is loaded with. This is the fix
 * for blank stickers between tags, and for a tag that starts halfway down the
 * label — the printer cannot place anything correctly until it knows where one
 * label ends.
 */
export async function calibrateViaBridge(
  label: BridgeLabelSize,
  printer: string | null,
  port = readBridgePort(),
): Promise<string> {
  const body = await request<{ printer: string }>(
    port,
    '/calibrate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printer: printer || undefined, label }),
    },
    PRINT_TIMEOUT_MS,
  );
  return body.printer;
}
