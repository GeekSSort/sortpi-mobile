import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupMenu, MENU, visibleMenu } from './items.ts';

const same = (s: string) => s;

test('a person sees only what their permissions allow', () => {
  assert.deepEqual(visibleMenu(MENU, ['sale.view_own'], '', same).map((i) => i.id), ['sales']);
  assert.deepEqual(visibleMenu(MENU, undefined, '', same), []);
  assert.equal(visibleMenu(MENU, MENU.flatMap((i) => i.needs), '', same).length, MENU.length);
});

test('an item that needs every permission is hidden when one is missing', () => {
  assert.equal(visibleMenu(MENU, ['income.view'], '', same).some((i) => i.id === 'money'), false);
  assert.equal(visibleMenu(MENU, ['income.view', 'expense.view'], '', same).some((i) => i.id === 'money'), true);
});

test('search matches the English or the translated words, in any case', () => {
  const all = MENU.flatMap((i) => i.needs);
  assert.deepEqual(visibleMenu(MENU, all, 'CLOSE', same).map((i) => i.id), ['end-shift']);
  const bn = (s: string) => (s === 'Add a customer' ? 'কাস্টমার যোগ করুন' : s);
  assert.deepEqual(visibleMenu(MENU, all, 'কাস্টমার', bn).map((i) => i.id), ['add-customer']);
  assert.deepEqual(visibleMenu(MENU, all, 'zzz', same), []);
});

test('groups keep their order and empty ones are dropped', () => {
  const g = groupMenu(visibleMenu(MENU, ['product.create', 'sale.view'], '', same));
  assert.deepEqual(g.map((x) => x.group), ['sell', 'stock']);
});
