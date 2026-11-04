import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { addDocLine, alreadyDeposited, collectBody, dateAhead, daysBetween, depositBody, depositProblem, describeOrderError, docProblem, dueState, dueWords, orderBody, orderSteps, quoteBody, quoteSteps, type DocLine } from './logic.ts';

const item = { variantId: 'v1', name: 'Soda', sku: 'S-1', unitShort: 'pcs', allowDecimal: false };
const line = (o: Partial<DocLine> = {}): DocLine => ({ ...item, quantity: '2', ...o });

test('days between calendar dates, across a month end', () => {
  assert.equal(daysBetween('2026-11-04', '2026-11-10'), 6);
  assert.equal(daysBetween('2026-11-04', '2026-11-04'), 0);
  assert.equal(daysBetween('2026-11-04', '2026-11-03'), -1);
  assert.equal(daysBetween('2026-10-30', '2026-11-02'), 3);
});

test('how urgent an order is, and finished ones are not urgent', () => {
  const today = '2026-11-04';
  assert.equal(dueState({ status: 'OPEN', due_date: '2026-11-02' }, today).state, 'late');
  assert.equal(dueState({ status: 'READY', due_date: '2026-11-04' }, today).state, 'today');
  assert.equal(dueState({ status: 'OPEN', due_date: '2026-11-07' }, today).state, 'soon');
  assert.equal(dueState({ status: 'OPEN', due_date: '2026-11-08' }, today).state, 'later');
  assert.equal(dueState({ status: 'COLLECTED', due_date: '2026-10-01' }, today).state, 'done');
  assert.deepEqual(dueWords(-3), { key: '{n} days late', n: 3 });
  assert.deepEqual(dueWords(-1), { key: 'A day late' });
  assert.deepEqual(dueWords(0), { key: 'Due today' });
  assert.deepEqual(dueWords(5), { key: 'Due in {n} days', n: 5 });
});

test('what can be done next follows the status, the balance and the permissions', () => {
  const all = ['sale.create', 'sale.cancel'];
  assert.deepEqual(orderSteps({ status: 'OPEN', balance: '100' }, all), { deposit: true, ready: true, collect: true, cancel: true });
  assert.deepEqual(orderSteps({ status: 'READY', balance: '100' }, all), { deposit: true, ready: false, collect: true, cancel: true });
  assert.deepEqual(orderSteps({ status: 'OPEN', balance: '0' }, all), { deposit: false, ready: true, collect: true, cancel: true });
  assert.deepEqual(orderSteps({ status: 'OPEN', balance: '100' }, ['sale.create']), { deposit: true, ready: true, collect: true, cancel: false });
  assert.deepEqual(orderSteps({ status: 'COLLECTED', balance: '0' }, all), { deposit: false, ready: false, collect: false, cancel: false });
  assert.deepEqual(orderSteps({ status: 'OPEN', balance: '100' }, undefined), { deposit: false, ready: false, collect: false, cancel: false });
});

test('a deposit is positive and not above the balance', () => {
  assert.equal(depositProblem('300', '935.14'), null);
  assert.equal(depositProblem('935.14', '935.14'), null);
  assert.ok(depositProblem('935.15', '935.14'));
  for (const bad of ['', '0', '-5', 'abc', '10.555']) assert.ok(depositProblem(bad, '1000'), bad);
  assert.deepEqual(depositBody(' 300 ', 'CASH'), { amount: '300', payment_method: 'CASH' });
});

test('after a lost connection, a deposit that already landed is recognised and not taken twice', () => {
  assert.equal(alreadyDeposited('0.0000', '300.0000', '300'), true);
  assert.equal(alreadyDeposited('0.0000', '0.0000', '300'), false);
  assert.equal(alreadyDeposited('100', '250', '300'), false);
});

test('handing over pays the whole balance one way', () => {
  assert.deepEqual(collectBody('935.14', 'MOBILE'), { payments: [{ payment_method: 'MOBILE', amount: '935.14' }] });
  assert.deepEqual(collectBody('0', 'CASH'), { payments: [] });
});

test('lines: one more of an item already there, and the checks before saving', () => {
  const once = addDocLine([], item);
  assert.deepEqual(once, [{ ...item, quantity: '1' }]);
  assert.equal(addDocLine(once, item)[0].quantity, '2');
  assert.equal(docProblem({ who: false, lines: [line()] }), 'Choose the customer.');
  assert.equal(docProblem({ who: true, lines: [] }), 'Add at least one item.');
  assert.ok(docProblem({ who: true, lines: [line({ quantity: '0' })] }));
  assert.ok(docProblem({ who: true, lines: [line({ quantity: '1.5' })] })); // whole items only
  assert.equal(docProblem({ who: true, lines: [line({ quantity: '1.5', allowDecimal: true })] }), null);
});

test('request bodies carry only what and how many, with three-place amounts', () => {
  assert.deepEqual(orderBody({ customerId: 'c1', dueDate: '2026-11-10', note: ' cake ', lines: [line()] }), { customer_id: 'c1', due_date: '2026-11-10', note: 'cake', items: [{ variant_id: 'v1', quantity: '2.000' }] });
  assert.deepEqual(orderBody({ customerId: 'c1', dueDate: '2026-11-10', note: '', branchId: 'b1', lines: [line()] }).branch_id, 'b1');
  assert.deepEqual(quoteBody({ customer: { id: 'c1' }, validUntil: '2026-11-30', note: '', lines: [line()] }), { customer_id: 'c1', valid_until: '2026-11-30', items: [{ variant_id: 'v1', quantity: '2.000' }] });
  assert.deepEqual(quoteBody({ customer: { name: ' Karim ', phone: '' }, validUntil: '2026-11-30', note: 'x', lines: [line()] }), { customer_name: 'Karim', valid_until: '2026-11-30', note: 'x', items: [{ variant_id: 'v1', quantity: '2.000' }] });
});

test('day choices count ahead from today', () => {
  const now = new Date(2026, 10, 28);
  assert.equal(dateAhead('tomorrow', now), '2026-11-29');
  assert.equal(dateAhead('week', now), '2026-12-05');
  assert.equal(dateAhead('month', now), '2026-12-28');
});

test('quotations can be sent or cancelled only while open and in date', () => {
  assert.deepEqual(quoteSteps({ status: 'OPEN', expired: false }, ['sale.create']), { send: true, cancel: true });
  assert.deepEqual(quoteSteps({ status: 'OPEN', expired: true }, ['sale.create']), { send: false, cancel: false });
  assert.deepEqual(quoteSteps({ status: 'SENT', expired: false }, ['sale.create']), { send: false, cancel: false });
  assert.deepEqual(quoteSteps({ status: 'OPEN', expired: false }, []), { send: false, cancel: false });
});

test('every refusal has a plain sentence', () => {
  const say = (code: string) => describeOrderError(new ApiError(400, code, 'raw'));
  assert.match(say('NO_OPEN_SHIFT'), /Open your day/);
  assert.match(say('BALANCE_NOT_PAID'), /whole balance/);
  assert.match(say('DEPOSIT_EXCEEDS_TOTAL'), /more than is left/);
  assert.match(say('QUOTATION_EXPIRED'), /past its last day/);
  assert.match(say('NETWORK_ERROR'), /Check the list/);
  assert.equal(say('NEW_CODE'), 'raw');
});
