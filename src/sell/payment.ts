import { compareMoney, subMoney, type Money } from '../lib/money.ts';
import type { PaymentInput, PaymentMethod } from './cart.ts';

export type PayChoice = PaymentMethod | 'CREDIT';

/** Money as typed: digits with up to 2 decimals. */
const isAmount = (v: string) => /^\d{1,12}(\.\d{1,2})?$/.test(v.trim());

/**
 * What goes in `payments[]` for a sale worth `total`.
 * - Cash, card, bank and mobile pay the whole total, or `payNow` if a customer is named and part is left on their account.
 * - "On credit" pays nothing now and puts the whole total on the customer's account.
 * A walk-in cannot owe money, so they pay in full. The server enforces the credit limit; this only keeps the form honest.
 */
export function buildPayments(o: { choice: PayChoice; total: Money; payNow: string; reference: string; hasCustomer: boolean }): { payments: PaymentInput[]; due: Money; problem: string | null } {
  const { choice, total, payNow, reference, hasCustomer } = o;
  if (choice === 'CREDIT') {
    if (!hasCustomer) return { payments: [], due: total, problem: 'Choose a customer first: a sale on credit goes on their account.' };
    return { payments: [], due: total, problem: null };
  }
  let amount = total;
  if (payNow.trim()) {
    if (!isAmount(payNow)) return { payments: [], due: total, problem: 'Enter the amount paid now, like 500 or 500.50.' };
    if (compareMoney(payNow, total) > 0) return { payments: [], due: total, problem: 'That is more than the total.' };
    amount = payNow.trim();
  }
  const due = subMoney(total, amount);
  if (compareMoney(due, '0') > 0 && !hasCustomer) return { payments: [], due, problem: 'Choose a customer to leave the rest on their account, or take the full amount.' };
  const ref = reference.trim();
  return { payments: compareMoney(amount, '0') > 0 ? [{ payment_method: choice, amount, ...(ref && choice !== 'CASH' ? { reference_no: ref } : {}) }] : [], due, problem: null };
}
