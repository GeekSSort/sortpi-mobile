import { compareMoney, subMoney, type Money } from '../lib/money.ts';

const isAmount = (v: string) => /^\d{1,12}(\.\d{1,2})?$/.test(v.trim());

/** Counted minus expected, as the web's close form shows it: Exact, Short or Over. Null until a real amount is typed. */
export function drawerVariance(counted: string, expected: Money): { kind: 'exact' | 'short' | 'over'; amount: Money } | null {
  if (!isAmount(counted)) return null;
  const diff = subMoney(counted, expected);
  const c = compareMoney(diff, '0');
  if (c === 0) return { kind: 'exact', amount: '0' };
  return c < 0 ? { kind: 'short', amount: subMoney('0', diff) } : { kind: 'over', amount: diff };
}

/** The web will not close a shift without a counted figure; 0 is allowed for an empty drawer. */
export const countedProblem = (counted: string): string | null => (isAmount(counted) ? null : 'Count the cash in the drawer and enter it. Enter 0 if it is empty.');
