import { addMoney } from '../lib/money.ts';
import type { CommissionRow, Delivery, GiftCard, Instalment } from './api.ts';

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function validateCard(f: { value: string; expires: string }): { value?: string; expires?: string } {
  const e: { value?: string; expires?: string } = {};
  if (!AMOUNT.test(f.value.trim()) || Number(f.value) <= 0) e.value = 'Enter the card amount.';
  if (f.expires.trim() && !DAY.test(f.expires.trim())) e.expires = 'Enter the last day as 2026-12-31.';
  return e;
}
export type CardLook = 'voided' | 'used' | 'expired' | 'live';
/** A gift card is voided, used up, past its last day, or good to spend. */
export function cardLook(c: Pick<GiftCard, 'is_active' | 'balance' | 'expires_on'>, today: string): CardLook {
  if (!c.is_active) return 'voided';
  if (Number(c.balance) <= 0) return 'used';
  return c.expires_on && c.expires_on < today ? 'expired' : 'live';
}

/** Collecting an instalment: more than nothing, never more than is still owed. */
export function collectProblem(amount: string, outstanding: string): string | null {
  if (!AMOUNT.test(amount.trim()) || Number(amount) <= 0) return 'Enter the amount received.';
  return Number(amount) > Number(outstanding) ? 'That is more than is still owed.' : null;
}
export const isOverdue = (p: Pick<Instalment, 'overdue'>): boolean => Number(p.overdue) > 0;
export const owedTotal = (plans: Pick<Instalment, 'outstanding'>[]): string => plans.reduce((s, p) => addMoney(s, p.outstanding), '0');

/** What can be done to a delivery next, and who may. */
export function deliverySteps(d: Pick<Delivery, 'status' | 'installation_required' | 'installed_at'>, canStep: boolean): { out: boolean; delivered: boolean; failed: boolean; installed: boolean } {
  const open = d.status === 'PENDING' || d.status === 'OUT';
  return { out: canStep && d.status === 'PENDING', delivered: canStep && open, failed: canStep && open, installed: canStep && d.status === 'DELIVERED' && d.installation_required && !d.installed_at };
}

export const totalCommission = (rows: Pick<CommissionRow, 'commission'>[]): string => rows.reduce((s, r) => addMoney(s, r.commission), '0');
export function validateTradeIn(f: { customerId: string; device: string; value: string }): { customerId?: string; device?: string; value?: string } {
  const e: { customerId?: string; device?: string; value?: string } = {};
  if (!f.customerId) e.customerId = 'Choose the customer.';
  if (!f.device.trim()) e.device = 'Enter what they are trading in.';
  if (f.value.trim() && !AMOUNT.test(f.value.trim())) e.value = 'Enter an amount like 5000.';
  return e;
}
