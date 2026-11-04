import { compareMoney, subMoney } from '../lib/money.ts';
import { cleanCount } from '../stock/count.ts';
import { outstanding, type TransferItem } from './logic.ts';

/** What the person says arrived, per item id, as text. Starts as everything still on the way. */
export type Arrived = Record<string, string>;

const left = (i: Pick<TransferItem, 'quantity' | 'received_quantity'>) => outstanding(i);
/** Only items with something still on the way can be received. */
export const waiting = (items: TransferItem[]) => items.filter((i) => compareMoney(left(i), '0') > 0);

export const startAmounts = (items: TransferItem[]): Arrived => Object.fromEntries(waiting(items).map((i) => [i.id, left(i)]));

/** A typed amount: digits (a dot only where parts are allowed), never above what is still on the way. Empty stays empty. */
export function setAmount(amounts: Arrived, item: TransferItem, text: string): Arrived {
  const clean = cleanCount(text, item.unit_allow_decimal);
  return { ...amounts, [item.id]: clean && compareMoney(clean, left(item)) > 0 ? left(item) : clean };
}

export function stepAmount(amounts: Arrived, item: TransferItem, direction: 1 | -1): Arrived {
  const now = Number(amounts[item.id] || 0);
  const next = Math.max(0, now + direction);
  return { ...amounts, [item.id]: compareMoney(String(next), left(item)) > 0 ? left(item) : String(next) };
}

/** Why it cannot be saved yet, as an English key, or null. */
export const receiveProblem = (amounts: Arrived): string | null => (Object.values(amounts).some((v) => compareMoney(v || '0', '0') > 0) ? null : 'Enter how many arrived for at least one item.');

/** How many are still missing after this receipt, in total units, for the summary line. */
export const stillMissing = (items: TransferItem[], amounts: Arrived): string => waiting(items).reduce((s, i) => subMoney(String(Number(s) + Number(left(i))), amounts[i.id] || '0'), '0');

/** True when this receipt takes everything still on the way: then it is the same as "it all arrived". */
export const takesAll = (items: TransferItem[], amounts: Arrived): boolean => waiting(items).every((i) => compareMoney(amounts[i.id] || '0', left(i)) === 0);

/** The body for `POST .../receive/`. Items not named receive nothing, so only the ones with an amount are sent. Quantities go as text with three places. */
export const receiveBody = (amounts: Arrived) => ({ lines: Object.entries(amounts).filter(([, q]) => compareMoney(q || '0', '0') > 0).map(([item, q]) => ({ item, quantity: Number(q).toFixed(3) })) });
