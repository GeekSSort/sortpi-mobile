import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { couponText, describeDiscountError, finalTotal, pointsDiscount, readLoyalty, redeemablePoints, roundWhole, totalFromRefusal } from './discounts.ts';

test('round to a whole taka: .40 and above goes up, under .40 goes down, and it is not half-up', () => {
  assert.equal(roundWhole('100.39'), '100.00');
  assert.equal(roundWhole('100.40'), '101.00');
  assert.equal(roundWhole('100.45'), '101.00'); // half-up would say 100: the shop rule says 101
  assert.equal(roundWhole('100.75'), '101.00');
  assert.equal(roundWhole('100.00'), '100.00');
  assert.equal(roundWhole('0.00'), '0.00');
  assert.equal(roundWhole('0.30'), '0.00');
});

test('the total goes coupon, then points, then rounding, as the server does', () => {
  assert.deepEqual(finalTotal({ total: '503.51', rounds: false }), { afterCoupon: '503.51', afterPoints: '503.51', final: '503.51', rounding: '0.00' });
  const t = finalTotal({ total: '503.51', coupon: '50.35', points: '50.00', rounds: true });
  assert.deepEqual(t, { afterCoupon: '453.16', afterPoints: '403.16', final: '403.00', rounding: '-0.16' });
  assert.equal(finalTotal({ total: '100.00', coupon: '150.00', rounds: true }).final, '0.00'); // never below zero
  assert.equal(finalTotal({ total: '100.40', rounds: true }).rounding, '0.60');
});

const rows = (o: Record<string, unknown>) => Object.entries(o).map(([key, value]) => ({ key, value, resolved_from: 'default' }));

test('the points scheme is read from settings, or unknown when they cannot be read', () => {
  assert.equal(readLoyalty(undefined), null);
  const off = readLoyalty(rows({}));
  assert.equal(off?.enabled, false);
  const on = readLoyalty(rows({ 'loyalty.enabled': true, 'loyalty.redeem_mode': 'PERCENT', 'loyalty.redeem_points': 100, 'loyalty.redeem_percent': '1' }));
  assert.equal(on?.enabled, true);
  assert.equal(on?.redeemMode, 'PERCENT');
});

const flat = readLoyalty(rows({ 'loyalty.enabled': true, 'loyalty.redeem_mode': 'FLAT', 'loyalty.redeem_points': 100, 'loyalty.redeem_value': '50', 'loyalty.min_redeem_points': 100 }))!;

test('flat scheme: whole blocks only, never more than the bill, none below the minimum', () => {
  assert.equal(pointsDiscount(flat, 380, '1000'), '150.00'); // 3 blocks of 100 points = 3 x 50
  assert.equal(redeemablePoints(flat, 380, '1000'), 300);
  assert.equal(redeemablePoints(flat, 99, '1000'), 0);
  assert.equal(redeemablePoints(flat, 1000, '120'), 200); // a ৳120 bill takes at most 2 blocks (৳100)
  assert.equal(redeemablePoints(flat, 500, '0'), 0);
  assert.equal(pointsDiscount({ ...flat, enabled: false }, 300, '1000'), '0.00');
});

test('flat scheme with part blocks allowed, and a per-sale cap', () => {
  const part = { ...flat, allowPartialRedeem: true, maxRedeemPerSale: 250 };
  assert.equal(redeemablePoints(part, 380, '1000'), 250);
  assert.equal(pointsDiscount(part, 250, '1000'), '125.00');
});

test('percent scheme: a share of the bill per block, capped at the whole bill', () => {
  const pct = readLoyalty(rows({ 'loyalty.enabled': true, 'loyalty.redeem_mode': 'PERCENT', 'loyalty.redeem_points': 100, 'loyalty.redeem_percent': '1', 'loyalty.min_redeem_points': 100 }))!;
  assert.equal(pointsDiscount(pct, 300, '1000'), '30.00');
  assert.equal(redeemablePoints(pct, 50000, '1000'), 10000); // 100 blocks = 100% of the bill, no more
  assert.equal(pointsDiscount(pct, 50000, '1000'), '1000.00');
});

test('a refusal that names the server total is picked up, any other is not', () => {
  assert.equal(totalFromRefusal(new ApiError(400, 'PAYMENT_EXCEEDS_TOTAL', 'x', { paid: '503.51', grand_total: '504.00' })), '504.00');
  assert.equal(totalFromRefusal(new ApiError(400, 'PAYMENT_EXCEEDS_TOTAL', 'x', {})), null);
  assert.equal(totalFromRefusal(new ApiError(400, 'OTHER', 'x', { grand_total: '1' })), null);
  assert.equal(totalFromRefusal(new Error('x')), null);
  // a walk-in left owing 0.36 after paying 491.64: the total was 492
  assert.equal(totalFromRefusal(new ApiError(400, 'WALK_IN_MUST_PAY_IN_FULL', 'x', { due: '0.3600' }), '491.64'), '492.00');
  assert.equal(totalFromRefusal(new ApiError(400, 'WALK_IN_MUST_PAY_IN_FULL', 'x', {}), '491.64'), null);
});

test('coupon refusals have plain sentences, and codes are typed upper case', () => {
  const say = (c: string) => describeDiscountError(new ApiError(404, c, 'raw'));
  assert.match(say('UNKNOWN_COUPON'), /no coupon/);
  assert.match(say('COUPON_INACTIVE'), /switched off/);
  assert.equal(say('SOMETHING_NEW'), 'raw');
  assert.equal(couponText('  eid10 '), 'EID10');
});
