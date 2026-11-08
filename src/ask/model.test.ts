import assert from 'node:assert/strict';
import { test } from 'node:test';

import { askWhich, billsAnswer, duesAnswer, itemSalesAnswer, rankedAnswer, notAllowed, notUnderstood, paymentsAnswer, pctChange, priceAnswer, profitAnswer, salesAnswer, stockListAnswer, stockOfAnswer, SUGGESTION_WORDS, topAnswer } from './model.ts';
import { INTENTS } from './intents.ts';

test('percent change compares with before, and says nothing when before was zero', () => {
  assert.equal(pctChange('150', '100'), 50);
  assert.equal(pctChange('75', '100'), -25);
  assert.equal(pctChange('100', '0'), null);
});

test('a sales answer has the number, the count, a trend and one action', () => {
  const a = salesAnswer({ title: 'Sales today', count: 2, total: '104.00', before: '80.00' });
  assert.equal(a.stats?.[0].value.includes('104'), true);
  assert.equal(a.stats?.[0].note, '+30%');
  assert.equal(a.action.route, '/sales');
  assert.equal(salesAnswer({ title: 'x', count: 0, total: '0' }).lead.text, 'Nothing has been sold in this time.');
});

test('stock answers warn for low and shout for finished, and offer to reorder', () => {
  const low = stockListAnswer({ kind: 'low', lines: [{ name: 'Rice', available: '3.000', reorder: '10.000', unit: 'kg' }] });
  assert.equal(low.rows?.[0].tone, 'warn');
  assert.equal(low.alert?.tone, 'warn');
  assert.equal(low.action.label, 'Reorder');
  const out = stockListAnswer({ kind: 'out', lines: [{ name: 'Tea', available: '0', reorder: '5', unit: null }] });
  assert.equal(out.alert?.tone, 'bad');
  assert.equal(stockListAnswer({ kind: 'low', lines: [] }).alert, undefined);
});

test('totals add up from the rows, never from a model', () => {
  assert.equal(duesAnswer({ title: 'Owed', rows: [{ name: 'A', owed: '100.50' }, { name: 'B', owed: '49.50' }], route: '/customers', action: 'View customers' }).stats?.[0].value.includes('150'), true);
  assert.equal(paymentsAnswer([{ label: 'Cash', amount: '30' }, { label: 'bKash', amount: '20' }]).lead.params?.amount.toString().includes('50'), true);
});

test('item answers say when nothing matches and when it is finished', () => {
  assert.equal(priceAnswer('colla', []).lead.text, 'No item matches "{name}".');
  const s = stockOfAnswer('rice', [{ name: 'Rice', stock: '0', unit: 'kg', reorder: '5' }]);
  assert.equal(s.alert?.tone, 'bad');
  assert.equal(s.action.route, '/new-purchase');
  assert.equal(stockOfAnswer('rice', [{ name: 'Rice', stock: '9', unit: 'kg', reorder: '5' }]).action.route, '/stock');
});

test('top, bills and profit answers', () => {
  assert.equal(topAnswer([{ name: 'Tea', sold: '12.000', revenue: '600' }]).lead.params?.name, 'Tea');
  assert.equal(billsAnswer([{ invoice: 'INV-1', time: '2:30 PM', total: '50', due: '10' }]).rows?.[0].tone, 'bad');
  assert.equal(profitAnswer({ profit: '-20.00', revenue: '100' }).stats?.[1].tone, 'bad');
});

test('every answer has exactly one action, and every intent has a suggestion', () => {
  for (const a of [notUnderstood(), notAllowed()]) assert.ok(a.action.label);
  for (const i of INTENTS) assert.ok(SUGGESTION_WORDS[i.id], i.id);
});

test('a question is allowed only with a permission that opens its screen', async () => {
  const { allowed } = await import('./allowed.ts');
  assert.equal(allowed('profit_today', ['report.sales']), false);
  assert.equal(allowed('profit_today', ['sale.view_profit']), true);
  assert.equal(allowed('due_amount', undefined), false);
  assert.equal(allowed('bills_today', ['sale.view_own']), true);
  for (const i of INTENTS) assert.equal(typeof allowed(i.id, []), 'boolean');
});

test('item sales add up the matching lines, and say so when nothing matched', () => {
  const a = itemSalesAnswer({ name: 'water', matches: [{ name: 'Water 1L', sold: '10.000', revenue: '300.00' }, { name: 'Water 2L', sold: '5.000', revenue: '250.00' }] });
  assert.equal(a.stats?.[0].value, '15');
  assert.equal(String(a.lead.params?.amount).includes('550'), true);
  assert.equal(itemSalesAnswer({ name: 'tea', matches: [] }).lead.text, 'No sales of "{name}" in this time.');
  assert.equal(askWhich('item').action.ask, 'sales_today');
  assert.equal(rankedAnswer({ title: 'x', lead: { text: 'y' }, rows: [], route: '/reports', action: 'View reports' }).action.route, '/reports');
});
