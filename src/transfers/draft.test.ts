import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { addLine, describeNewTransferError, destinations, firstFieldMessage, matchCreated, origins, problem, removeLine, setQuantity, stepQuantity, transferBody, type DraftLine, type Place, type Sendable } from './draft.ts';

const place = (o: Partial<Place> & { id: string }): Place => ({ name: o.id, code: o.id, type: 'MAIN', is_active: true, branch: 'b1', ...o });
const row = (o: Partial<Sendable> = {}): Sendable => ({ variant: 'v1', name: 'Tea', sku: 's', available: '10.000', unit: 'pcs', allowDecimal: false, ...o });

test('goods leave from an open place of this branch and go to any other open place, never the transit shelf', () => {
  const ps = [place({ id: 'main' }), place({ id: 'transit', type: 'TRANSIT' }), place({ id: 'old', is_active: false }), place({ id: 'far', branch: 'b2' }), place({ id: 'shelf2' })];
  assert.deepEqual(origins(ps, 'b1').map((p) => p.id), ['main', 'shelf2']);
  assert.deepEqual(destinations(ps, 'main').map((p) => p.id), ['far', 'shelf2']);
  assert.deepEqual(destinations(ps, undefined).map((p) => p.id), ['main', 'far', 'shelf2']);
});

test('an item goes on once, as one unit, or all of it when less than one is there', () => {
  const a = addLine([], row());
  assert.equal(a[0].quantity, '1');
  assert.equal(addLine(a, row()).length, 1);
  assert.equal(addLine([], row({ available: '0.5', allowDecimal: true }))[0].quantity, '0.5');
  assert.deepEqual(removeLine(a, 'v1'), []);
});

test('a quantity is typed or stepped, whole where parts are not allowed, and never above what is there', () => {
  let l: DraftLine[] = addLine([], row());
  l = setQuantity(l, 'v1', '4');
  assert.equal(l[0].quantity, '4');
  assert.equal(setQuantity(l, 'v1', '99')[0].quantity, '10.000');
  assert.equal(setQuantity(addLine([], row({ available: '100.000' })), 'v1', '2.5')[0].quantity, '25'); // no dot for whole-only items
  assert.equal(stepQuantity(l, 'v1', 1)[0].quantity, '5');
  assert.equal(stepQuantity(setQuantity(l, 'v1', '10.000'), 'v1', 1)[0].quantity, '10.000');
  assert.equal(stepQuantity(setQuantity(l, 'v1', '1'), 'v1', -1)[0].quantity, '0');
  assert.equal(stepQuantity(setQuantity(l, 'v1', '0'), 'v1', -1)[0].quantity, '0');
  const kg = addLine([], row({ variant: 'v2', allowDecimal: true, available: '3.000' }));
  assert.equal(setQuantity(kg, 'v2', '2.5')[0].quantity, '2.5');
});

test('what stops a transfer from being saved, in order', () => {
  const ok = addLine([], row());
  assert.equal(problem({ lines: ok }), 'Choose where the goods leave from.');
  assert.equal(problem({ from: 'a', lines: ok }), 'Choose where to send them.');
  assert.equal(problem({ from: 'a', to: 'a', lines: ok }), 'Choose two different places.');
  assert.equal(problem({ from: 'a', to: 'b', lines: [] }), 'Add at least one item.');
  assert.equal(problem({ from: 'a', to: 'b', lines: setQuantity(ok, 'v1', '0') }), 'Every item needs an amount more than zero.');
  assert.equal(problem({ from: 'a', to: 'b', lines: setQuantity(ok, 'v1', '') }), 'Every item needs an amount more than zero.');
  assert.equal(problem({ from: 'a', to: 'b', lines: ok }), null);
});

test('the body has three-place quantities and a note only when there is one', () => {
  const lines = setQuantity(addLine([], row()), 'v1', '2');
  assert.deepEqual(transferBody({ from: 'a', to: 'b', lines, note: '  ' }), { from_warehouse: 'a', to_warehouse: 'b', items: [{ variant: 'v1', quantity: '2.000' }] });
  assert.equal(transferBody({ from: 'a', to: 'b', lines, note: ' van 1 ' }).note, 'van 1');
});

test('after a lost connection, a draft that matches what was sent is found, and a different one is not', () => {
  const body = transferBody({ from: 'a', to: 'b', lines: setQuantity(addLine([], row()), 'v1', '2'), note: '' });
  const make = (o: Record<string, unknown> = {}) => ({ id: 't1', status: 'DRAFT', created_at: '2026-11-04T17:20:00+06:00', items: [{ variant: 'v1', quantity: '2.000' }], from_warehouse: 'a', to_warehouse: 'b', ...o }) as never;
  const since = '2026-11-04T17:19:00+06:00';
  assert.equal(matchCreated([make()], body, since)?.id, 't1');
  assert.equal(matchCreated([make({ created_at: '2026-11-04T17:00:00+06:00' })], body, since), null);
  assert.equal(matchCreated([make({ to_warehouse: 'c' })], body, since), null);
  assert.equal(matchCreated([make({ status: 'DISPATCHED' })], body, since), null);
  assert.equal(matchCreated([make({ items: [{ variant: 'v1', quantity: '3.000' }] })], body, since), null);
});

test('refusals read plainly: a field message is shown, others have their own sentence', () => {
  assert.equal(firstFieldMessage({ to_warehouse: ['That warehouse is closed and cannot receive stock.'] }), 'That warehouse is closed and cannot receive stock.');
  assert.equal(firstFieldMessage({ items: { '0': { quantity: ['Too small'] } } }), 'Too small');
  assert.equal(firstFieldMessage({}), null);
  assert.equal(describeNewTransferError(new ApiError(400, 'VALIDATION_ERROR', 'x', { to_warehouse: ['Closed.'] })), 'Closed.');
  assert.equal(describeNewTransferError(new ApiError(400, 'VALIDATION_ERROR', 'x', {})), 'Check the places and the amounts.');
  assert.match(describeNewTransferError(new ApiError(0, 'NETWORK_ERROR', 'x')), /check the list/);
  assert.equal(describeNewTransferError(new Error('x')), 'Something went wrong. Try again.');
});
