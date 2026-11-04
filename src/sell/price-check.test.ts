import assert from 'node:assert/strict';
import { test } from 'node:test';

import { notFoundText, toPriceCheck } from './price-check.ts';

const base = { variant: { id: 'v', sku: 'SKU-1', name: 'Default' }, product: { name: 'Tea 200ml', unit_allow_decimal: false, unit_short_name: 'pcs' }, price: '503.5100' };

test('a price check shows the item, its price and the unit', () => {
  const c = toPriceCheck(base);
  assert.equal(c.name, 'Tea 200ml');
  assert.equal(c.price, '503.5100');
  assert.equal(c.unitShort, 'pcs');
  assert.equal(c.mrp, null);
  assert.equal(c.pack, null);
});

test('the printed price shows only when it is higher, with what the customer saves', () => {
  const up = toPriceCheck({ ...base, variant: { ...base.variant, mrp: '550' } });
  assert.equal(up.mrp, '550');
  assert.equal(up.saving, '46.49');
  assert.equal(toPriceCheck({ ...base, variant: { ...base.variant, mrp: '500' } }).mrp, null);
  assert.equal(toPriceCheck({ ...base, variant: { ...base.variant, mrp: null } }).saving, null);
});

test('a kind of an item is named, the Default one is not, and a carton barcode gives the pack price', () => {
  assert.equal(toPriceCheck({ ...base, variant: { ...base.variant, name: 'Large' } }).name, 'Tea 200ml Large');
  const pack = toPriceCheck({ ...base, unit: { id: 'u', name: 'Carton' }, unit_price: '6000' });
  assert.deepEqual(pack.pack, { name: 'Carton', price: '6000' });
});

test('not found asks the customer to see the counter', () => {
  assert.deepEqual(notFoundText(' 123 '), { text: 'We could not find “{code}”. Please ask at the counter.', vars: { code: '123' } });
});
