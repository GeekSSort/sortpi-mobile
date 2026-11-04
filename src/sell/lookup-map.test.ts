import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toScannedItem } from './lookup-map.ts';

const base = { variant: { id: 'v1', sku: 'SKU-1', name: 'Tea 2L' }, product: { name: 'Igloo Family Pack Tea' }, price: '306.8100' };

test('a plain barcode rings one item at the branch price', () => {
  const item = toScannedItem(base);
  assert.deepEqual(item, { variantId: 'v1', unitId: null, name: 'Igloo Family Pack Tea Tea 2L', sku: 'SKU-1', unitLabel: null, unitPrice: '306.8100' });
});

test('a carton barcode rings one carton at the carton price', () => {
  const item = toScannedItem({ ...base, unit: { id: 'u9', name: 'Carton' }, unit_price: '3681.7200' });
  assert.equal(item.unitId, 'u9');
  assert.equal(item.unitLabel, 'Carton');
  assert.equal(item.unitPrice, '3681.7200');
});

test('the variant name is not repeated when it equals the product name', () => {
  assert.equal(toScannedItem({ ...base, variant: { ...base.variant, name: 'Igloo Family Pack Tea' } }).name, 'Igloo Family Pack Tea');
});

test('an item sold by weight can be rung in parts, a carton of it cannot', () => {
  const kg = { ...base, product: { name: 'Rice', unit_allow_decimal: true, unit_short_name: 'kg' } };
  const item = toScannedItem(kg);
  assert.equal(item.allowDecimal, true);
  assert.equal(item.unitShort, 'kg');
  const carton = toScannedItem({ ...kg, unit: { id: 'u9', name: 'Sack' }, unit_price: '1800.0000' });
  assert.equal(carton.allowDecimal, undefined);
});
