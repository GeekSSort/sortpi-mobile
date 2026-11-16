import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bluetoothErrorText, parseSavedPrinter, serializePrinter, sortPaired, withViewport } from './bluetooth-printer.ts';

test('a saved printer round-trips and its address is upper case', () => {
  const raw = serializePrinter({ name: 'Mobile Printer-0A5E', address: 'aa:bb:cc:dd:0a:5e' });
  assert.deepEqual(parseSavedPrinter(raw), { name: 'Mobile Printer-0A5E', address: 'AA:BB:CC:DD:0A:5E' });
});

test('an iPhone printer identifier (a UUID) is kept, in upper case', () => {
  const raw = serializePrinter({ name: 'Mobile Printer-0A5E', address: '0f3a9c1e-77b2-4c3d-9a10-5d6e7f8a9b0c' });
  assert.deepEqual(parseSavedPrinter(raw), { name: 'Mobile Printer-0A5E', address: '0F3A9C1E-77B2-4C3D-9A10-5D6E7F8A9B0C' });
});

test('nothing, junk or a bad address means no printer is chosen', () => {
  assert.equal(parseSavedPrinter(null), null);
  assert.equal(parseSavedPrinter(''), null);
  assert.equal(parseSavedPrinter('not json'), null);
  assert.equal(parseSavedPrinter('{"name":"x"}'), null);
  assert.equal(parseSavedPrinter('{"name":"x","address":"12345"}'), null);
  assert.equal(parseSavedPrinter('{"name":"x","address":"0f3a9c1e-77b2-4c3d-9a10"}'), null);
});

test('a missing name falls back to the address', () => {
  assert.equal(parseSavedPrinter('{"address":"AA:BB:CC:DD:0A:5E"}')?.name, 'AA:BB:CC:DD:0A:5E');
});

test('receipt printers are listed before other paired devices', () => {
  const sorted = sortPaired([
    { name: 'Earbuds', address: '11:11:11:11:11:11', printer: false },
    { name: 'Mobile Printer-0A5E', address: '22:22:22:22:22:22', printer: true },
    { name: 'Car', address: '33:33:33:33:33:33', printer: false },
  ]);
  assert.deepEqual(sorted.map((d) => d.name), ['Mobile Printer-0A5E', 'Car', 'Earbuds']);
});

test('every native error code has words a shopkeeper can act on', () => {
  for (const code of ['ERR_BLUETOOTH_PERMISSION', 'ERR_BLUETOOTH_OFF', 'ERR_BLUETOOTH_UNAVAILABLE', 'ERR_BLUETOOTH_CONNECT', undefined, 'SOMETHING_ELSE']) {
    assert.ok(bluetoothErrorText(code).length > 20);
  }
  assert.notEqual(bluetoothErrorText('ERR_BLUETOOTH_OFF'), bluetoothErrorText(undefined));
});

test('a page with no viewport tag gets one, a page that has one is left alone', () => {
  const bare = '<!doctype html><html><body>hi</body></html>';
  assert.match(withViewport(bare), /^<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.ok(withViewport(bare).endsWith(bare));
  const own = '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head></html>';
  assert.equal(withViewport(own), own);
  const single = "<meta name='viewport' content='width=320'>";
  assert.equal(withViewport(single), single);
});
