import { parseMoney } from '../lib/money.ts';
import type { Resolved } from './logic.ts';
import { plainValue } from './shop-details.ts';

/** The customer-points settings, by their server keys. The till follows exactly these; the server does not check them, so this file does. */
export const POINT_KEYS = {
  enabled: 'loyalty.enabled',
  earnPerAmount: 'loyalty.earn_per_amount',
  earnPoints: 'loyalty.earn_points',
  basis: 'loyalty.earn_basis',
  mode: 'loyalty.redeem_mode',
  redeemPoints: 'loyalty.redeem_points',
  redeemValue: 'loyalty.redeem_value',
  redeemPercent: 'loyalty.redeem_percent',
  minRedeem: 'loyalty.min_redeem_points',
  partial: 'loyalty.allow_partial_redeem',
  maxPerSale: 'loyalty.max_redeem_per_sale',
} as const;
export type PointField = keyof typeof POINT_KEYS;
export type PointKey = (typeof POINT_KEYS)[PointField];
export type PointType = 'BOOL' | 'INT' | 'DECIMAL' | 'STRING';
/** What the server needs to make a row the first time: its type. */
export const POINT_TYPE: Record<PointKey, PointType> = {
  'loyalty.enabled': 'BOOL',
  'loyalty.earn_per_amount': 'DECIMAL',
  'loyalty.earn_points': 'INT',
  'loyalty.earn_basis': 'STRING',
  'loyalty.redeem_mode': 'STRING',
  'loyalty.redeem_points': 'INT',
  'loyalty.redeem_value': 'DECIMAL',
  'loyalty.redeem_percent': 'DECIMAL',
  'loyalty.min_redeem_points': 'INT',
  'loyalty.allow_partial_redeem': 'BOOL',
  'loyalty.max_redeem_per_sale': 'INT',
};

export type Basis = 'NET_PAYABLE' | 'DISCOUNTED' | 'SUBTOTAL';
export type Mode = 'FLAT' | 'PERCENT';

/** The scheme as the screen holds it: numbers stay as typed text. */
export type Points = {
  enabled: boolean;
  earnPerAmount: string;
  earnPoints: string;
  basis: Basis;
  mode: Mode;
  redeemPoints: string;
  redeemValue: string;
  redeemPercent: string;
  minRedeem: string;
  partial: boolean;
  maxPerSale: string;
  /** Keys this branch has its own value for: a change for the whole shop would not reach it. */
  ownHere: string[];
};

/** What a points total is counted on, in the words a shop says it. */
export const BASES: { code: Basis; title: string; hint: string }[] = [
  { code: 'NET_PAYABLE', title: 'What the customer pays', hint: 'After discounts, and after points are used. The safest.' },
  { code: 'DISCOUNTED', title: 'The bill after discounts', hint: 'Before points are used, so spending points does not lose the ones just earned.' },
  { code: 'SUBTOTAL', title: 'The bill before discounts', hint: 'The most generous. A discount never costs the customer points.' },
];

const yes = (v: unknown, fallback: boolean) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : fallback);
const text = (v: unknown, fallback: string) => (v === undefined || v === null || v === '' ? fallback : plainValue(String(v)));

/** The scheme from the resolved settings. Missing rows read as the server's own starting values (off, 10 points per ৳100, 100 points = ৳50). */
export function readPoints(rows: Resolved[]): Points {
  const at = (k: string) => rows.find((r) => r.key === k)?.value;
  const basis = String(at(POINT_KEYS.basis) ?? '').toUpperCase();
  return {
    enabled: yes(at(POINT_KEYS.enabled), false),
    earnPerAmount: text(at(POINT_KEYS.earnPerAmount), '100'),
    earnPoints: text(at(POINT_KEYS.earnPoints), '10'),
    basis: basis === 'DISCOUNTED' || basis === 'SUBTOTAL' ? basis : 'NET_PAYABLE',
    mode: String(at(POINT_KEYS.mode) ?? '').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FLAT',
    redeemPoints: text(at(POINT_KEYS.redeemPoints), '100'),
    redeemValue: text(at(POINT_KEYS.redeemValue), '50'),
    redeemPercent: text(at(POINT_KEYS.redeemPercent), '1'),
    minRedeem: text(at(POINT_KEYS.minRedeem), '100'),
    partial: yes(at(POINT_KEYS.partial), false),
    maxPerSale: text(at(POINT_KEYS.maxPerSale), '0'),
    ownHere: rows.filter((r) => r.resolved_from === 'branch' && r.key.startsWith('loyalty.')).map((r) => r.key),
  };
}

