import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPayments, buildSplitPayments, quickCashOffers } from './payment.ts';

const base = { total: '1000.00', payNow: '', reference: '', hasCustomer: false };

test('a normal sale pays the whole total with the chosen method', () => {
  const r = buildPayments({ ...base, choice: 'CASH' });
  assert.deepEqual(r.payments, [{ payment_method: 'CASH', amount: '1000.00' }]);
  assert.equal(r.problem, null);
  assert.equal(r.due, '0');
});

test('a card or mobile payment carries its reference; cash never does', () => {
  assert.deepEqual(buildPayments({ ...base, choice: 'MOBILE', reference: ' TRX123 ' }).payments, [{ payment_method: 'MOBILE', amount: '1000.00', reference_no: 'TRX123' }]);
  assert.equal('reference_no' in buildPayments({ ...base, choice: 'CASH', reference: 'x' }).payments[0]!, false);
});

test('credit needs a customer and sends no payment', () => {
  assert.match(buildPayments({ ...base, choice: 'CREDIT' }).problem ?? '', /Choose a customer/);
  const r = buildPayments({ ...base, choice: 'CREDIT', hasCustomer: true });
  assert.deepEqual(r.payments, []);
  assert.equal(r.due, '1000.00');
});

test('part payment leaves the rest on the customer account, never on a walk-in', () => {
  const part = buildPayments({ ...base, choice: 'CASH', payNow: '400', hasCustomer: true });
  assert.deepEqual(part.payments, [{ payment_method: 'CASH', amount: '400' }]);
  assert.equal(part.due, '600');
  assert.match(buildPayments({ ...base, choice: 'CASH', payNow: '400' }).problem ?? '', /Choose a customer/);
});

test('the amount paid now must be real and not above the total', () => {
  assert.match(buildPayments({ ...base, choice: 'CASH', payNow: '12,5', hasCustomer: true }).problem ?? '', /Enter the amount/);
  assert.match(buildPayments({ ...base, choice: 'CASH', payNow: '1000.01', hasCustomer: true }).problem ?? '', /more than the total/);
});

import { amountDueNow } from './payment.ts';
import { changeDue } from './cart.ts';

test('cash is judged against what is taken now: a part payment is not short, and change follows it', () => {
  assert.equal(amountDueNow('1000', '', true), '1000');
  assert.equal(amountDueNow('1000', '500', true), '500');
  assert.equal(amountDueNow('1000', '500', false), '1000'); // a walk-in pays in full
  assert.equal(amountDueNow('1000', '1500', true), '1000'); // more than the total is not a part payment
  assert.equal(amountDueNow('1000', 'abc', true), '1000');
  assert.equal(changeDue(amountDueNow('1000', '500', true), '1000'), '500'); // 1,000 handed over for 500 now: 500 back
});

import { walletReference } from './payment.ts';

test('the wallet goes in front of the transaction id, and either may be missing', () => {
  assert.equal(walletReference('bKash', ' 8N7A6D5 '), 'bKash 8N7A6D5');
  assert.equal(walletReference('Nagad', ''), 'Nagad');
  assert.equal(walletReference(null, 'ABC1'), 'ABC1');
  assert.equal(walletReference(null, ''), '');
});

test('a reference never goes past what the shop keeps (50 characters), wallet name included', () => {
  const long = 'X'.repeat(80);
  assert.equal(walletReference('bKash', long).length, 50);
  assert.ok(walletReference('bKash', long).startsWith('bKash '));
  const plan = buildPayments({ choice: 'CARD', total: '100', payNow: '', reference: long, hasCustomer: false });
  assert.equal(plan.payments[0].reference_no?.length, 50);
});

import { buildPayments as pay } from './payment.ts';
import { giftCardOffered } from './gift-offer.ts';

