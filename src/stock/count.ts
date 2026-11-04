import { ApiError } from '../api/client.ts';
import { compareMoney, parseMoney, subMoney } from '../lib/money.ts';

/** The parts of a stock row the count needs (checked on the live server; cost fields come only for roles that may see cost). */
export type CountSource = { variant: string; sku: string; quantity: string; unit_short_name: string | null; unit_allow_decimal: boolean | null; average_cost?: string; cost_price?: string };

/** One counted item: what the system said when it was first counted, and what was on the shelf. `cost` is only for an item that was never in stock. */
export type CountLine = { variant: string; sku: string; name: string; unit: string | null; decimal: boolean; expected: string; counted: string; cost: string | null; hasAverageCost: boolean };
export type Counts = Record<string, CountLine>;

/** What a person types for an amount: digits, and one dot with up to three places only for items sold by weight or volume. */
export function cleanCount(text: string, decimal: boolean): string {
  const t = text.replace(decimal ? /[^\d.]/g : /\D/g, '');
  if (!decimal) return t;
  const [whole, ...rest] = t.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 3)}` : whole;
}

const startLine = (src: CountSource, name: string, counted: string): CountLine => ({
  variant: src.variant,
  sku: src.sku,
  name,
  unit: src.unit_short_name,
  decimal: src.unit_allow_decimal === true,
  expected: src.quantity,
  counted,
  cost: src.cost_price && compareMoney(src.cost_price, '0') > 0 ? src.cost_price : null,
  hasAverageCost: !!src.average_cost && compareMoney(src.average_cost, '0') > 0,
});

/** Sets what was counted for one item. An empty or unfinished entry takes the item back out of the count. The system figure is kept from the first time it was counted. */
export function setCounted(lines: Counts, src: CountSource, name: string, text: string): Counts {
  const clean = cleanCount(text, src.unit_allow_decimal === true);
  const next = { ...lines };
  if (clean === '' || clean === '.') {
    delete next[src.variant];
    return next;
  }
  next[src.variant] = { ...(lines[src.variant] ?? startLine(src, name, clean)), counted: clean };
  return next;
}

/** One click of a hand counter: +1 or -1 from what is counted (nothing counted yet is zero), never below zero. */
export function stepCount(lines: Counts, src: CountSource, name: string, direction: 1 | -1): Counts {
  const now = parseMoney(lines[src.variant]?.counted || '0');
  const next = now.plus(direction);
  return setCounted(lines, src, name, next.lt(0) ? '0' : next.toFixed());
}

/** "It is the same as the system": the usual answer for most shelves. */
export const countAsSystem = (lines: Counts, src: CountSource, name: string): Counts => setCounted(lines, src, name, src.quantity.replace(/\.?0+$/, '') || '0');

/** Counted minus system, as text. */
export const difference = (l: CountLine): string => subMoney(l.counted, l.expected);
export const isChange = (l: CountLine): boolean => compareMoney(l.counted, l.expected) !== 0;

export const changedLines = (lines: Counts): CountLine[] => Object.values(lines).filter(isChange).sort((a, b) => a.name.localeCompare(b.name));

/** How many were counted, how many differ, and the net units. */
export function tally(lines: Counts): { counted: number; differ: number; net: string } {
  const all = Object.values(lines);
  const changed = all.filter(isChange);
  return { counted: all.length, differ: changed.length, net: changed.reduce((n, l) => n.plus(parseMoney(difference(l))), parseMoney('0')).toFixed() };
}

/** An item that was never in stock has no average cost for the new units to take on: the server then needs a cost for them. */
export const needsCost = (l: CountLine): boolean => compareMoney(l.expected, '0') <= 0 && compareMoney(l.counted, '0') > 0 && !l.hasAverageCost;

/** The first item that needs a cost and has none on record, so it can be named before anything is sent. */
export const missingCost = (lines: Counts): CountLine | undefined => changedLines(lines).find((l) => needsCost(l) && !l.cost);

const qty = (v: string) => parseMoney(v).toFixed(3);

/**
 * The whole count as one COUNT adjustment, applied in the same call. Only lines that differ are sent (an unchanged count would still
 * write an empty record). Each line says what it saw, and `expect_unchanged` makes the server refuse the lot if the shelf moved meanwhile.
 */
export function countBody(warehouse: string, lines: Counts) {
  return {
    warehouse,
    reason: 'COUNT' as const,
    note: 'Stock count',
    apply: true,
    expect_unchanged: true,
    items: changedLines(lines).map((l) => ({ variant: l.variant, new_quantity: qty(l.counted), expected_quantity: qty(l.expected), ...(needsCost(l) && l.cost ? { unit_cost: l.cost } : {}) })),
  };
}

/** The server names every line that moved and what is on the shelf now: take those figures as the system figures, keep what was counted. */
export function applyMoved(lines: Counts, e: unknown): Counts {
  if (!(e instanceof ApiError) || e.code !== 'ADJUSTMENT_STOCK_MOVED') return lines;
  const moved = Array.isArray(e.errors.lines) ? (e.errors.lines as { sku?: string; on_hand?: string }[]) : [];
  const next = { ...lines };
  for (const m of moved) {
    const hit = Object.values(next).find((l) => l.sku === m.sku);
    if (hit && m.on_hand) next[hit.variant] = { ...hit, expected: m.on_hand };
  }
  return next;
}

/** Words for the ways a count can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeCountError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'ADJUSTMENT_STOCK_MOVED':
      return 'Some items were sold or moved while you counted. Their system figures are updated: check them, then post again.';
    case 'ADJUSTMENT_COST_REQUIRED':
      return 'An item that was never in stock here has no cost price. Set its cost price first.';
    case 'ADJUSTMENT_HAS_NO_LINES':
      return 'Nothing differs from the system, so there is nothing to post.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NOT_FOUND':
      return 'This warehouse is not yours to count.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. The count may not have been saved. Tap Post again: it will not be saved twice.';
    default:
      return e.message || 'Could not post the count.';
  }
}
