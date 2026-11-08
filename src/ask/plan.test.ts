import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPrompt, describePlan, GRAMMAR, missingInput, parsePlan, PERIODS, TOOLS, toolAllowed } from './plan.ts';

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
