import { compareMoney } from '../lib/money.ts';

export type ShiftLook = 'open' | 'even' | 'short' | 'over';

/** Where a shift stands in one word: still open, closed with the cash matching, short (counted less than expected) or over. */
export function shiftLook(s: { status: string; variance: string | null }): ShiftLook {
  if (s.status.toUpperCase() === 'OPEN') return 'open';
  if (s.variance === null) return 'even';
  const c = compareMoney(s.variance, '0');
  return c < 0 ? 'short' : c > 0 ? 'over' : 'even';
}
