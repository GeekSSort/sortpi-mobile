import assert from 'node:assert/strict';
import { test } from 'node:test';

import { receiptPrinterRoute, sunmiPrintRecovery, sunmiPrinterStatus } from './printer-status.ts';
import { sunmiScanPair } from './sunmi-scan-pair.ts';

test('only one path adds the product, regardless of which scanner output arrives first', () => {
  const accept = sunmiScanPair();
  assert.equal(accept('AB', 'broadcast', 0), true);
  assert.equal(accept('AB', 'keyboard', 10, false), false);
  assert.equal(accept('0012', 'keyboard', 50), true);
  assert.equal(accept('0012', 'broadcast', 60), false);
});

test('an ignored keyboard submit leaves the native scan eligible, and repeat scans are independent', () => {
  const accept = sunmiScanPair();
  assert.equal(accept('X', 'keyboard', 0, false), true);
  assert.equal(accept('X', 'broadcast', 10), true);
  assert.equal(accept('X', 'broadcast', 20), true);
  assert.equal(accept('X', 'keyboard', 30, false), false);
  assert.equal(accept('X', 'keyboard', 400), true);
});

test('SUNMI printer status and recovery distinguish paper, cover, cutter and availability', () => {
  assert.equal(sunmiPrinterStatus(4), 'Out of paper');
  assert.match(sunmiPrintRecovery(4) ?? '', /Load a receipt roll/);
  assert.equal(sunmiPrinterStatus(6), 'Cover open');
  assert.match(sunmiPrintRecovery(6) ?? '', /Close the built-in printer cover/);
  assert.equal(sunmiPrinterStatus(505), 'Unavailable');
  assert.match(sunmiPrintRecovery(null) ?? '', /external printer/);
  assert.equal(sunmiPrintRecovery(8), undefined);
});

test('regular Android phones and explicitly selected external printing keep the system dialog', () => {
  assert.equal(receiptPrinterRoute('80mm', null, { native: false, sunmi: false, useSystem: false }), 'android');
  assert.equal(receiptPrinterRoute('80mm', '80mm', { native: true, sunmi: true, useSystem: true }), 'android');
  assert.equal(receiptPrinterRoute('a4', null, { native: true, sunmi: true, useSystem: false }), 'android');
  assert.equal(receiptPrinterRoute('80mm', '80mm', { native: true, sunmi: true, useSystem: false }), 'built-in');
  assert.equal(receiptPrinterRoute('80mm', null, { native: true, sunmi: true, useSystem: false }), 'check-sunmi');
});
