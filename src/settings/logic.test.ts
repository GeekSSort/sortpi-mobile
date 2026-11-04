import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { checkPercent, checkTarget, describeSettingsError, methodProblem, moveUp, parseMethods, presetAdded, readShop, serializeMethods, tenderOf, toPercent, UNIT_PRESETS, unitBody, unitProblem, unusedUsual } from './logic.ts';

test('a fraction the server keeps reads as the percent a person says, and back', () => {
  assert.equal(toPercent('0.15'), '15');
  assert.equal(toPercent('0.0750'), '7.5');
  assert.equal(toPercent('0'), '0');
  assert.equal(toPercent('oops'), '');
  assert.deepEqual(checkPercent('7.5'), { ok: '0.0750' });
  assert.deepEqual(checkPercent('15'), { ok: '0.1500' });
  assert.deepEqual(checkPercent('0'), { ok: '0.0000' });
  assert.deepEqual(checkPercent('100'), { ok: '1.0000' });
});

test('a percent is refused when blank, not a plain number, or above 100 (the server would store 500% without complaint)', () => {
  for (const bad of ['', '  ', 'abc', '-5', '7.555', '1e2', '15%']) assert.ok('problem' in checkPercent(bad), bad);
  assert.deepEqual(checkPercent('100.01'), { problem: 'That cannot be more than 100.' });
});

test('the daily target: blank or zero is no target, commas are allowed, junk is refused', () => {
  assert.deepEqual(checkTarget(''), { ok: '0' });
  assert.deepEqual(checkTarget('0'), { ok: '0' });
  assert.deepEqual(checkTarget('50,000'), { ok: '50000' });
  assert.deepEqual(checkTarget('1200.5'), { ok: '1200.5' });
  assert.ok('problem' in checkTarget('five'));
  assert.ok('problem' in checkTarget('-1'));
  assert.ok('problem' in checkTarget('12345678901'));
});

test('settings read as the till behaves: server defaults when a row is missing, real booleans or text both understood', () => {
  const none = readShop([]);
  assert.equal(none.vat, '15');
  assert.equal(none.maxDiscount, '20');
  assert.equal(none.target, '');
  assert.equal(none.vatIncluded, true);
  assert.equal(none.negativeStock, false);
  assert.equal(none.refundPaid, true);
  assert.equal(none.barcodes, true);
  assert.deepEqual(none.methods, ['Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Others']);
  assert.equal(none.activeUnit, null);
  const set = readShop([
    { key: 'tax.default_rate', value: '0.0500', resolved_from: 'organization' },
    { key: 'sales.daily_target', value: '25000.00', resolved_from: 'organization' },
    { key: 'inventory.allow_negative_stock', value: 'true', resolved_from: 'branch' },
    { key: 'catalog.use_barcodes', value: false, resolved_from: 'default' },
    { key: 'inventory.default_unit_id', value: 'u1', resolved_from: 'organization' },
  ]);
  assert.equal(set.vat, '5');
  assert.equal(set.target, '25000');
  assert.equal(set.negativeStock, true);
  assert.equal(set.barcodes, false);
  assert.equal(set.activeUnit, 'u1');
  assert.deepEqual(set.ownHere, ['inventory.allow_negative_stock']);
});

test('the payment list keeps the shop order, maps old spellings, drops repeats and never ends up empty', () => {
  assert.deepEqual(parseMethods('bkash, Card,  CARD , Visa/Mastercard, Gift voucher'), ['bKash', 'Card', 'Gift voucher']);
  assert.deepEqual(parseMethods(''), ['Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Others']);
  assert.deepEqual(parseMethods(undefined).length, 6);
  assert.equal(serializeMethods(['bKash', ' Card ', '']), 'bKash, Card');
});

test('each method is booked to a ledger by its name, as the server does', () => {
  assert.equal(tenderOf('bKash'), 'MOBILE');
  assert.equal(tenderOf('bKash Merchant'), 'MOBILE');
  assert.equal(tenderOf('Cheque'), 'BANK');
  assert.equal(tenderOf('Visa'), 'CARD');
  assert.equal(tenderOf('Gift voucher'), 'OTHER');
  assert.equal(tenderOf('My bkash number'), 'MOBILE');
  assert.equal(tenderOf('Cash'), 'CASH');
});

test('a method name is refused when empty, has a comma, is long, is cash, or is already there', () => {
  const list = ['bKash', 'Card'];
  assert.equal(methodProblem('Nagad', list), null);
  assert.ok(methodProblem('', list));
  assert.ok(methodProblem('a,b', list));
  assert.ok(methodProblem('x'.repeat(31), list));
  assert.ok(methodProblem(' CASH ', list));
  assert.ok(methodProblem('bkash', list));
  assert.equal(methodProblem('BKASH', list, 'bKash'), null); // renaming one to a different spelling of itself is fine
});

test('the usual methods still to offer, and moving one up', () => {
  assert.equal(unusedUsual(['bKash', 'Card']).some((m) => m.code === 'bKash'), false);
  assert.equal(unusedUsual([]).length, 9);
  assert.deepEqual(moveUp(['a', 'b', 'c'], 2), ['a', 'c', 'b']);
  assert.deepEqual(moveUp(['a', 'b'], 0), ['a', 'b']);
});

test('stock types: presets already added are not offered, names are checked like the server', () => {
  assert.equal(presetAdded(UNIT_PRESETS[0], [{ name: 'piece' }]), true);
  assert.equal(presetAdded(UNIT_PRESETS[1], [{ name: 'Piece' }]), false);
  assert.equal(unitProblem('Dozen', 'doz', [{ name: 'Piece' }]), null);
  assert.ok(unitProblem('', 'x', []));
  assert.ok(unitProblem('Dozen', '', []));
  assert.ok(unitProblem('Dozen', 'x'.repeat(11), []));
  assert.ok(unitProblem(' piece ', 'p', [{ name: 'Piece' }]));
  assert.deepEqual(unitBody('  Half  dozen ', ' hd ', true), { name: 'Half dozen', short_name: 'hd', allow_decimal: true });
});

test('every refusal has a plain sentence', () => {
  const say = (code: string) => describeSettingsError(new ApiError(400, code, 'raw'));
  assert.match(say('PERMISSION_DENIED'), /permission/);
  assert.match(say('NETWORK_ERROR'), /not saved/);
  assert.match(say('DUPLICATE_RESOURCE'), /already/);
  assert.equal(say('SOMETHING_NEW'), 'raw');
  assert.equal(describeSettingsError(new Error('x')), 'Something went wrong. Try again.');
});
