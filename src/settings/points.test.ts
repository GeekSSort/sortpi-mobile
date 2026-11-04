import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanNumber, earnedFor, givenBack, pointChanges, pointsProblem, readPoints, type Points } from './points.ts';

const row = (key: string, value: unknown, from = 'default') => ({ key, value, resolved_from: from });
const base: Points = readPoints([]);

test('no rows read as the shop starts: off, 10 points per ৳100, 100 points is ৳50', () => {
  assert.deepEqual(base, { enabled: false, earnPerAmount: '100', earnPoints: '10', basis: 'NET_PAYABLE', mode: 'FLAT', redeemPoints: '100', redeemValue: '50', redeemPercent: '1', minRedeem: '100', partial: false, maxPerSale: '0', ownHere: [] });
});

test('saved rows are read in the shapes the server keeps them', () => {
  const p = readPoints([row('loyalty.enabled', 'true'), row('loyalty.earn_per_amount', '200.0000'), row('loyalty.earn_points', 5), row('loyalty.redeem_mode', 'PERCENT'), row('loyalty.redeem_percent', '2.5000'), row('loyalty.earn_basis', 'bogus'), row('loyalty.allow_partial_redeem', true, 'branch'), row('tax.default_rate', '0.15', 'branch')]);
  assert.equal(p.enabled, true);
  assert.equal(p.earnPerAmount, '200');
  assert.equal(p.earnPoints, '5');
  assert.equal(p.mode, 'PERCENT');
  assert.equal(p.redeemPercent, '2.5');
  assert.equal(p.basis, 'NET_PAYABLE');
  assert.deepEqual(p.ownHere, ['loyalty.allow_partial_redeem']);
});

test('the starting scheme is fine; each bad number is named, since the server accepts anything', () => {
  assert.equal(pointsProblem(base), null);
  assert.equal(pointsProblem({ ...base, earnPerAmount: '0' })?.field, 'earnPerAmount');
  assert.equal(pointsProblem({ ...base, earnPerAmount: '' })?.text, 'Type how many taka, like 100.');
  assert.equal(pointsProblem({ ...base, earnPoints: '2.5' })?.field, 'earnPoints');
  assert.equal(pointsProblem({ ...base, earnPoints: '-5' })?.field, 'earnPoints');
  assert.equal(pointsProblem({ ...base, redeemPoints: '0' })?.field, 'redeemPoints');
  assert.equal(pointsProblem({ ...base, redeemValue: '0' })?.field, 'redeemValue');
  assert.equal(pointsProblem({ ...base, minRedeem: 'abc' })?.field, 'minRedeem');
  assert.equal(pointsProblem({ ...base, minRedeem: '0', maxPerSale: '0' }), null);
});

test('only the shown way of spending is checked, and a percent cannot pass 100', () => {
  assert.equal(pointsProblem({ ...base, mode: 'PERCENT', redeemValue: 'junk' }), null);
  assert.equal(pointsProblem({ ...base, mode: 'FLAT', redeemPercent: '500' }), null);
  assert.equal(pointsProblem({ ...base, mode: 'PERCENT', redeemPercent: '150' })?.text, 'It cannot take off more than 100%.');
  assert.equal(pointsProblem({ ...base, mode: 'PERCENT', redeemPercent: '0' })?.field, 'redeemPercent');
});

test('a per-sale limit below one set of points would lock everyone out', () => {
  assert.equal(pointsProblem({ ...base, maxPerSale: '50' })?.field, 'maxPerSale');
  assert.equal(pointsProblem({ ...base, maxPerSale: '100' }), null);
  assert.equal(pointsProblem({ ...base, maxPerSale: '250' }), null);
});

test('only changed settings are sent, switches as true or false', () => {
  assert.deepEqual(pointChanges(base, base), []);
  assert.deepEqual(pointChanges(base, { ...base, enabled: true, earnPoints: ' 12 ', basis: 'SUBTOTAL', partial: true }), [
    { key: 'loyalty.enabled', value: 'true' },
    { key: 'loyalty.earn_points', value: '12' },
    { key: 'loyalty.earn_basis', value: 'SUBTOTAL' },
    { key: 'loyalty.allow_partial_redeem', value: 'true' },
  ]);
});

test('points earned are whole sets, rounded down, like the server', () => {
  assert.equal(earnedFor(base, '1000'), '100');
  assert.equal(earnedFor(base, '199.99'), '10');
  assert.equal(earnedFor(base, '99'), '0');
  assert.equal(earnedFor({ earnPerAmount: '50', earnPoints: '3' }, '1000'), '60');
  assert.equal(earnedFor({ earnPerAmount: '0', earnPoints: '3' }, '1000'), '0');
});

test('what comes back to the customer, for taka-off schemes', () => {
  assert.equal(givenBack(base), '5');
  assert.equal(givenBack({ ...base, earnPoints: '1', redeemValue: '30' }), '0.3');
  assert.equal(givenBack({ ...base, mode: 'PERCENT' }), null);
  assert.equal(givenBack({ ...base, redeemPoints: '0' }), null);
});

test('number boxes take digits only, and parts only where allowed', () => {
  assert.equal(cleanNumber('12a3', false), '123');
  assert.equal(cleanNumber('1.5', false), '15');
  assert.equal(cleanNumber('12.345', true), '12.34');
  assert.equal(cleanNumber('1.2.3', true), '1.23');
  assert.equal(cleanNumber('.5', true), '.5');
  assert.equal(cleanNumber('', true), '');
});
