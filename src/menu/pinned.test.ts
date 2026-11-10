import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MENU, visibleMenu } from './items.ts';
import { topTasks } from './pinned.ts';

const ALL = ['pos.access', 'sale.create', 'product.view', 'inventory.view', 'customer.view', 'sale.view', 'purchase.create', 'income.view', 'expense.view', 'report.sales', 'dashboard.view', 'purchase.view', 'supplier.view'];
const open = (perms: string[]) => visibleMenu(MENU, perms, '', (s) => s);
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

test('with no use yet the six are the daily jobs, in order', () => {
  assert.deepEqual(ids(topTasks(open(ALL), {})), ['pos', 'stock-levels', 'customers', 'sales', 'new-purchase', 'money']);
});

test('what the person opens most comes first and pushes out the last default', () => {
  const got = ids(topTasks(open(ALL), { reports: 9, customers: 4 }));
  assert.deepEqual(got.slice(0, 2), ['reports', 'customers']);
  assert.equal(got.length, 6);
  assert.ok(!got.includes('money'));
});

test('only what the person may open is shown, and a cashier gets fewer than six', () => {
  assert.deepEqual(ids(topTasks(open(['pos.access', 'sale.create', 'product.view']), {})), ['pos', 'stock-levels']);
});

test('two rows leading to the same page show once', () => {
  const got = topTasks(open(ALL), { returns: 5, sales: 3 });
  assert.equal(got.filter((i) => i.route === '/sales').length, 1);
});
