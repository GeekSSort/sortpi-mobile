import assert from 'node:assert/strict';
import { test } from 'node:test';

import { looksLikeInvoiceNumber, pickInvoice } from './invoice-code.ts';

test('an invoice number such as the ones on receipts is recognised', () => {
  for (const code of ['MAIN26-24', 'MAIN26-3', 'main26-24', 'BR126-1005', ' MAIN26-24 ', 'DHK25-123456']) assert.equal(looksLikeInvoiceNumber(code), true, code);
});

test('product barcodes are never taken for an invoice number', () => {
  for (const code of ['8901234567890', '012345678905', '96385074', '123456', 'FRESH-COFFEE-1FA21B', 'A', '', '-24', 'MAIN26-', 'MAIN26-24x', 'MAIN 26-24', '12-34']) assert.equal(looksLikeInvoiceNumber(code), false, code);
});

test('only the invoice with exactly that number is picked, not a near match from a search', () => {
  const rows = [{ id: 'a', invoice_number: 'MAIN26-240' }, { id: 'b', invoice_number: 'MAIN26-24' }, { id: 'c', invoice_number: 'MAIN26-2' }];
  assert.equal(pickInvoice(rows, 'MAIN26-24')?.id, 'b');
  assert.equal(pickInvoice(rows, ' main26-24 ')?.id, 'b');
  assert.equal(pickInvoice(rows, 'MAIN26-99'), null);
  assert.equal(pickInvoice([], 'MAIN26-24'), null);
});
