import { compareMoney, addMoney } from '../lib/money.ts';
import type { Account, AccountType } from './api.ts';

/** The web's own names for the five kinds of account. */
export const TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
export const TYPE_WORD: Record<AccountType, string> = { ASSET: 'Asset', LIABILITY: 'Liability', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSE: 'Expense' };

/** Accounts a transfer may not touch, because another ledger answers for them: Receivable, VAT receivable, Inventory, Goods in transit, Payable, Salaries payable. */
export const CONTROL_CODES = ['1110', '1130', '1200', '1210', '2100', '2200'];

/** The accounts that hold money and may be moved between: in use, an asset or a liability, and not a control account. */
export const transferable = (accounts: Account[]): Account[] => accounts.filter((a) => a.is_active && (a.account_type === 'ASSET' || a.account_type === 'LIABILITY') && !CONTROL_CODES.includes(a.code));

export type AccountGroup = { type: AccountType; label: string; total: string; items: Account[] };
/** Accounts under their kind, each kind with what its accounts add up to. Empty kinds are left out. */
export function groupAccounts(accounts: Account[]): AccountGroup[] {
  return TYPE_ORDER.map((type) => {
    const items = accounts.filter((a) => a.account_type === type).sort((a, b) => a.code.localeCompare(b.code));
    return { type, label: TYPE_WORD[type], items, total: items.reduce((s, a) => addMoney(s, a.balance), '0') };
  }).filter((g) => g.items.length > 0);
}

export function validateAccount(f: { code: string; name: string }, isNew: boolean): { code?: string; name?: string } {
  const e: { code?: string; name?: string } = {};
  if (!f.name.trim()) e.name = 'Enter the account name.';
  if (isNew && !f.code.trim()) e.code = 'Enter an account number, like 1150.';
  return e;
}

export function validateTransfer(f: { from: string; to: string; amount: string; date: string }): { from?: string; to?: string; amount?: string; date?: string } {
  const e: { from?: string; to?: string; amount?: string; date?: string } = {};
  if (!f.from) e.from = 'Choose where the money comes from.';
  if (!f.to) e.to = 'Choose where it goes.';
  else if (f.to === f.from) e.to = 'Choose a different account.';
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(f.amount.trim()) || compareMoney(f.amount.trim(), '0') <= 0) e.amount = 'Enter an amount above zero.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date.trim())) e.date = 'Enter the date as 2026-11-08.';
  return e;
}
