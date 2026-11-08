import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oldBody, validateOld, type OldForm } from './old.ts';

const line = { variantId: 'v', name: 'Soda', sku: 'S', unitShort: null, allowDecimal: false, quantity: '2', unitCost: '10' };
const ok: OldForm = { supplierId: 's1', billDate: '2026-10-01', billNo: ' B-7 ', note: '', addsStock: true, settledBefore: false, lines: [line] };

test('a complete old bill has no errors; the date may not be in the future', () => {
  assert.deepEqual(validateOld(ok, '2026-11-08'), {});
  assert.ok(validateOld({ ...ok, billDate: '2026-12-01' }, '2026-11-08').billDate);
  assert.ok(validateOld({ ...ok, billDate: 'x' }, '2026-11-08').billDate);
});

test('missing pieces are named', () => {
  assert.deepEqual(Object.keys(validateOld({ ...ok, supplierId: '', lines: [] }, '2026-11-08')).sort(), ['lines', 'supplierId']);
  assert.ok(validateOld({ ...ok, lines: [{ ...line, unitCost: '0' }] }, '2026-11-08').lines);
});

test('the body carries the two choices and trims the bill number', () => {
  const b = oldBody(ok, { branchId: 'b', warehouseId: 'w' });
  assert.equal(b.adds_stock, true);
  assert.equal(b.settled_before, false);
  assert.equal(b.supplier_invoice_no, 'B-7');
  assert.deepEqual(b.items, [{ variant: 'v', quantity: '2', unit_cost: '10' }]);
  assert.equal('note' in b, false);
});
