import type { Direction, Frequency, Regular } from './api.ts';

export const FREQUENCIES: { key: Frequency; label: string }[] = [
  { key: 'WEEKLY', label: 'Every week' },
  { key: 'MONTHLY', label: 'Every month' },
  { key: 'QUARTERLY', label: 'Every 3 months' },
  { key: 'YEARLY', label: 'Every year' },
];
export const frequencyWord = (f: string): string => FREQUENCIES.find((x) => x.key === f)?.label ?? f;
export const DIRECTIONS: { key: Direction; label: string }[] = [
  { key: 'EXPENSE', label: 'Money out' },
  { key: 'INCOME', label: 'Money in' },
];

export type RegularLook = 'overdue' | 'due' | 'soon' | 'later' | 'off';
/** How urgent a schedule is: switched off, overdue, due today, due within a week, or later. */
export function regularLook(r: Pick<Regular, 'is_active' | 'state' | 'days_until_due'>): RegularLook {
  if (!r.is_active) return 'off';
  if (r.state === 'OVERDUE' || r.days_until_due < 0) return 'overdue';
  if (r.state === 'DUE' || r.days_until_due === 0) return 'due';
  return r.days_until_due <= 7 ? 'soon' : 'later';
}
/** Only a schedule that is switched on and due (today or late) can be paid or skipped. */
export const canSettle = (r: Pick<Regular, 'is_active' | 'state' | 'days_until_due'>): boolean => regularLook(r) === 'overdue' || regularLook(r) === 'due';

export type RegularForm = { name: string; kind: Direction; categoryId: string; amount: string; frequency: Frequency; start: string };
export function validateRegular(f: RegularForm): { name?: string; categoryId?: string; amount?: string; start?: string } {
  const e: { name?: string; categoryId?: string; amount?: string; start?: string } = {};
  if (!f.name.trim()) e.name = 'Enter what this is for, like Shop rent.';
  if (!f.categoryId) e.categoryId = 'Choose a kind.';
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(f.amount.trim()) || Number(f.amount) <= 0) e.amount = 'Enter an amount above zero.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.start.trim())) e.start = 'Enter the date as 2026-11-08.';
  return e;
}
export const regularBody = (f: RegularForm, notes: string) => ({ name: f.name.trim(), kind: f.kind, category: f.categoryId, amount: f.amount.trim(), frequency: f.frequency, start_date: f.start.trim(), notes: notes.trim() });
