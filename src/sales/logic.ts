import { localDateISO } from '../lib/dates.ts';

export type SalesRange = 'today' | 'week' | 'all';

/** The server's `date_from` / `date_to` for a range, in the phone's own time zone. "week" is today and the six days before it. */
export function rangeDates(range: SalesRange, now: Date = new Date()): { date_from?: string; date_to?: string } {
  if (range === 'all') return {};
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range === 'week' ? 6 : 0));
  return { date_from: localDateISO(from), date_to: localDateISO(now) };
}

export type SaleState = 'cancelled' | 'due' | 'returned' | 'paid';

/** One word for where a sale stands, most important first: cancelled, then money still owed, then goods sent back, else paid. */
export function saleState(s: { status: string; due_amount: string; refund_state: string }): SaleState {
  if (s.status === 'CANCELLED') return 'cancelled';
  if (Number(s.due_amount) > 0) return 'due';
  if (s.refund_state !== 'NONE') return 'returned';
  return 'paid';
}

/** "Walk-in Customer" is the server's name for nobody in particular; people say "walk-in". */
export const isWalkIn = (name: string): boolean => /^walk-?in/i.test(name.trim());

/** Payment methods as the till names them. CREDIT is money left on the customer's account. */
export const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', MOBILE: 'Mobile', CARD: 'Card', BANK: 'Bank', CREDIT: 'On account', OTHER: 'Other' };
