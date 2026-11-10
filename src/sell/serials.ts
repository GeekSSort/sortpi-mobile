import { parseMoney } from '../lib/money.ts';
import type { Cart } from './cart.ts';

/**
 * Serial numbers at the till: an IMEI per phone, a number per blood-pressure monitor. A product sold by serial (the `serial` trade feature,
 * `track_serial` on the item) needs one number per unit before the sale is sent; the server refuses the sale otherwise (SERIALS_REQUIRED).
 * Numbers are kept per item, as the server matches them, and dealt to the cart's lines in order.
 */
export type SerialsByVariant = Record<string, string[]>;
export type Needed = { variantId: string; name: string; count: number };
export type Problem = { text: string; params?: Record<string, string | number> };

/** A scanner types a number and presses Enter (a line), people paste or type several with commas: spaces are dropped and letters upper-cased, as on the web till. */
export const parseSerials = (text: string): string[] => text.split(/[\n,]+/).map((v) => v.replace(/\s+/g, '').toUpperCase()).filter(Boolean);

/** Which items on the sale need numbers, and how many: one per unit, summed over the lines an item is on. */
export function serialsNeeded(cart: Cart): Needed[] {
  const by = new Map<string, Needed>();
  for (const l of cart) {
    if (!l.trackSerial) continue;
    const n = Math.max(0, Math.round(parseMoney(l.quantity).toNumber()));
    const seen = by.get(l.variantId);
    by.set(l.variantId, { variantId: l.variantId, name: l.name, count: (seen?.count ?? 0) + n });
  }
  return [...by.values()].filter((n) => n.count > 0);
}

/** What was typed for each item, checked against what is needed. Null problem means every item has exactly its numbers and none repeats. */
export function checkSerials(needed: Needed[], typed: Record<string, string>): { problem: Problem | null; serials: SerialsByVariant } {
  const serials: SerialsByVariant = {};
  const all = new Set<string>();
  for (const n of needed) {
    const list = parseSerials(typed[n.variantId] ?? '');
    serials[n.variantId] = list;
    if (list.length !== n.count) return { problem: { text: '{name} needs {n} serial numbers, one for each unit. You have {have}.', params: { name: n.name, n: n.count, have: list.length } }, serials };
    for (const s of list) {
      if (all.has(s)) return { problem: { text: 'The serial number {s} is entered twice.', params: { s } }, serials };
      all.add(s);
    }
  }
  return { problem: null, serials };
}

/** Each cart line's share of its item's numbers, in order (an item on two lines gives the first numbers to the first line). Keyed by the line's key. */
export function dealSerials(cart: Cart, serials: SerialsByVariant): Record<string, string[]> {
  const left: SerialsByVariant = Object.fromEntries(Object.entries(serials).map(([k, v]) => [k, [...v]]));
  const out: Record<string, string[]> = {};
  for (const l of cart) {
    if (!l.trackSerial) continue;
    out[l.key] = (left[l.variantId] ?? []).splice(0, Math.max(0, Math.round(parseMoney(l.quantity).toNumber())));
  }
  return out;
}
