import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Account } from './api.ts';
import { groupAccounts, transferable, validateAccount, validateTransfer } from './logic.ts';

const acc = (code: string, type: Account['account_type'], balance = '0', active = true): Account => ({ id: code, code, name: 'N' + code, account_type: type, balance, is_active: active, description: '' });

test('only money accounts can be moved between, not control accounts or switched-off ones', () => {
  const list = [acc('1100', 'ASSET'), acc('1120', 'ASSET'), acc('1200', 'ASSET'), acc('1110', 'ASSET'), acc('2100', 'LIABILITY'), acc('2300', 'LIABILITY'), acc('4000', 'REVENUE'), acc('1150', 'ASSET', '0', false)];
  assert.deepEqual(transferable(list).map((a) => a.code), ['1100', '1120', '2300']);
});

test('accounts are grouped by kind with totals, empty kinds left out', () => {
  const g = groupAccounts([acc('1120', 'ASSET', '100.50'), acc('1100', 'ASSET', '50'), acc('2300', 'LIABILITY', '-5')]);
  assert.deepEqual(g.map((x) => x.type), ['ASSET', 'LIABILITY']);
  assert.deepEqual(g[0].items.map((a) => a.code), ['1100', '1120']);
  assert.equal(Number(g[0].total), 150.5);
});

test('account and transfer forms say what is wrong', () => {
  assert.deepEqual(validateAccount({ code: '', name: ' ' }, true), { name: 'Enter the account name.', code: 'Enter an account number, like 1150.' });
  assert.deepEqual(validateAccount({ code: '', name: 'Petty cash' }, false), {});
  assert.deepEqual(Object.keys(validateTransfer({ from: '', to: '', amount: '0', date: 'x' })).sort(), ['amount', 'date', 'from', 'to']);
  assert.equal(validateTransfer({ from: 'a', to: 'a', amount: '5', date: '2026-11-08' }).to, 'Choose a different account.');
  assert.deepEqual(validateTransfer({ from: 'a', to: 'b', amount: '5.50', date: '2026-11-08' }), {});
});
