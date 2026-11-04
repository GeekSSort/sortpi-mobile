import assert from 'node:assert/strict';
import { test } from 'node:test';

import { receiptText } from './receipt.ts';

test('the receipt lists lines, total, paid and any due', () => {
  const text = receiptText({
    shop: 'SortPi Demo', invoice: 'INV-7', customer: 'Rafi',
    lines: [{ name: 'Tea 200ml', quantity: '2.000', unitPrice: '50.00', total: '100.00' }],
    total: '100.00', paid: '40.00', due: '60.00',
  });
  assert.match(text, /Invoice INV-7/);
  assert.match(text, /Customer: Rafi/);
  assert.match(text, /2 × ৳50\.00 = ৳100\.00/);
  assert.match(text, /Due: ৳60\.00/);
});

test('no due line when nothing is owed', () => {
  const text = receiptText({ shop: 'S', invoice: 'I', lines: [], total: '10', paid: '10', due: '0' });
  assert.equal(/Due:/.test(text), false);
});
