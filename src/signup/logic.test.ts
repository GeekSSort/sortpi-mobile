import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { addressProblem, CATEGORIES, describeSignupError, emailProblem, EMPTY_FORM, ownerProblem, resendWait, shopHost, shopProblem, signupBase, signupBody, slugify } from './logic.ts';

const ok = { ...EMPTY_FORM, shopName: 'Rahman Traders', address: 'rahman-traders', category: 'grocery', ownerName: 'A Rahman', email: 'a@b.com', planCode: 'free' };

test('a web address is made from the shop name', () => {
  assert.equal(slugify('Rahman Traders'), 'rahman-traders');
  assert.equal(slugify("  Karim's  Cloth House! "), 'karim-s-cloth-house');
  assert.equal(slugify('Café Noir'), 'cafe-noir');
  assert.equal(slugify('রহমান স্টোর'), '');
  assert.equal(slugify('a'.repeat(80)).length, 63);
  assert.equal(slugify('x'.repeat(62) + ' y').endsWith('-'), false);
});

test('an address must be a usable shop name on the web', () => {
  assert.equal(addressProblem(''), 'Choose a web address for your shop.');
  assert.equal(addressProblem('ab'), 'Use at least 3 letters or digits.');
  assert.equal(addressProblem('a'.repeat(64)), 'Keep it to 63 letters or digits.');
  assert.equal(addressProblem('Bad_Name'), 'Use only small letters, digits and hyphens.');
  assert.equal(addressProblem('-abc'), 'It cannot start or end with a hyphen.');
  assert.equal(addressProblem('abc-'), 'It cannot start or end with a hyphen.');
  assert.equal(addressProblem('rahman-2'), null);
});

test('step one asks for the shop, what it sells and its address', () => {
  assert.equal(shopProblem(ok), null);
  assert.equal(shopProblem({ ...ok, shopName: '  ' })?.field, 'shopName');
  assert.equal(shopProblem({ ...ok, category: '' })?.field, 'category');
  assert.equal(shopProblem({ ...ok, address: 'x' })?.field, 'address');
});

test('step two asks for a name and a real-looking email; the phone may be empty', () => {
  assert.equal(ownerProblem(ok), null);
  assert.equal(ownerProblem({ ...ok, ownerName: '' })?.field, 'ownerName');
  assert.equal(ownerProblem({ ...ok, email: 'not-an-email' })?.field, 'email');
  assert.equal(emailProblem(' a@b.com '), null);
  assert.equal(emailProblem('a@b'), 'Type an email address, like name@example.com.');
  assert.equal(ownerProblem({ ...ok, phone: '1'.repeat(51) })?.field, 'phone');
});

test('the sign-up body names its fields the way the server does', () => {
  assert.deepEqual(signupBody(ok), { companyName: 'Rahman Traders', subdomain: 'rahman-traders', ownerName: 'A Rahman', email: 'a@b.com', planCode: 'free', businessCategory: 'grocery' });
  assert.equal(signupBody({ ...ok, phone: ' 01700000000 ' }).phone, '01700000000');
});

test('sign-up goes to the bare domain, except on a development server', () => {
  assert.equal(signupBase(null, 'sortpi.com'), 'https://sortpi.com/api/v1');
  assert.equal(signupBase('https://acme.sortpi.com/api/v1', 'sortpi.com'), 'https://sortpi.com/api/v1');
  assert.equal(signupBase('http://localhost:8010/api/v1', 'sortpi.com'), 'http://localhost:8010/api/v1');
  assert.equal(shopHost('rahman', 'sortpi.com'), 'rahman.sortpi.com');
  assert.equal(shopHost('', 'sortpi.com'), 'your-shop.sortpi.com');
});

test('the kinds of shop match what the server accepts', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.code).sort(), ['bakery', 'cosmetics', 'electronics', 'fabric', 'fashion', 'footwear', 'grocery', 'hardware', 'pharmacy', 'wellness']);
});

test('another code may be asked for only after the wait', () => {
  assert.equal(resendWait(0, 0), 30);
  assert.equal(resendWait(0, 12_500), 18);
  assert.equal(resendWait(0, 31_000), 0);
});

test('refusals are said in words a shopkeeper can act on', () => {
  assert.equal(describeSignupError(new ApiError(409, 'EMAIL_IN_USE', 'x')), 'That email already has an account. Sign in instead, or use another email.');
  assert.equal(describeSignupError(new ApiError(409, 'SUBDOMAIN_IN_USE', 'x')), 'That web address is taken. Choose another.');
  assert.equal(describeSignupError(new ApiError(400, 'CODE_INVALID', 'x')), 'That code is not right. Check your email and try again.');
  assert.equal(describeSignupError(new ApiError(400, 'VALIDATION_ERROR', 'x', { password: ['too short'] })), 'That password is not allowed. Use at least 8 characters.');
  assert.equal(describeSignupError(new ApiError(0, 'NETWORK_ERROR', 'x')), 'No connection. Nothing was lost. Try again.');
  assert.equal(describeSignupError(new Error('boom')), 'Something went wrong. Try again.');
});
