import assert from 'node:assert/strict';
import { test } from 'node:test';

import { posDevice } from './pos-device.ts';

test('recognizes Android POS brands and limits fixed paper defaults to known handheld models', () => {
  assert.equal(posDevice(true, ' PAX Technology ', null, 'A920 Pro')?.suggestedPaper, '58mm');
  assert.equal(posDevice(true, null, 'Telpo', 'TPS900')?.suggestedPaper, '58mm');
  assert.equal(posDevice(true, 'Telpo', null, 'C9')?.suggestedPaper, undefined);
  assert.equal(posDevice(true, null, 'zebra', 'ET45')?.name, 'Zebra');
  assert.equal(posDevice(true, 'iMin', null, 'Falcon 2')?.suggestedPaper, undefined);
  assert.equal(posDevice(true, 'Sunmi', null, 'D3 MINI')?.name, 'SUNMI');
  assert.equal(posDevice(true, 'UROVO', null, 'i9100')?.suggestedPaper, '58mm');
  assert.equal(posDevice(true, 'Newland Payment', null, 'N950')?.suggestedPaper, '58mm');
  assert.equal(posDevice(true, 'Elo Touch', null, 'Z30')?.name, 'Elo');
  assert.equal(posDevice(false, 'Sunmi'), null);
  assert.equal(posDevice(true, 'Google', 'Pixel'), null);
});
