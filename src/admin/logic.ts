import { daysBetween } from '../orders/logic.ts';
import { localDateISO } from '../lib/dates.ts';

/** How long ago a person last signed in, as people say it. `key` is an English key, `n` fills its `{n}`. */
export function lastSeen(iso: string | null, now: Date = new Date()): { key: string; n?: number } {
  if (!iso) return { key: 'Never signed in' };
  const days = daysBetween(localDateISO(new Date(iso)), localDateISO(now));
  if (days <= 0) return { key: 'Signed in today' };
  if (days === 1) return { key: 'Signed in yesterday' };
  return { key: 'Signed in {n} days ago', n: days };
}

export type Tone = 'good' | 'info' | 'warn' | 'bad' | 'plain';
export type ActionLook = { words: string; icon: 'CheckCircle' | 'Cash' | 'Package' | 'Lock' | 'Users' | 'Tag' | 'Undo' | 'TriangleAlert' | 'Pencil' | 'Receipt'; tone: Tone };

/**
 * What an activity entry means, in a shopkeeper's words. Anything the server adds later still shows: its code is spelled out
 * ("SALE_VOIDED" becomes "Sale voided") with a neutral look until it is added here.
 */
const KNOWN: Record<string, ActionLook> = {
  LOGIN: { words: 'Signed in', icon: 'Lock', tone: 'plain' },
  LOGOUT: { words: 'Signed out', icon: 'Lock', tone: 'plain' },
  LOGIN_FAILED: { words: 'Wrong password tried', icon: 'TriangleAlert', tone: 'warn' },
  ACCOUNT_LOCKED: { words: 'Account locked', icon: 'TriangleAlert', tone: 'bad' },
  PASSWORD_CHANGED: { words: 'Password changed', icon: 'Lock', tone: 'info' },
  SALE_CREATED: { words: 'Sale made', icon: 'Cash', tone: 'good' },
  SALE_CANCELLED: { words: 'Sale cancelled', icon: 'TriangleAlert', tone: 'bad' },
  SALE_RETURNED: { words: 'Goods taken back', icon: 'Undo', tone: 'warn' },
  PRICE_CHANGED: { words: 'Price changed', icon: 'Tag', tone: 'info' },
  PRODUCT_UPDATED: { words: 'Item changed', icon: 'Pencil', tone: 'info' },
  STOCK_ADJUSTED: { words: 'Stock corrected', icon: 'Package', tone: 'warn' },
  NEGATIVE_STOCK_ALLOWED: { words: 'Sold more than was in stock', icon: 'TriangleAlert', tone: 'warn' },
  USER_CREATED: { words: 'Person added', icon: 'Users', tone: 'info' },
  USER_UPDATED: { words: 'Person changed', icon: 'Users', tone: 'info' },
  BRANCH_ROLE_ASSIGNED: { words: 'Access given', icon: 'Users', tone: 'warn' },
  BRANCH_ROLE_REVOKED: { words: 'Access taken away', icon: 'Users', tone: 'warn' },
  ROLE_CREATED: { words: 'Role added', icon: 'Users', tone: 'info' },
  ROLE_UPDATED: { words: 'Role changed', icon: 'Users', tone: 'warn' },
  TRANSACTIONS_RESET: { words: 'Trial sales cleared', icon: 'TriangleAlert', tone: 'bad' },
  SALARY_PAYMENT_UNDONE: { words: 'Salary payment undone', icon: 'TriangleAlert', tone: 'bad' },
  SALARY_PAYMENT_CHANGED: { words: 'Salary payment changed', icon: 'Receipt', tone: 'warn' },
};
export const titleCase = (code: string): string => {
  const w = code.toLowerCase().replace(/_/g, ' ').trim();
  return w ? w[0].toUpperCase() + w.slice(1) : code;
};
export const describeAction = (code: string): ActionLook & { known: boolean } => (KNOWN[code] ? { ...KNOWN[code], known: true } : { words: titleCase(code), icon: 'Receipt', tone: 'plain', known: false });

/** The few most-looked-at kinds, each one server filter (the server takes a single action). */
export const ACTION_CHIPS: { id: string; label: string; action?: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'sales', label: 'Sales', action: 'SALE_CREATED' },
  { id: 'back', label: 'Goods taken back', action: 'SALE_RETURNED' },
  { id: 'price', label: 'Price changes', action: 'PRICE_CHANGED' },
  { id: 'stock', label: 'Stock corrections', action: 'STOCK_ADJUSTED' },
  { id: 'items', label: 'Item changes', action: 'PRODUCT_UPDATED' },
  { id: 'login', label: 'Sign-ins', action: 'LOGIN' },
];

type Values = Record<string, unknown> | null;
const text = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
/** One short line saying what the entry was about, from what the server recorded. Empty when there is nothing useful to add. */
export function detailLine(e: { action: string; old_values: Values; new_values: Values; note: string }): { key: string; params: Record<string, string> } | null {
  const n = e.new_values ?? {};
  const o = e.old_values ?? {};
  if (e.note.trim()) return { key: '{note}', params: { note: e.note.trim() } };
  if (e.action === 'SALE_CREATED' && text(n.invoice_number)) return { key: 'Invoice {n}', params: { n: text(n.invoice_number) } };
  if (e.action === 'SALE_RETURNED' && text(n.reference_no)) return { key: 'Return {n}', params: { n: text(n.reference_no) } };
  if (e.action === 'STOCK_ADJUSTED' && text(n.sku)) return { key: '{sku}: {change}', params: { sku: text(n.sku), change: `${Number(n.change) > 0 ? '+' : ''}${Number(n.change)}` } };
  if (e.action === 'PRICE_CHANGED') {
    const sku = text(o.sku) || text(n.sku);
    return sku ? { key: '{sku}', params: { sku } } : null;
  }
  const keys = Object.keys(n);
  if (e.action === 'PRODUCT_UPDATED' && keys.length) return { key: 'Changed: {fields}', params: { fields: keys.map((k) => k.replace(/_/g, ' ')).join(', ') } };
  return null;
}
export const amountOf = (e: { action: string; new_values: Values }): string | null => (e.action === 'SALE_CREATED' || e.action === 'SALE_RETURNED') && e.new_values && text(e.new_values.grand_total) ? text(e.new_values.grand_total) : null;
