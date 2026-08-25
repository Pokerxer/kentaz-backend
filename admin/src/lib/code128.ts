/**
 * Code128 encoder.
 *
 * Turns a SKU into the bars a scanner reads. Pure — no React, no DOM — so it
 * can be checked against known-good output without rendering anything.
 *
 * Code128 rather than EAN-13 because the SKU *is* the barcode here, and it
 * must come back off the scanner byte-for-byte identical to what is stored.
 * EAN-13 cannot do that: it demands 13 numeric digits with a valid check
 * digit, so encoding a SKU like `219218111005` would mean altering the number
 * to make its check digit work — and the altered number would no longer match
 * anything at the till.
 *
 * A symbol is 11 modules, written as six alternating widths starting with a
 * bar: "212222" is 2 bars, 1 space, 2 bars, 2 spaces, 2 bars, 2 spaces.
 */

// Widths for values 0-106. Every entry sums to 11 except the stop, which is 13.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const START_B = 104;
const START_C = 105;
const CODE_C = 99;   // switch to subset C while in B
const STOP = 106;

/** The range subset B can represent: printable ASCII. */
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

/**
 * The symbol values for a string, choosing subsets to keep the bars short.
 *
 * Subset C packs two digits into one symbol, which matters more than it
 * sounds: a 12-digit SKU is 101 modules in C but 178 in B. Across a 32 mm
 * label that is the difference between a 0.32 mm bar and a 0.18 mm one — and
 * cheap scanners start failing below about 0.19 mm.
 */
function toValues(data: string): number[] {
  const allDigits = /^\d+$/.test(data);

  if (allDigits && data.length % 2 === 0) {
    const values = [START_C];
    for (let i = 0; i < data.length; i += 2) values.push(Number(data.slice(i, i + 2)));
    return values;
  }

  if (allDigits) {
    // Odd length: spend one symbol on the leading digit in B, then switch to C
    // for the even remainder. The switch is only emitted when a pair actually
    // follows — a dangling CODE_C before the check digit makes decoders read
    // the check as data, and the checksum then fails validation.
    const values: number[] = [START_B, data.charCodeAt(0) - 32];
    if (data.length > 2) values.push(CODE_C);
    for (let i = 1; i < data.length; i += 2) values.push(Number(data.slice(i, i + 2)));
    return values;
  }

  const values = [START_B];
  for (const ch of data) values.push(ch.charCodeAt(0) - 32);
  return values;
}

/** True if this string can be encoded at all. */
export function isEncodable(data: string): boolean {
  return typeof data === 'string' && data.length > 0 && PRINTABLE_ASCII.test(data);
}

/**
 * Encode a string as a run of '0' (space) and '1' (bar) modules.
 * Throws on input Code128 cannot represent — a barcode drawn from bad input
 * would look fine on the label and fail silently at the till.
 */
export function encodeCode128(data: string): string {
  if (!isEncodable(data)) {
    throw new Error(`Cannot encode as Code128: "${data}"`);
  }

  const values = toValues(data);

  // Checksum: the start value plus each data symbol weighted by its position,
  // modulo 103. The start symbol itself carries weight 0.
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += i * values[i];
  values.push(sum % 103);

  values.push(STOP);

  let modules = '';
  for (const value of values) {
    const widths = PATTERNS[value];
    // Widths alternate bar, space, bar, … always starting with a bar.
    for (let i = 0; i < widths.length; i++) {
      modules += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]));
    }
  }
  return modules;
}

/** How many modules `data` will occupy. */
export function moduleCount(data: string): number {
  return encodeCode128(data).length;
}
