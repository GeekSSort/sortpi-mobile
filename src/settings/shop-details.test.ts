import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { companyPatch, companyProblems, couponBody, couponProblem, describeCouponError, formOf, plainValue, sortCoupons, tidyCode, worthOf, type Company, type Coupon } from './shop-details.ts';

const co: Company = { id: 'o', name: 'SortPi Demo', legal_name: '', tax_number: '', phone: '', email: 'a@b.c', address: '', logo_url: '', currency_code: 'BDT', currency_symbol: '৳', timezone: 'Asia/Dhaka' };
const cp = (code: string, on = true, id = code): Coupon => ({ id, code, mode: 'PERCENT', value: '10.0000', is_active: on, description: '' });

test('the shop must have a name and nothing may be longer than the server keeps', () => {
  assert.deepEqual(companyProblems(formOf(co)), {});
  assert.equal(companyProblems({ ...formOf(co), name: '   ' }).name, "Type your shop's name.");
  assert.equal(companyProblems({ ...formOf(co), phone: '1'.repeat(51) }).phone, 'Keep this to 50 letters.');
  assert.equal(companyProblems({ ...formOf(co), legal: 'x'.repeat(201) }).legal, 'Keep this to 200 letters.');
  assert.deepEqual(companyProblems({ ...formOf(co), tax: '', phone: '', address: '' }), {});
});

test('only what changed is sent, tidied, under the server names', () => {
  assert.deepEqual(companyPatch(co, formOf(co)), {});
  assert.deepEqual(companyPatch(co, { ...formOf(co), name: '  SortPi   Demo ' }), {});
  assert.deepEqual(companyPatch(co, { ...formOf(co), legal: 'SortPi Ltd', phone: ' 01711  000000 ', address: 'Road 1\n  Dhaka ' }), { legal_name: 'SortPi Ltd', phone: '01711 000000', address: 'Road 1\n Dhaka' });
  assert.deepEqual(companyPatch({ ...co, phone: '017' }, { ...formOf(co), phone: '' }), { phone: '' });
});

test('a coupon code is one case and has no spaces', () => {
  assert.equal(tidyCode(' eid25 '), 'EID25');
  assert.equal(couponProblem('', 'PERCENT', '10', [])?.text, 'Type the code customers will say.');
  assert.equal(couponProblem('A'.repeat(41), 'PERCENT', '10', [])?.text, 'Keep the code to 40 letters.');
  assert.equal(couponProblem('ab c', 'PERCENT', '10', [])?.text, 'A code cannot have a space in it.');
  assert.deepEqual(couponProblem('eid25', 'PERCENT', '10', [cp('EID25')]), { field: 'code', text: 'You already have a coupon with this code.' });
  assert.equal(couponProblem('eid25', 'PERCENT', '10', [cp('EID25')], 'EID25'), null);
});

test('a coupon takes something off, never more than the whole bill in percent', () => {
  assert.equal(couponProblem('A', 'PERCENT', '0', [])?.field, 'value');
  assert.equal(couponProblem('A', 'FLAT', '', [])?.text, 'Type how many taka to take off.');
  assert.equal(couponProblem('A', 'PERCENT', 'abc', [])?.text, 'Type how many percent to take off.');
  assert.equal(couponProblem('A', 'PERCENT', '150', [])?.text, 'A coupon cannot take off more than 100%.');
  assert.equal(couponProblem('A', 'PERCENT', '100', []), null);
  assert.equal(couponProblem('A', 'FLAT', '500.50', []), null);
  assert.equal(couponProblem('A', 'FLAT', '5.555', [])?.field, 'value');
  assert.deepEqual(couponBody(' eid25 ', 'FLAT', ' 50 '), { code: 'EID25', mode: 'FLAT', value: '50' });
});

test('what a coupon is worth reads in the way a shop says it', () => {
  assert.equal(plainValue('10.0000'), '10');
  assert.equal(plainValue('7.5000'), '7.5');
  assert.equal(plainValue('0'), '0');
  assert.deepEqual(worthOf({ mode: 'PERCENT', value: '12.5000' }), { text: '{n}% off', vars: { n: '12.5' } });
  assert.equal(worthOf({ mode: 'FLAT', value: '50.0000' }).text, '{amount} off');
});

test('coupons that are on come first, then by code', () => {
  assert.deepEqual(sortCoupons([cp('B', false), cp('C'), cp('A', false), cp('D')]).map((c) => c.code), ['C', 'D', 'A', 'B']);
});

test('a duplicate code is said in words', () => {
  assert.equal(describeCouponError(new ApiError(400, 'DUPLICATE_CODE', 'x')), 'You already have a coupon with this code.');
  assert.equal(describeCouponError(new ApiError(403, 'PERMISSION_DENIED', 'x')), 'You do not have permission to change this.');
});
