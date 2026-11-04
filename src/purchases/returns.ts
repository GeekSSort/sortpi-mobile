import { ApiError } from '../api/client.ts';
import { compareMoney, mulMoney, parseMoney, subMoney } from '../lib/money.ts';

type Item = { id: string; quantity: string; received_quantity: string; returned_quantity: string; returnable?: string; unit_cost: string };
type Perms = string[] | undefined;

/** How many of a line can still go back: the server's own figure (received minus already returned), worked out here only if it is missing. */
export const sendable = (it: Item): string => it.returnable ?? subMoney(it.received_quantity, it.returned_quantity);

/** Goods can go back only after they arrived, and only if someone may and something is left. The server decides again. */
export const canSendBack = (p: { status: string; items: Item[] }, perms: Perms): boolean =>
  !!perms?.includes('purchase.return') && (p.status === 'RECEIVED' || p.status === 'PARTIAL') && p.items.some((i) => compareMoney(sendable(i), '0') > 0);

/** The lines the person chose, in the server's shape. Quantities stay strings. */
export const chosenLines = (chosen: Record<string, string>): { purchase_item: string; quantity: string }[] =>
  Object.entries(chosen)
    .filter(([, q]) => parseMoney(q).gt(0))
    .map(([purchase_item, quantity]) => ({ purchase_item, quantity }));

/** The server numbers the return, prices it at the cost the goods came in at, and takes the stock out. Nothing money is sent. */
export const returnBody = (o: { chosen: Record<string, string>; reason: string; today: string }) => ({
  return_date: o.today,
  ...(o.reason.trim() ? { reason: o.reason.trim() } : {}),
  items: chosenLines(o.chosen),
});

/**
 * About what the supplier will credit, shown before confirming (there is no preview call for this one).
 * Cost × amount, plus the order's own tax rate; the exact figure comes back from the server and is what is shown afterwards.
 */
export function estimateCredit(p: { subtotal: string; tax_amount: string; items: Item[] }, chosen: Record<string, string>): string {
  const goods = p.items.reduce((sum, it) => sum.plus(parseMoney(mulMoney(it.unit_cost, chosen[it.id] ?? '0'))), parseMoney('0'));
  const rate = parseMoney(p.subtotal).gt(0) ? parseMoney(p.tax_amount).div(parseMoney(p.subtotal)) : parseMoney('0');
  return goods.times(rate.plus(1)).round(2).toFixed(2);
}

/**
 * Did an earlier attempt that lost its connection actually go through? This call is not replay-safe on the server (a repeat with the
 * same key makes a second return), so before trying again the order is read afresh: every chosen line must already show at least that
 * much more as sent back than it did before the attempt.
 */
export function alreadySent(before: Record<string, string>, after: { id: string; returned_quantity: string }[], chosen: Record<string, string>): boolean {
  const lines = chosenLines(chosen);
  if (lines.length === 0) return false;
  return lines.every((l) => {
    const now = after.find((i) => i.id === l.purchase_item)?.returned_quantity;
    return now !== undefined && compareMoney(subMoney(now, before[l.purchase_item] ?? '0'), l.quantity) >= 0;
  });
}

/** Words for the ways sending goods back can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeSendBackError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'RETURN_HAS_NO_LINES':
      return 'Choose at least one item to return.';
    case 'INVALID_RETURN_QUANTITY':
      return 'An amount must be more than zero.';
    case 'RETURN_EXCEEDS_ORIGINAL':
      return 'That is more than arrived, or some of it was already returned.';
    case 'INSUFFICIENT_STOCK':
      return 'Some of these goods are no longer in stock. They were sold or moved, so they cannot be returned.';
    case 'PURCHASE_NOT_RECEIVED':
      return 'Nothing has arrived on this order yet, so nothing can be returned.';
    case 'NOT_FOUND':
      return 'This order or item was not found.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It may not have gone through. Tap Confirm again: the order is checked first, so the goods will not be returned twice.';
    default:
      return e.message || 'Could not save this.';
  }
}
