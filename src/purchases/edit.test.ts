import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PurchaseItemRow } from './api.ts';
import { canDeleteDraft, canEditPurchase, editBody, lineFromItem } from './edit.ts';

const row = (o: Partial<PurchaseItemRow> = {}): PurchaseItemRow => ({ id: 'i', variant: 'v1', sku: 'S', product_name: 'Soda', variant_name: '500g', unit_short_name: 'pcs', unit_allow_decimal: false, quantity: '2.000', received_quantity: '0.000', outstanding: '2', returned_quantity: '0', returnable: '0', unit_cost: '10.0000', line_total: '20', tax_rate: '0.1500', ...o }) as PurchaseItemRow;

test('who may change an order', () => {
  const perms = ['purchase.update', 'purchase.delete'];
  assert.equal(canEditPurchase({ status: 'DRAFT', items: [row()] }, perms), true);
  assert.equal(canEditPurchase({ status: 'CONFIRMED', items: [row()] }, perms), true);
  assert.equal(canEditPurchase({ status: 'CONFIRMED', items: [row({ received_quantity: '1.000' })] }, perms), false);
  assert.equal(canEditPurchase({ status: 'RECEIVED', items: [row()] } as never, perms), false);
  assert.equal(canEditPurchase({ status: 'DRAFT', items: [row()] }, []), false);
  assert.equal(canDeleteDraft({ status: 'DRAFT' }, perms), true);
  assert.equal(canDeleteDraft({ status: 'CONFIRMED' }, perms), false);
});

test('a saved line comes back with a plain quantity and cost', () => {
  const l = lineFromItem(row());
  assert.deepEqual([l.name, l.quantity, l.unitCost, l.unitShort], ['Soda 500g', '2', '10', 'pcs']);
});

test('the edit body keeps each old line\'s tax and batch, and gives a new line none', () => {
  const lines = [{ ...lineFromItem(row({ batch_no: 'B7', expiry_date: '2027-01-01' })), quantity: '3' }, { variantId: 'v2', name: 'New', sku: 'N', unitShort: null, allowDecimal: false, quantity: '1', unitCost: '5' }];
  const b = editBody({ lines, before: [row({ batch_no: 'B7', expiry_date: '2027-01-01' })], invoiceNo: ' INV-1 ', note: '' });
  assert.equal(b.supplier_invoice_no, 'INV-1');
  assert.deepEqual(b.items[0], { variant: 'v1', quantity: '3', unit_cost: '10', tax_rate: '0.1500', batch_no: 'B7', expiry_date: '2027-01-01' });
  assert.deepEqual(b.items[1], { variant: 'v2', quantity: '1', unit_cost: '5' });
});
