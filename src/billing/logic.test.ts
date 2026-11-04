import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { choiceFor, dayText, limitsLine, daysLeft, describeBillingError, meter, periodLine, priceLine, requestBody, requestLook, requestProblem, statusLook, type Plan, type Subscription } from './logic.ts';

const plan = (code: string, o: Partial<Plan> = {}): Plan => ({ id: code, code, name: code, description: '', price: '1500.0000', interval: 'MONTHLY', trial_days: 14, max_branches: 1, max_users: 5, max_products: 2000, ...o });
const sub = (o: Partial<Subscription> = {}): Subscription => ({ plan: plan('starter'), status: 'ACTIVE', current_period_end: '2026-12-05T12:00:00+06:00', trial_ends_at: null, cancel_at_period_end: false, limits: { max_branches: 1, max_users: 5, max_products: 2000 }, usage: {}, ...o });
const NOW = new Date('2026-11-04T12:00:00+06:00');

test('each status has words, a colour and an icon', () => {
  assert.deepEqual(statusLook('ACTIVE'), { text: 'Active', tone: 'good', icon: 'CheckCircle' });
  assert.equal(statusLook('TRIALING').text, 'Free trial');
  assert.equal(statusLook('PAST_DUE').tone, 'warn');
  assert.equal(statusLook('SUSPENDED').tone, 'bad');
  assert.equal(statusLook('CANCELLED').tone, 'bad');
});

test('dates read as a day and month, and bad dates read as nothing', () => {
  assert.equal(dayText('2026-12-05T12:00:00+06:00', 'en'), '5 Dec 2026');
  assert.equal(dayText('nope', 'en'), '');
  assert.equal(dayText(null, 'bn'), '');
  assert.equal(daysLeft('2026-11-09T12:00:00+06:00', NOW), 5);
  assert.equal(daysLeft('2026-11-04T18:00:00+06:00', NOW), 1);
  assert.equal(daysLeft('2026-11-01T12:00:00+06:00', NOW), 0);
  assert.equal(daysLeft('x', NOW), null);
});

test('the one sentence about time', () => {
  assert.deepEqual(periodLine(sub({ status: 'TRIALING', trial_ends_at: '2026-11-09T12:00:00+06:00' }), NOW, 'en'), { text: 'Free trial ends on {date}. {n} days left.', vars: { date: '9 Nov 2026', n: 5 } });
  assert.equal(periodLine(sub({ status: 'TRIALING', trial_ends_at: '2026-11-05T12:00:00+06:00' }), NOW, 'en')?.text, 'Free trial ends on {date}. 1 day left.');
  assert.deepEqual(periodLine(sub(), NOW, 'en'), { text: 'Renews on {date}.', vars: { date: '5 Dec 2026' } });
  assert.equal(periodLine(sub({ cancel_at_period_end: true }), NOW, 'en')?.text, 'Ends on {date}. It will not renew.');
  assert.equal(periodLine(sub({ status: 'PAST_DUE' }), NOW, 'en')?.text, 'The period ended on {date}. Send your payment below.');
  assert.equal(periodLine(sub({ status: 'SUSPENDED' }), NOW, 'en'), null);
});

test('a bar is green with room, orange from 80%, red at the limit, and absent with no limit', () => {
  assert.deepEqual(meter(1, 5), { used: 1, limit: 5, pct: 20, tone: 'good', full: false });
  assert.equal(meter(4, 5).tone, 'warn');
  assert.deepEqual(meter(5, 5), { used: 5, limit: 5, pct: 100, tone: 'bad', full: true });
  assert.equal(meter(9, 5).pct, 100);
  assert.deepEqual(meter(300, null), { used: 300, limit: null, pct: 0, tone: 'good', full: false });
  assert.equal(meter(undefined, 3).used, 0);
});

test('a price in a few words', () => {
  assert.deepEqual(priceLine({ price: '0.0000', interval: 'MONTHLY' }), { text: 'Free', vars: {} });
  assert.deepEqual(priceLine({ price: '1500.0000', interval: 'MONTHLY' }), { text: '{amount} a month', vars: { amount: '৳1,500' } });
  assert.equal(priceLine({ price: '15000', interval: 'YEARLY' }).text, '{amount} a year');
});

test('a smaller plan is named before the shop pays, as the server would refuse it', () => {
  const s = sub();
  assert.deepEqual(choiceFor(s, plan('starter')), { kind: 'current' });
  assert.deepEqual(choiceFor(s, plan('standard', { max_branches: 3, max_users: 15, max_products: 20000 })), { kind: 'ok' });
  assert.deepEqual(choiceFor(s, plan('business', { max_branches: 10, max_users: 50, max_products: null })), { kind: 'ok' });
  assert.deepEqual(choiceFor(s, plan('free', { max_users: 3, max_products: 200 })), { kind: 'smaller', what: ['max_users', 'max_products'] });
  assert.deepEqual(choiceFor(sub({ limits: { max_branches: 1, max_users: 5, max_products: null } }), plan('standard', { max_products: 20000 })), { kind: 'smaller', what: ['max_products'] });
});

test('the request needs a transaction number; the amount is optional but must be digits', () => {
  const f = { method: 'MOBILE_BANKING' as const, transactionId: ' ABC123 ', amount: '', note: '' };
  assert.equal(requestProblem(f), null);
  assert.deepEqual(requestProblem({ ...f, transactionId: '  ' }), { field: 'transactionId', text: 'Type the transaction number of your payment.' });
  assert.equal(requestProblem({ ...f, transactionId: 'x'.repeat(121) })?.field, 'transactionId');
  assert.equal(requestProblem({ ...f, amount: '15oo' })?.field, 'amount');
  assert.equal(requestProblem({ ...f, amount: '1500.50' }), null);
  assert.deepEqual(requestBody('starter', f), { plan_code: 'starter', payment_method: 'MOBILE_BANKING', transaction_id: 'ABC123' });
  assert.deepEqual(requestBody('starter', { ...f, amount: '1500', note: ' paid today ' }), { plan_code: 'starter', payment_method: 'MOBILE_BANKING', transaction_id: 'ABC123', amount: '1500', note: 'paid today' });
});

test('a request reads by where it stands', () => {
  assert.equal(requestLook('PENDING').text, 'Waiting for SortPi');
  assert.equal(requestLook('REJECTED').tone, 'bad');
  assert.equal(requestLook('APPROVED').tone, 'good');
  assert.equal(requestLook('CANCELLED').tone, 'quiet');
});

test('billing refusals are said in words', () => {
  assert.equal(describeBillingError(new ApiError(409, 'UPGRADE_REQUEST_PENDING', 'x')), 'A request is already waiting. Cancel it first, or wait for SortPi to check it.');
  assert.equal(describeBillingError(new ApiError(400, 'PLAN_UNCHANGED', 'x')), 'You are already on this plan.');
  assert.equal(describeBillingError(new ApiError(404, 'NOT_FOUND', 'x')), 'Your shop has no plan on record.');
  assert.equal(describeBillingError(new ApiError(403, 'PERMISSION_DENIED', 'x')), 'You do not have permission to change this.');
});

test('a plan reads as one line of what it allows', () => {
  const t = (k: string, v: Record<string, string | number> = {}) => k.replace(/\{(\w+)\}/g, (_, n) => String(v[n]));
  assert.equal(limitsLine(plan('starter'), t), '1 branch · 5 people · 2,000 items');
  assert.equal(limitsLine(plan('big', { max_branches: 10, max_users: 50, max_products: null }), t), '10 branches · 50 people · Any number of items');
});
