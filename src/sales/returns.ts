import { ApiError } from '../api/client.ts';
import { compareMoney, parseMoney, subMoney } from '../lib/money.ts';

/** How goods are given back. CREDIT leaves the money on the customer's account; the rest are paid out. */
export type RefundMethod = 'CASH' | 'MOBILE' | 'CARD' | 'BANK' | 'CREDIT';
/** What the customer pays towards a due that the goods do not cover (the server takes tender types only). */
export type Tender = 'CASH' | 'MOBILE' | 'CARD' | 'BANK';

type Line = { id: string; quantity: string; returned_quantity: string };

/** How many of a line can still come back: what was sold minus what already did. */
export const returnable = (item: Line): string => subMoney(item.quantity, item.returned_quantity);

/** A return needs a completed sale with at least one line that has something left to give back. */
export const canReturn = (sale: { status: string; items: Line[] }): boolean => sale.status === 'COMPLETED' && sale.items.some((i) => compareMoney(returnable(i), '0') > 0);

/** One step of the quantity buttons, never below nothing and never above what can still come back. Whole items step by 1, items sold by weight by 0.5. */
export function stepQuantity(current: string, direction: 1 | -1, max: string, allowDecimal: boolean): string {
  const next = parseMoney(current).plus(parseMoney(allowDecimal ? '0.5' : '1').times(direction));
  if (next.lte(0)) return '0';
  return next.gt(parseMoney(max)) ? parseMoney(max).toFixed() : next.toFixed();
}

/** The lines the person actually chose, in the server's shape. Quantities stay strings. */
export function chosenLines(chosen: Record<string, string>): { sale_item_id: string; quantity: string }[] {
  return Object.entries(chosen)
    .filter(([, q]) => parseMoney(q).gt(0))
    .map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }));
}

/** The preview and the return take the same body; nothing is priced here, the server refunds at the price stamped on the original line. */
export function previewBody(chosen: Record<string, string>, method: RefundMethod) {
  return { refund_method: method, items: chosenLines(chosen) };
}

export function returnBody(o: { chosen: Record<string, string>; method: RefundMethod; reason: string; today: string; payRest?: { amount: string; method: Tender } | null }) {
  return {
    return_date: o.today,
    ...previewBody(o.chosen, o.method),
    ...(o.reason.trim() ? { reason: o.reason.trim() } : {}),
    // The rest of a due the goods do not cover has to be paid with the return (RETURN_LEAVES_DUE), exactly that amount.
    ...(o.payRest && compareMoney(o.payRest.amount, '0') > 0 ? { payment: { amount: o.payRest.amount, payment_method: o.payRest.method } } : {}),
  };
}

export type ReturnPreview = { returned_value: string; previous_due: string; applied_to_due: string; refund_amount: string; store_credit: string; remaining_due: string; refund_requires_paid: boolean };

/** What the person is told before confirming, in the order they think: the goods, what it takes off what they owe, what they get back. */
export function previewFacts(p: ReturnPreview) {
  const pos = (v: string) => compareMoney(v, '0') > 0;
  return { worth: p.returned_value, offDue: pos(p.applied_to_due) ? p.applied_to_due : null, giveBack: pos(p.refund_amount) ? p.refund_amount : null, onAccount: pos(p.store_credit) ? p.store_credit : null, payRest: pos(p.remaining_due) ? p.remaining_due : null };
}

/** The shop's rule can be to refund only paid invoices: then a sale that still owes has to be paid first. */
export const mustPayFirst = (p: ReturnPreview | undefined, saleDue: string): boolean => !!p?.refund_requires_paid && compareMoney(saleDue, '0') > 0;

/** Words for the ways a return can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeReturnError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'RETURN_HAS_NO_LINES':
      return 'Choose at least one item to send back.';
    case 'INVALID_RETURN_QUANTITY':
      return 'An amount must be more than zero.';
    case 'RETURN_EXCEEDS_ORIGINAL':
      return 'That is more than was sold, or some of it was already sent back.';
    case 'RETURN_LEAVES_DUE':
      return 'These goods are worth less than the customer owes on this sale. The customer must pay the rest now.';
    case 'RETURN_PAYMENT_EXCEEDS_DUE':
      return 'The payment is more than the customer owes.';
    case 'RETURN_INVOICE_HAS_DUE':
      return 'This sale still has money owed. Take that payment first, then send the goods back.';
    case 'SALE_NOT_COMPLETED':
      return 'This sale was cancelled, so nothing can be sent back.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. The return may not have gone through. Tap Confirm again: it will not be done twice.';
    default:
      return e.message || 'Could not save the return.';
  }
}
