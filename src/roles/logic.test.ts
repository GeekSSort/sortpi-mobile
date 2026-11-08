import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupPerms, moduleLabel, moduleState, roleBody, toggleModule, toggleOne, validateRole } from './logic.ts';

const perms = [
  { code: 'sale.view', module: 'sale', description: '' },
  { code: 'sale.create', module: 'sale', description: '' },
  { code: 'account.view', module: 'account', description: '' },
  { code: 'expense_category.view', module: 'expense_category', description: '' },
];

test('permissions are grouped by module, A to Z', () => {
  const g = groupPerms(perms);
  assert.deepEqual(g.map((x) => x.module), ['account', 'expense_category', 'sale']);
  assert.deepEqual(g[2].items.map((p) => p.code), ['sale.view', 'sale.create']);
  assert.equal(moduleLabel('expense_category'), 'Expense category');
});

test('a module is all, some or none, and its switch turns all on or all off', () => {
  const codes = ['sale.view', 'sale.create'];
  assert.equal(moduleState([], codes), 'none');
  assert.equal(moduleState(['sale.view'], codes), 'some');
  assert.deepEqual(toggleModule(['sale.view'], codes).sort(), ['sale.create', 'sale.view']);
  assert.deepEqual(toggleModule(['sale.view', 'sale.create', 'x.y'], codes), ['x.y']);
  assert.deepEqual(toggleOne(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleOne(['a', 'b'], 'a'), ['b']);
});

test('a role needs a name and at least one permission', () => {
  assert.deepEqual(Object.keys(validateRole({ name: ' ', description: '', permissions: [] })).sort(), ['name', 'permissions']);
  assert.deepEqual(validateRole({ name: 'Packer', description: '', permissions: ['sale.view'] }), {});
  assert.deepEqual(roleBody({ name: ' Packer ', description: ' x ', permissions: ['b.b', 'a.a'] }), { name: 'Packer', description: 'x', permissions: ['a.a', 'b.b'] });
});

import { toggleName, validateUser } from './user.ts';

test('a new user needs a name, an email, a password and a role; an old one only a name and a role', () => {
  const empty = { email: '', name: '', phone: '', password: '', roles: [] };
  assert.deepEqual(Object.keys(validateUser(empty, true)).sort(), ['email', 'name', 'password', 'roles']);
  assert.deepEqual(Object.keys(validateUser(empty, false)).sort(), ['name', 'roles']);
  assert.deepEqual(validateUser({ email: 'a@b.co', name: 'A', phone: '', password: 'longenough', roles: ['Cashier'] }, true), {});
  assert.ok(validateUser({ email: 'a@b.co', name: 'A', phone: '', password: 'short', roles: ['Cashier'] }, true).password);
  assert.deepEqual(toggleName(['A'], 'B'), ['A', 'B']);
  assert.deepEqual(toggleName(['A', 'B'], 'A'), ['B']);
});
