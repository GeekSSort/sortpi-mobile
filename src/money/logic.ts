import { ApiError } from '../api/client.ts';
import { localDateISO } from '../lib/dates.ts';

export type MoneyType = 'INCOME' | 'EXPENSE';
export type MoneyRange = 'today' | 'month' | 'all';

/** The server's `date_from` / `date_to`, in the phone's own time zone. "month" is the 1st of this month up to today. */
export function rangeDates(range: MoneyRange, now: Date = new Date()): { date_from?: string; date_to?: string } {
  if (range === 'all') return {};
  const from = range === 'today' ? now : new Date(now.getFullYear(), now.getMonth(), 1);
  return { date_from: localDateISO(from), date_to: localDateISO(now) };
}

/** An amount typed by a person: digits with up to two decimals, more than nothing. Commas and a leading ৳ are not accepted. */
export const isAmount = (text: string): boolean => /^\d+(\.\d{1,2})?$/.test(text.trim()) && Number(text) > 0;

export type DayChoice = 'today' | 'yesterday';

/** The date a person means by "today" or "yesterday", as the server reads it. */
export function dayChoice(choice: DayChoice, now: Date = new Date()): string {
  return localDateISO(choice === 'today' ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

/** The body for `POST /vouchers/`: the amount stays text, the sign belongs to the type, and an empty note is left out. */
export function voucherBody(o: { type: MoneyType; categoryId: string; amount: string; date: string; note: string; branchId?: string | null }) {
  return {
    type: o.type,
    category: o.categoryId,
    amount: o.amount.trim(),
    date: o.date,
    ...(o.note.trim() ? { description: o.note.trim() } : {}),
    ...(o.branchId ? { branch: o.branchId } : {}),
  };
}

/** A voucher's own date (a day with no time) as people say it: today, yesterday, or day and month. Month is 0-based. */
export function dayWord(isoDate: string, now: Date = new Date()): 'today' | 'yesterday' | { date: number; month: number } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const that = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((today - that) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return { date: d, month: m - 1 };
}

/** Which permission writes or voids each side of the books. */
export const permissionFor = (type: MoneyType, action: 'create' | 'delete'): string => `${type === 'INCOME' ? 'income' : 'expense'}.${action}`;

/** The list and the totals need both sides: one side alone would be a wrong total with nothing on screen to say so. */
export const canSeeMoney = (permissions: string[] | undefined): boolean => !!permissions?.includes('income.view') && !!permissions.includes('expense.view');

/** Words for the ways saving or cancelling an entry can fail (codes from the server's registry). English keys, translated on screen. */
export function describeMoneyError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'INVALID_VOUCHER_AMOUNT':
      return 'The amount must be more than zero.';
    case 'BRANCH_REQUIRED':
      return 'You are not in a branch yet. Ask your manager to add you to one.';
    case 'NOT_FOUND':
      return 'That category or entry is not there any more. Go back and try again.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It may not have been saved. Tap Save again: it will not be written twice.';
    default:
      return e.message || 'Could not save this.';
  }
}