test('a gift card payment carries the card code as its reference, and needs one', () => {
  const ok = pay({ choice: 'GIFT_CARD', total: '500.00', payNow: '', reference: ' GC-1234 ', hasCustomer: false });
  assert.equal(ok.problem, null);
  assert.deepEqual(ok.payments, [{ payment_method: 'GIFT_CARD', amount: '500.00', reference_no: 'GC-1234' }]);
  assert.match(pay({ choice: 'GIFT_CARD', total: '500.00', payNow: '', reference: '  ', hasCustomer: false }).problem ?? '', /code/);
});

test('a gift card with less left than the payment is refused here, with the way out', () => {
  const short = pay({ choice: 'GIFT_CARD', total: '500.00', payNow: '', reference: 'GC-1', hasCustomer: false, giftBalance: '200.00' });
  assert.match(short.problem ?? '', /less left/);
  assert.deepEqual(short.payments, []);
  // taking only what the card has, with a customer, leaves the rest on their account
  const part = pay({ choice: 'GIFT_CARD', total: '500.00', payNow: '200', reference: 'GC-1', hasCustomer: true, giftBalance: '200.00' });
  assert.equal(part.problem, null);
  assert.equal(part.due, '300');
  // enough on the card, or the balance not known: the server decides
  assert.equal(pay({ choice: 'GIFT_CARD', total: '500.00', payNow: '', reference: 'GC-1', hasCustomer: false, giftBalance: '500.00' }).problem, null);
  assert.equal(pay({ choice: 'GIFT_CARD', total: '500.00', payNow: '', reference: 'GC-1', hasCustomer: false, giftBalance: null }).problem, null);
});

test('the other methods are unchanged by the gift card rules', () => {
  assert.deepEqual(pay({ choice: 'CARD', total: '100.00', payNow: '', reference: 'TRX1', hasCustomer: false }).payments, [{ payment_method: 'CARD', amount: '100.00', reference_no: 'TRX1' }]);
});

test('a shop is offered gift cards by its trade or by its payment list', () => {
  assert.equal(giftCardOffered(['gift', 'season'], null), true);
  assert.equal(giftCardOffered(['expiry'], 'Card, bKash, Gift card'), true);
  assert.equal(giftCardOffered(['expiry'], 'Card, Gift voucher'), true);
  assert.equal(giftCardOffered(['expiry'], 'Card, bKash, Nagad'), false);
  assert.equal(giftCardOffered(undefined, undefined), false);
  assert.equal(giftCardOffered([], 42), false);
});

test('multiple payment: the parts add up to the total, each with its own reference', () => {
  const r = buildSplitPayments([{ method: 'CASH', amount: '300', reference: 'x' }, { method: 'MOBILE', amount: '700', reference: ' TRX9 ' }, { method: 'CARD', amount: '', reference: '' }], '1000.00', false);
  assert.equal(r.problem, null);
  assert.deepEqual(r.payments, [{ payment_method: 'CASH', amount: '300' }, { payment_method: 'MOBILE', amount: '700', reference_no: 'TRX9' }]);
  assert.equal(r.due, '0');
});

test('multiple payment: more than the total, one part only, or a walk-in short are refused', () => {
  const two = (a: string, b: string) => [{ method: 'CASH' as const, amount: a, reference: '' }, { method: 'CARD' as const, amount: b, reference: '' }];
  assert.match(buildSplitPayments(two('600', '600'), '1000', true).problem ?? '', /more than/);
  assert.match(buildSplitPayments(two('1000', ''), '1000', true).problem ?? '', /at least two/);
  assert.match(buildSplitPayments(two('300', '300'), '1000', false).problem ?? '', /less than/);
  assert.equal(buildSplitPayments(two('300', '300'), '1000', true).due, '400');
  assert.match(buildSplitPayments(two('abc', '300'), '1000', true).problem ?? '', /Enter each amount/);
});

test('quick cash offers the exact bill, then round notes above it', () => {
  assert.deepEqual(quickCashOffers('368.14'), ['368.14', '400.00', '500.00', '1000.00', '2000.00']);
  assert.deepEqual(quickCashOffers('500'), ['500.00', '550.00', '600.00', '1000.00', '2000.00']);
});
