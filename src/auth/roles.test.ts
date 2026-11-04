import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { landingTab, visibleTabs } from './roles.ts';

const { roles } = JSON.parse(readFileSync(new URL('./default-roles.fixture.json', import.meta.url), 'utf8')) as { roles: Record<string, string[]> };

test('each default role opens on the right tab', () => {
  assert.equal(landingTab(roles.Cashier), 'sell'); // the till, not a back-office page
  assert.equal(landingTab(roles['Branch Manager']), 'index'); // branch dashboard
  assert.equal(landingTab(roles.Inventory), 'stock');
  assert.equal(landingTab(roles.Accountant), 'index');
  assert.equal(landingTab(roles.Admin), 'index');
});

test('tabs follow what the role can actually use', () => {
  assert.deepEqual(visibleTabs(roles.Cashier), ['sell', 'stock', 'customers', 'more'].filter((t) => t !== 'customers' || roles.Cashier.includes('customer.view')));
  assert.ok(!visibleTabs(roles.Cashier).includes('index')); // no dashboard figures for a cashier
  assert.ok(!visibleTabs(roles.Inventory).includes('sell')); // no till for inventory
  assert.ok(!visibleTabs(roles.Accountant).includes('sell'));
  assert.deepEqual(visibleTabs(roles.Admin), ['index', 'sell', 'stock', 'customers', 'more']);
});

test('everyone keeps More, and nobody lands on a hidden tab', () => {
  for (const perms of [...Object.values(roles), []]) {
    assert.ok(visibleTabs(perms).includes('more'));
    assert.ok(visibleTabs(perms).includes(landingTab(perms)));
  }
  assert.equal(landingTab([]), 'more');
});
