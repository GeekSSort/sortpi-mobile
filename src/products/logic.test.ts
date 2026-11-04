import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { describeProductError, detailsBody, endsOn, nameProblem, offerBody, offerProblem, priceAfterOffer, priceBody, priceProblem, reorderProblem, shopOfferFor, withListedStock } from './logic.ts';

test('a price is a positive amount with up to four places', () => {
  assert.equal(priceProblem('617.57'), null);
  assert.equal(priceProblem(' 50 '), null);
  for (const bad of ['', '0', '-1', 'abc', '1.23456', '1,5']) assert.ok(priceProblem(bad), bad);
  assert.deepEqual(priceBody(' 99.5 ', 'v1'), { price: '99.5', variant: 'v1' });
});

test('an offer is above zero, a percentage at most 100, an amount below the price', () => {
  assert.equal(offerProblem('PERCENT', '10', '100'), null);
  assert.equal(offerProblem('PERCENT', '100', '100'), null);
  assert.ok(offerProblem('PERCENT', '101', '100'));
  assert.ok(offerProblem('PERCENT', '0', '100'));
  assert.ok(offerProblem('FLAT', '100', '100'));
  assert.equal(offerProblem('FLAT', '99.5', '100'), null);
  assert.ok(offerProblem('FLAT', 'x', '100'));
});

test('the end of an offer is a simple choice counted from today', () => {
  assert.equal(endsOn('none', '2026-11-04'), null);
  assert.equal(endsOn('week', '2026-11-04'), '2026-11-11');
  assert.equal(endsOn('month', '2026-11-04'), '2026-12-04');
  assert.equal(endsOn('week', '2026-12-28'), '2027-01-04'); // across a year
  assert.deepEqual(offerBody({ mode: 'PERCENT', value: ' 10 ', variant: 'v1', endChoice: 'none', today: '2026-11-04' }), { mode: 'PERCENT', value: '10', variant: 'v1' });
  assert.deepEqual(offerBody({ mode: 'FLAT', value: '20', variant: 'v1', endChoice: 'week', today: '2026-11-04' }), { mode: 'FLAT', value: '20', variant: 'v1', ends_on: '2026-11-11' });
});

test('the price with an offer on, never below zero', () => {
  assert.equal(priceAfterOffer('200', { mode: 'PERCENT', value: '10' }), '180.00');
  assert.equal(priceAfterOffer('200', { mode: 'FLAT', value: '20' }), '180.00');
  assert.equal(priceAfterOffer('10', { mode: 'FLAT', value: '20' }), '0.00');
  assert.equal(priceAfterOffer('200', undefined), '200');
});

test('only the shop-wide offer of that variant is shown', () => {
  const offers = [{ id: 'a', variant: 'v1', branch: 'b1', mode: 'FLAT' as const, value: '5', ends_on: null }, { id: 'b', variant: 'v1', branch: null, mode: 'PERCENT' as const, value: '10', ends_on: null }, { id: 'c', variant: 'v2', branch: null, mode: 'PERCENT' as const, value: '20', ends_on: null }];
  assert.equal(shopOfferFor(offers, 'v1')?.id, 'b');
  assert.equal(shopOfferFor(offers, 'v9'), undefined);
});

test('an edit sends only what changed', () => {
  const before = { name: 'Soda', category: 'c1', brand: 'b1', reorder: '0.000' };
  assert.deepEqual(detailsBody(before, { ...before }), {});
  assert.deepEqual(detailsBody(before, { ...before, name: ' Soda 2 ', reorder: '10' }), { name: 'Soda 2', reorder_level: '10' });
  assert.deepEqual(detailsBody(before, { ...before, category: 'c2', brand: 'b2' }), { category: 'c2', brand: 'b2' });
  assert.ok(nameProblem('  '));
  assert.equal(nameProblem('x'), null);
  assert.equal(reorderProblem(''), null);
  assert.equal(reorderProblem('2.5'), null);
  assert.ok(reorderProblem('-1'));
});

test('every refusal has a plain sentence', () => {
  const say = (code: string, errors: Record<string, unknown> = {}) => describeProductError(new ApiError(400, code, 'raw', errors));
  assert.match(say('INVALID_PRICE_FLOOR'), /lowest price/);
  assert.match(say('INVALID_DISCOUNT_END'), /already passed/);
  assert.equal(say('VALIDATION_ERROR', { name: ['This field may not be blank.'] }), 'This field may not be blank.');
  assert.match(say('NETWORK_ERROR'), /No connection/);
  assert.equal(say('NEW_CODE'), 'raw');
});

test('the stock on an item page comes from the list copy, because the single-item call says 0', () => {
  const one = { name: 'Soda', stock_on_hand: '0.000', variants: [{ id: 'a', stock_on_hand: '0.000' }, { id: 'b', stock_on_hand: '0.000' }] };
  const listed = { stock_on_hand: '705.000', variants: [{ id: 'a', stock_on_hand: '616.000' }, { id: 'b', stock_on_hand: '89.000' }] };
  const merged = withListedStock(one, listed);
  assert.equal(merged.name, 'Soda');
  assert.equal(merged.stock_on_hand, '705.000');
  assert.deepEqual(merged.variants.map((v) => v.stock_on_hand), ['616.000', '89.000']);
  assert.equal(withListedStock(one, undefined), one);
  assert.equal(withListedStock(one, { stock_on_hand: '5.000', variants: [] }).variants[0].stock_on_hand, '0.000'); // a kind the list does not have keeps its own figure
});
