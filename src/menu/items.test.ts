import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupMenu, MENU, visibleMenu } from './items.ts';

const same = (s: string) => s;

test('a person sees only what their permissions allow', () => {
  assert.deepEqual(visibleMenu(MENU, ['sale.view_own'], '', same).map((i) => i.id), ['sales', 'shop-settings']);
  assert.ok(visibleMenu(MENU, ['pos.access'], '', same).every((i) => i.id !== 'pos')); // the till needs both codes
  assert.deepEqual(visibleMenu(MENU, undefined, '', same), []);
  assert.equal(visibleMenu(MENU, MENU.flatMap((i) => i.needs), '', same, MENU.flatMap((i) => (i.trade ? [i.trade] : []))).length, MENU.length);
});

test('an item that needs every permission is hidden when one is missing', () => {
  assert.equal(visibleMenu(MENU, ['income.view'], '', same).some((i) => i.id === 'money'), false);
  assert.equal(visibleMenu(MENU, ['income.view', 'expense.view'], '', same).some((i) => i.id === 'money'), true);
});

test('search matches the English or the translated words, in any case', () => {
  const all = MENU.flatMap((i) => i.needs);
  assert.deepEqual(visibleMenu(MENU, all, 'CLOSE', same).map((i) => i.id), ['end-shift']);
  const bn = (s: string) => (s === 'Add Customer' ? 'কাস্টমার যোগ করুন' : s);
  assert.deepEqual(visibleMenu(MENU, all, 'কাস্টমার', bn).map((i) => i.id), ['add-customer']);
  assert.deepEqual(visibleMenu(MENU, all, 'zzz', same), []);
});

test('groups keep their order and empty ones are dropped', () => {
  const g = groupMenu(visibleMenu(MENU, ['product.create', 'sale.view'], '', same));
  assert.deepEqual(g.map((x) => x.group), ['dashboard', 'inventory', 'sales', 'settings']);
});

test('a row of one trade shows only in shops whose trade has it', () => {
  const all = MENU.flatMap((i) => i.needs);
  const ids = (trades?: string[]) => visibleMenu(MENU, all, '', same, trades).map((i) => i.id);
  assert.equal(ids().includes('expiry'), false);
  assert.equal(ids(['modal']).includes('expiry'), false);
  assert.equal(ids(['expiry']).includes('expiry'), true);
});
