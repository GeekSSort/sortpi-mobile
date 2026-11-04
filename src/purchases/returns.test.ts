import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { alreadySent, canSendBack, chosenLines, describeSendBackError, estimateCredit, returnBody, sendable } from './returns.ts';

const it = (o: Partial<Parameters<typeof sendable>[0]> = {}) => ({ id: 'a', quantity: '2', received_quantity: '2', returned_quantity: '0', returnable: '2', unit_cost: '50', ...o });

test('how many can go back: the server figure, or arrived minus already sent back', () => {
  assert.equal(sendable(it()), '2');
  assert.equal(sendable(it({ returnable: undefined, returned_quantity: '0.5', received_quantity: '2' })), '1.5');
});

test('goods go back only after they arrived, when allowed, and while something is left', () => {
  const ok = { status: 'RECEIVED', items: [it()] };
  assert.equal(canSendBack(ok, ['purchase.return']), true);
  assert.equal(canSendBack(ok, ['purchase.view']), false);
  assert.equal(canSendBack(ok, undefined), false);
  assert.equal(canSendBack({ status: 'PARTIAL', items: [it()] }, ['purchase.return']), true);
  assert.equal(canSendBack({ status: 'CONFIRMED', items: [it()] }, ['purchase.return']), false);
  assert.equal(canSendBack({ status: 'RECEIVED', items: [it({ returnable: '0', returned_quantity: '2' })] }, ['purchase.return']), false);
});

test('only lines with an amount are sent, and quantities stay text', () => {
  assert.deepEqual(chosenLines({ a: '1', b: '0', c: '0.5' }), [{ purchase_item: 'a', quantity: '1' }, { purchase_item: 'c', quantity: '0.5' }]);
  assert.deepEqual(returnBody({ chosen: { a: '1' }, reason: '  damaged ', today: '2026-11-04' }), { return_date: '2026-11-04', reason: 'damaged', items: [{ purchase_item: 'a', quantity: '1' }] });
  assert.equal('reason' in returnBody({ chosen: { a: '1' }, reason: '  ', today: '2026-11-04' }), false);
});

test('the credit estimate is cost times amount plus the order tax rate, as the server does', () => {
  const p = { subtotal: '100', tax_amount: '10', items: [it({ id: 'a', unit_cost: '50' })] };
  assert.equal(estimateCredit(p, { a: '1' }), '55.00'); // the live server answered 55 for this exact case
  assert.equal(estimateCredit(p, { a: '2' }), '110.00');
  assert.equal(estimateCredit(p, {}), '0.00');
  assert.equal(estimateCredit({ ...p, subtotal: '0', tax_amount: '0' }, { a: '1' }), '50.00');
});

test('after a lost connection, a return that already went through is recognised and not sent twice', () => {
  const before = { a: '0', b: '1' };
  assert.equal(alreadySent(before, [{ id: 'a', returned_quantity: '1' }, { id: 'b', returned_quantity: '1' }], { a: '1' }), true);
  assert.equal(alreadySent(before, [{ id: 'a', returned_quantity: '0' }], { a: '1' }), false);
  assert.equal(alreadySent(before, [{ id: 'a', returned_quantity: '1' }], { a: '2' }), false); // only part of it shows
  assert.equal(alreadySent(before, [{ id: 'b', returned_quantity: '2' }], { b: '1' }), true);
  assert.equal(alreadySent(before, [], { a: '1' }), false);
  assert.equal(alreadySent(before, [{ id: 'a', returned_quantity: '1' }], {}), false);
});

test('every refusal has a plain sentence, and a lost connection says it will check first', () => {
  const say = (code: string) => describeSendBackError(new ApiError(400, code, 'raw'));
  assert.match(say('RETURN_EXCEEDS_ORIGINAL'), /more than arrived/);
  assert.match(say('INSUFFICIENT_STOCK'), /no longer in stock/);
  assert.match(say('PURCHASE_NOT_RECEIVED'), /Nothing has arrived/);
  assert.match(say('RETURN_HAS_NO_LINES'), /at least one/);
  assert.match(say('NETWORK_ERROR'), /checked first/);
  assert.equal(say('SOMETHING_NEW'), 'raw');
  assert.equal(describeSendBackError(new Error('x')), 'Something went wrong. Try again.');
});
