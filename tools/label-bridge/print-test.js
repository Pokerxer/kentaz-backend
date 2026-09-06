#!/usr/bin/env node
'use strict';

/**
 * Renders sample jobs to stdout instead of to a printer.
 *
 * A label that comes out wrong is expensive to debug on a roll — this is the
 * cheap version: read the commands, check the geometry, then print. Every
 * coordinate is in dots at 8 per millimetre, so a 50 × 25 mm label is
 * 400 × 200 and nothing may exceed that.
 *
 *   npm run print-test
 */

const { renderJob, renderCalibration, code128Modules, DOTS_PER_MM } = require('./tspl');

const SIZES = [
  { widthMm: 50, heightMm: 25, gapMm: 2 },   // the shop's roll
  { widthMm: 40, heightMm: 30, gapMm: 2 },   // a taller, narrower stock
  { widthMm: 100, heightMm: 50, gapMm: 3 },  // the biggest preset
];

const LABELS = [
  { productName: 'Sample Tote', size: 'M', color: 'Black', sku: '219000000001', copies: 1 },
  // A name far past what any of these labels can hold, to prove it truncates
  // rather than running off the edge.
  { productName: 'Kentaz Signature Cashmere Wrap Coat, Limited Edition', size: 'L', color: 'Ivory', sku: '219000000002', copies: 2 },
  // No variant axes — the meta line falls back to a dash.
  { productName: 'Gift Card', sku: '219000000003', copies: 1 },
];

for (const label of SIZES) {
  const dots = `${label.widthMm * DOTS_PER_MM} x ${label.heightMm * DOTS_PER_MM} dots`;
  console.log(`\n${'='.repeat(72)}`);
  console.log(`${label.widthMm} x ${label.heightMm} mm, ${label.gapMm} mm gap  (${dots})`);
  console.log('='.repeat(72));

  const job = renderJob({ label, labels: LABELS });
  console.log(job.tspl);
  console.log(`-- ${job.printed} labels`);
  for (const warning of job.warnings) console.log(`-- WARNING ${warning}`);
}

console.log(`\n${'='.repeat(72)}`);
console.log('Calibration (50 x 25 mm)');
console.log('='.repeat(72));
console.log(renderCalibration(SIZES[0]));

console.log('='.repeat(72));
console.log('Code128 module counts — the width budget the layout works against');
console.log('='.repeat(72));
for (const value of ['219000000001', '21900000000', 'KZS-M-GOL-01']) {
  const modules = code128Modules(value);
  const widths = [2, 3, 4]
    .map(n => `${n}dot=${(modules * n / DOTS_PER_MM).toFixed(1)}mm`)
    .join('  ');
  console.log(`  ${value.padEnd(14)} ${String(modules).padStart(4)} modules   ${widths}`);
}