const WHOLE = /^\d{1,7}$/;
const AMOUNT = /^\d{1,9}(\.\d{1,2})?$/;
const above0 = (s: string) => parseMoney(s).gt(0);

export type PointProblem = { field: PointField; text: string };

/** Why the scheme cannot be saved, as an English key, or null when it can. Only what the chosen way of spending shows is checked. */
export function pointsProblem(p: Points): PointProblem | null {
  if (!AMOUNT.test(p.earnPerAmount) || !above0(p.earnPerAmount)) return { field: 'earnPerAmount', text: 'Type how many taka, like 100.' };
  if (!WHOLE.test(p.earnPoints) || !above0(p.earnPoints)) return { field: 'earnPoints', text: 'Type how many points, like 10.' };
  if (!WHOLE.test(p.redeemPoints) || !above0(p.redeemPoints)) return { field: 'redeemPoints', text: 'Type how many points, like 100.' };
  if (p.mode === 'FLAT' && (!AMOUNT.test(p.redeemValue) || !above0(p.redeemValue))) return { field: 'redeemValue', text: 'Type how many taka are taken off, like 50.' };
  if (p.mode === 'PERCENT') {
    if (!AMOUNT.test(p.redeemPercent) || !above0(p.redeemPercent)) return { field: 'redeemPercent', text: 'Type how many percent are taken off, like 1.' };
    if (parseMoney(p.redeemPercent).gt(100)) return { field: 'redeemPercent', text: 'It cannot take off more than 100%.' };
  }
  if (!WHOLE.test(p.minRedeem)) return { field: 'minRedeem', text: 'Type a number, or 0 for no minimum.' };
  if (!WHOLE.test(p.maxPerSale)) return { field: 'maxPerSale', text: 'Type a number, or 0 for no limit.' };
  if (Number(p.maxPerSale) > 0 && Number(p.maxPerSale) < Number(p.redeemPoints)) return { field: 'maxPerSale', text: 'That is less than one set of points, so nobody could spend any. Use 0 for no limit.' };
  return null;
}

/** Only the settings that changed, as the text the server keeps. Empty when nothing changed. */
export function pointChanges(was: Points, now: Points): { key: PointKey; value: string }[] {
  const out: { key: PointKey; value: string }[] = [];
  for (const f of Object.keys(POINT_KEYS) as PointField[]) {
    const a = was[f];
    const b = now[f];
    if (a === b) continue;
    out.push({ key: POINT_KEYS[f], value: typeof b === 'boolean' ? (b ? 'true' : 'false') : String(b).trim() });
  }
  return out;
}

/** Points a spend earns: whole sets only, rounded down, as the server counts. Text in, whole-number text out. */
export function earnedFor(p: Pick<Points, 'earnPerAmount' | 'earnPoints'>, spend: string): string {
  const per = parseMoney(p.earnPerAmount);
  if (per.lte(0)) return '0';
  return parseMoney(spend).div(per).round(0, 0 /* round down */).times(parseMoney(p.earnPoints)).toFixed(0);
}

/** About how much of what a customer spends comes back to them as discount, in percent to one place. Only for taka-off schemes; a percent scheme depends on the next bill. Null when it cannot be worked out. */
export function givenBack(p: Points): string | null {
  if (p.mode !== 'FLAT') return null;
  const per = parseMoney(p.earnPerAmount);
  const block = parseMoney(p.redeemPoints);
  if (per.lte(0) || block.lte(0)) return null;
  return parseMoney(p.earnPoints).div(per).times(parseMoney(p.redeemValue).div(block)).times(100).round(1).toFixed(1).replace(/\.0$/, '');
}

/** What a person may type into a number box: digits, and one dot with at most two places when parts are allowed. */
export function cleanNumber(raw: string, decimal: boolean): string {
  if (!decimal) return raw.replace(/\D/g, '').slice(0, 7);
  const [whole, ...rest] = raw.replace(/[^\d.]/g, '').split('.');
  const frac = rest.join('').slice(0, 2);
  return rest.length ? `${whole.slice(0, 9)}.${frac}` : whole.slice(0, 9);
}
