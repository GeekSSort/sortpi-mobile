import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeMovement, direction, itemName, signedQuantity, sourceOf, TYPE_CHIPS } from './logic.ts';

test('every kind of movement the server lists has plain words, and an unknown one is spelled out', () => {
  for (const t of ['OPENING', 'PURCHASE', 'SALE', 'SALE_RETURN', 'SALE_CANCEL', 'SALE_RETURN_WITHDRAW', 'PURCHASE_RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'DAMAGE', 'EXPIRED', 'PRODUCTION', 'PRODUCTION_USE']) assert.equal(describeMovement(t).known, true, t);
  const odd = describeMovement('WRITE_OFF_OLD');
  assert.equal(odd.known, false);
  assert.equal(odd.words, 'Write off old');
  assert.equal(describeMovement('DAMAGE').tone, 'bad');
  assert.equal(describeMovement('SALE').tone, 'out');
});

test('a quantity shows its sign and unit, whole or in parts', () => {
  assert.equal(signedQuantity({ quantity: '-1.000', unit_short_name: 'pcs', unit_allow_decimal: false }), '−1 pcs');
  assert.equal(signedQuantity({ quantity: '244.000', unit_short_name: 'pcs', unit_allow_decimal: false }), '+244 pcs');
  assert.equal(signedQuantity({ quantity: '-2.500', unit_short_name: 'kg', unit_allow_decimal: true }), '−2.5 kg');
  assert.equal(signedQuantity({ quantity: '3.000', unit_short_name: '', unit_allow_decimal: false }), '+3');
});

test('direction, item names and the chips', () => {
  assert.equal(direction('-1.000'), 'out');
  assert.equal(direction('5.000'), 'in');
  assert.equal(direction('0.000'), 'none');
  assert.equal(itemName({ product_name: 'Tea', variant_name: 'Default' }), 'Tea');
  assert.equal(itemName({ product_name: 'Tea', variant_name: '500g' }), 'Tea 500g');
  assert.equal(TYPE_CHIPS[0].type, undefined);
  assert.equal(new Set(TYPE_CHIPS.map((c) => c.id)).size, TYPE_CHIPS.length);
});

test('a sale or purchase row opens its source only for someone who may', () => {
  assert.deepEqual(sourceOf({ reference_type: 'SALE', reference_id: 's1' }, ['sale.view_own']), { route: '/sale/[id]', id: 's1' });
  assert.equal(sourceOf({ reference_type: 'SALE', reference_id: 's1' }, ['inventory.view_movements']), null);
  assert.deepEqual(sourceOf({ reference_type: 'PURCHASE', reference_id: 'p1' }, ['purchase.view']), { route: '/purchase/[id]', id: 'p1' });
  assert.equal(sourceOf({ reference_type: 'ADJUSTMENT', reference_id: 'a1' }, ['sale.view']), null);
  assert.equal(sourceOf({ reference_type: 'SALE', reference_id: null }, ['sale.view']), null);
});
