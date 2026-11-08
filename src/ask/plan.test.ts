import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPrompt, describePlan, GRAMMAR, grammarFor, missingInput, parsePlan, PERIODS, profileText, TOOLS, toolAllowed, toolOffered, toolsFor } from './plan.ts';

test('the grammar allows every tool, "none" and every period, and nothing else', () => {
  for (const t of TOOLS) assert.ok(GRAMMAR.includes(`"${t.id}"`), t.id);
  for (const p of PERIODS) assert.ok(GRAMMAR.includes(`"${p}"`), p);
  assert.ok(GRAMMAR.includes('"none"'));
  assert.ok(GRAMMAR.startsWith('root ::= "{\\"tool\\":\\""'));
});

test('a reply becomes a plan only when every part is on the lists', () => {
  assert.deepEqual(parsePlan('{"tool":"item_sales","period":"yesterday","item":"Water ","name":""}'), { tool: 'item_sales', period: 'yesterday', item: 'water', name: '' });
  assert.equal(parsePlan('{"tool":"none","period":"today","item":"","name":""}'), 'none');
  assert.equal(parsePlan('{"tool":"drop_tables","period":"today","item":"","name":""}'), null);
  assert.equal(parsePlan('{"tool":"sales_total","period":"next year","item":"","name":""}'), null);
  assert.equal(parsePlan('Sure! {"tool":"sales_total"}'), null);
  assert.equal(parsePlan(''), null);
  // odd characters are stripped, length capped
  assert.equal(parsePlan(`{"tool":"stock_of","period":"today","item":"wa<script>ter ${'x'.repeat(80)}","name":""}`)?.constructor, Object);
  const p = parsePlan(`{"tool":"stock_of","period":"today","item":"wa<script>ter ${'x'.repeat(80)}","name":""}`);
  assert.ok(typeof p === 'object' && p !== null && p.item.length <= 40 && !/[<>]/.test(p.item));
});

test('a lookup that needs an item or a name says what is missing', () => {
  assert.equal(missingInput({ tool: 'stock_of', period: 'today', item: '', name: '' }), 'item');
  assert.equal(missingInput({ tool: 'stock_of', period: 'today', item: 'water', name: '' }), null);
  assert.equal(missingInput({ tool: 'customer_balance', period: 'today', item: '', name: '' }), 'name');
  assert.equal(missingInput({ tool: 'sales_total', period: 'today', item: '', name: '' }), null);
});

test('each lookup is open only to someone who may open its screen', () => {
  assert.equal(toolAllowed('profit', ['report.sales']), false);
  assert.equal(toolAllowed('profit', ['sale.view_profit']), true);
  assert.equal(toolAllowed('sales_by_cashier', undefined), false);
  assert.equal(toolAllowed('bills', ['sale.view_own']), true);
});

test('the prompt lists every lookup, shows worked examples, ends with a closed thinking block and clips a long question', () => {
  const p = buildPrompt('x'.repeat(500));
  for (const t of TOOLS) assert.ok(p.includes(t.id), t.id);
  assert.ok(p.includes('pani koy botte'));
  assert.ok(p.endsWith('<think>\n\n</think>\n\n'));
  assert.ok(!p.includes('x'.repeat(201)));
});

test('what was understood is shown in plain words', () => {
  assert.equal(describePlan({ tool: 'item_sales', period: 'yesterday', item: 'water', name: '' }, (s) => s), 'Sales of one item · Yesterday · water');
  assert.equal(describePlan({ tool: 'profit', period: 'month', item: '', name: '' }, (s) => s), 'Profit · This month');
});


test('a shop gets only the lookups its trade has and its role may open', () => {
  const all = ['report.sales', 'sale.view', 'inventory.view', 'product.view', 'pos.access', 'customer.view', 'report.finance', 'sale.view_profit'];
  const ids = (features: string[]) => toolsFor(features, all).map((t) => t.id);
  assert.ok(ids(['expiry']).includes('expiring_soon') && ids(['expiry']).includes('expired_stock'));
  assert.ok(!ids([]).includes('expiring_soon'));
  assert.ok(ids(['metal_rate']).includes('metal_rates') && !ids(['expiry']).includes('metal_rates'));
  assert.ok(ids(['tailoring']).includes('orders_due') && ids(['repair']).includes('orders_due') && !ids(['expiry']).includes('orders_due'));
  assert.ok(!toolsFor(['expiry'], ['sale.view']).some((t) => t.id === 'profit'), 'a cashier-level role does not get profit');
  assert.equal(toolOffered('expiring_soon', ['expiry']), true);
  assert.equal(toolOffered('expiring_soon', ['metal_rate']), false);
  assert.equal(toolOffered('sales_total', undefined), true);
});

test('the grammar and prompt of a shop list only its own lookups', () => {
  const tools = toolsFor(['expiry'], ['inventory.view', 'sale.view', 'report.sales', 'product.view']);
  const g = grammarFor(tools);
  assert.ok(g.includes('"expiring_soon"') && !g.includes('"metal_rates"') && g.includes('"none"'));
  const p = buildPrompt('meyad sesh koto', { business: 'Pharmacy', features: ['expiry', 'generic'], tools, words: { categories: ['Tablet', 'Syrup'], brands: ['Square'], units: ['strip'], items: ['Napa Extra'] } });
  assert.ok(p.includes('This shop is a Pharmacy.') && p.includes('Tablet, Syrup') && p.includes('strip') && p.includes('expiring_soon'));
  assert.ok(!p.includes('metal_rates') && !p.includes('sonar dam'), 'a pharmacy is not shown gold-rate lookups or examples');
  assert.ok(p.includes('baki: about a person it is money owed') && p.includes('kal means yesterday'));
});

test('the profile says nothing it does not know', () => {
  assert.equal(profileText({}), '');
  assert.equal(profileText({ business: 'Fabric & textiles', features: ['modal'], words: null }), 'This shop is a Fabric & textiles.\nIts trade uses: modal.');
});
