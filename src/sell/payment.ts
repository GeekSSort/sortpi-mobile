import { addMoney, compareMoney, parseMoney, subMoney, type Money } from '../lib/money.ts';
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
export function buildPayments(o: { choice: PayChoice; total: Money; payNow: string; reference: string; hasCustomer: boolean; giftBalance?: Money | null }): { payments: PaymentInput[]; due: Money; problem: string | null } {
  const { choice, total, payNow, reference, hasCustomer, giftBalance } = o;
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
  // A gift card is spent by its code, which goes in the payment's reference; the server takes it from the card's balance and never past it.
  if (choice === 'GIFT_CARD') {
    if (!reference.trim()) return { payments: [], due: total, problem: "Type the gift card's code." };
    if (giftBalance && compareMoney(amount, giftBalance) > 0) return { payments: [], due: total, problem: 'The card has less left than this payment. Put what it has left in "Customer pays now" (choose a customer) and take the rest another way.' };
  }
  const due = subMoney(total, amount);
  if (compareMoney(due, '0') > 0 && !hasCustomer) return { payments: [], due, problem: 'Choose a customer to leave the rest on their account, or take the full amount.' };
  const ref = reference.trim().slice(0, MAX_REFERENCE);
  return { payments: compareMoney(amount, '0') > 0 ? [{ payment_method: choice, amount, ...(ref && choice !== 'CASH' ? { reference_no: ref } : {}) }] : [], due, problem: null };
}

/**
 * What is being taken right now: the whole total, or "Customer pays now" when a customer is named and that is a real amount that is not
 * more than the total. Whether the cash handed over is enough, and the change to give back, are judged against THIS, not the full total:
 * a customer paying 500 of 1,000 in cash is not "short" with 500, and 1,000 handed over means 500 back.
 */
export function amountDueNow(total: Money, payNow: string, hasCustomer: boolean): Money {
  const n = payNow.trim();
  if (!hasCustomer || !n || !isAmount(n)) return total;
  if (compareMoney(n, '0') <= 0 || compareMoney(n, total) > 0) return total;
  return n;
}

/** The mobile wallets a till names. The shop's server records only "mobile banking" and a reference, so the wallet goes in front of the reference. */
export const WALLETS = ['bKash', 'Nagad', 'Rocket', 'Upay'] as const;
/** The shop keeps a payment's reference in 50 characters (`SalePayment.reference_no`); longer is cut so the sale is never refused for it. */
export const MAX_REFERENCE = 50;
export const walletReference = (wallet: string | null, txn: string): string => {
  const room = MAX_REFERENCE - (wallet ? wallet.length + 1 : 0);
  return [wallet, txn.trim().slice(0, Math.max(0, room))].filter(Boolean).join(' ');
};

export type SplitRow = { method: 'CASH' | 'CARD' | 'MOBILE' | 'BANK'; amount: string; reference: string };

/**
 * Several ways of paying for one sale ("Multiple payment"): each row is a method and an amount. The parts may not come to more than the
 * total; when they come to less, the rest goes on a named customer's account, and a walk-in must pay it all. Empty rows are ignored.
 */
export function buildSplitPayments(rows: SplitRow[], total: Money, hasCustomer: boolean): { payments: PaymentInput[]; due: Money; problem: string | null } {
  const used = rows.filter((r) => r.amount.trim() !== '');
  if (used.some((r) => !isAmount(r.amount) || compareMoney(r.amount, '0') <= 0)) return { payments: [], due: total, problem: 'Enter each amount like 500 or 500.50.' };
  if (used.length < 2) return { payments: [], due: total, problem: 'Split the bill between at least two ways of paying.' };
  const sum = used.reduce((n, r) => addMoney(n, r.amount.trim()), '0');
  if (compareMoney(sum, total) > 0) return { payments: [], due: total, problem: 'The parts come to more than the total.' };
  const due = subMoney(total, sum);
  if (compareMoney(due, '0') > 0 && !hasCustomer) return { payments: [], due, problem: 'The parts come to less than the total. Choose a customer to leave the rest on their account, or make them add up.' };
  const payments: PaymentInput[] = used.map((r) => {
    const ref = r.reference.trim().slice(0, MAX_REFERENCE);
    return { payment_method: r.method, amount: r.amount.trim(), ...(ref && r.method !== 'CASH' ? { reference_no: ref } : {}) };
  });
  return { payments, due, problem: null };
}

/** The cash a customer is most likely to hand over for `total`: exactly the bill, then the next round notes above it (50, 100, 500, 1000, 2000). */
export function quickCashOffers(total: Money): Money[] {
  const t = parseMoney(total);
  const out: Money[] = [t.toFixed(2)];
  for (const step of [50, 100, 500, 1000, 2000]) {
    const up = t.div(step).round(0, 3).times(step); // rounded up to a whole step
    const v = up.eq(t) ? up.plus(step) : up;
    const f = v.toFixed(2);
    if (!out.includes(f)) out.push(f);
    if (out.length === 5) break;
  }
  return out;
}
