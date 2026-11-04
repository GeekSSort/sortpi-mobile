import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { describeSupplierError, ledgerWords, nextSupplierCode, owesMore, payProblem, supplierBody, validateNewSupplier, weOwe } from './logic.ts';

test('what the shop owes is the positive balance, never less than nothing', () => {
  assert.equal(weOwe('619307.9700'), '619307.97');
  assert.equal(weOwe('0.0000'), '0.00');
  assert.equal(weOwe('-500'), '0.00');
});

test('a payment must be a real amount and not more than is owed', () => {
  assert.equal(payProblem('', '100.00'), 'Enter the amount you paid.');
  assert.equal(payProblem('0', '100.00'), 'Enter the amount you paid.');
  assert.equal(payProblem('1,000', '5000.00'), 'Enter the amount you paid.');
  assert.match(payProblem('100.01', '100.00')!, /more than you owe/);
  assert.equal(payProblem('100', '100.00'), null);
  assert.equal(payProblem('0.50', '100.00'), null);
});

test('the next code follows the highest one used', () => {
  assert.equal(nextSupplierCode([]), 'SUP-001');
  assert.equal(nextSupplierCode(['SUP-003', 'SUP-015', 'SUP-007']), 'SUP-016');
  assert.equal(nextSupplierCode(['X', 'SUP-099']), 'SUP-100');
});

test('a new supplier needs a name and a phone, and the body leaves out an empty contact', () => {
  assert.deepEqual(Object.keys(validateNewSupplier({ name: ' ', phone: '', contact: '' })).sort(), ['name', 'phone']);
  assert.deepEqual(supplierBody({ name: ' Rahim ', phone: ' 017 ', contact: '' }, 'SUP-021'), { code: 'SUP-021', name: 'Rahim', phone: '017', email: '', is_active: true });
  assert.equal(supplierBody({ name: 'A', phone: '1', contact: ' Karim ' }, 'S').contact_person, 'Karim');
});

test('ledger lines read in everyday words and by direction', () => {
  assert.equal(ledgerWords('PAYMENT'), 'You paid');
  assert.equal(ledgerWords('PURCHASE'), 'Bought on credit');
  assert.equal(owesMore('530720.8600'), true);
  assert.equal(owesMore('-88587.1100'), false);
});

test('server codes become plain words', () => {
  assert.match(describeSupplierError(new ApiError(400, 'ZERO_LEDGER_AMOUNT', 'x')), /more than zero/);
  assert.equal(describeSupplierError(new Error('x')), 'Something went wrong. Try again.');
});
