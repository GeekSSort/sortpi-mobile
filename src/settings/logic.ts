import { ApiError } from '../api/client.ts';
import { parseMoney } from '../lib/money.ts';

/** The shop settings this screen changes, by their server keys. */
export const KEYS = {
  vat: 'tax.default_rate',
  vatIncluded: 'tax.inclusive_by_default',
  maxDiscount: 'pos.max_discount_percent',
  target: 'sales.daily_target',
  methods: 'pos.online_payment_methods',
  negativeStock: 'inventory.allow_negative_stock',
  partial: 'pos.allow_partial_payment',
  roundWhole: 'pos.round_to_whole',
  refundPaid: 'sales.refund_requires_paid',
  barcodes: 'catalog.use_barcodes',
  activeUnit: 'inventory.default_unit_id',
} as const;
export type SettingKey = (typeof KEYS)[keyof typeof KEYS];
export type ValueType = 'DECIMAL' | 'BOOL' | 'STRING';
/** What the server needs to create a row the first time: its type. */
export const TYPE_OF: Record<SettingKey, ValueType> = {
  'tax.default_rate': 'DECIMAL',
  'tax.inclusive_by_default': 'BOOL',
  'pos.max_discount_percent': 'DECIMAL',
  'sales.daily_target': 'DECIMAL',
  'pos.online_payment_methods': 'STRING',
  'inventory.allow_negative_stock': 'BOOL',
  'pos.allow_partial_payment': 'BOOL',
  'pos.round_to_whole': 'BOOL',
  'sales.refund_requires_paid': 'BOOL',
  'catalog.use_barcodes': 'BOOL',
  'inventory.default_unit_id': 'STRING',
};

export type Resolved = { key: string; value: unknown; resolved_from: string };

const asBool = (v: unknown, fallback: boolean): boolean => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : fallback);

/** A fraction the server keeps (0.15) as the percent a person says (15). Blank when it is not a number. */
export function toPercent(raw: unknown): string {
  try {
    return parseMoney(String(raw)).times(100).round(2).toString();
  } catch {
    return '';
  }
}

export type Shop = {
  vat: string;
  maxDiscount: string;
  /** Blank means no target is set (the server keeps 0 for that). */
  target: string;
  vatIncluded: boolean;
  negativeStock: boolean;
  partial: boolean;
  roundWhole: boolean;
  refundPaid: boolean;
  barcodes: boolean;
  methods: string[];
  activeUnit: string | null;
  /** Keys this branch has its own value for: a change made for the whole shop would not reach it. */
  ownHere: string[];
};

/** The settings as the screen shows them. Defaults match the server's own, so a missing row reads the way the till behaves. */
export function readShop(rows: Resolved[]): Shop {
  const at = (k: string) => rows.find((r) => r.key === k)?.value;
  const target = (() => {
    try {
      const n = parseMoney(String(at(KEYS.target) ?? '0'));
      return n.gt(0) ? n.toString() : '';
    } catch {
      return '';
    }
  })();
  const unit = at(KEYS.activeUnit);
  return {
    vat: toPercent(at(KEYS.vat) ?? '0.15'),
    maxDiscount: toPercent(at(KEYS.maxDiscount) ?? '0.20'),
    target,
    vatIncluded: asBool(at(KEYS.vatIncluded), true),
    negativeStock: asBool(at(KEYS.negativeStock), false),
    partial: asBool(at(KEYS.partial), false),
    roundWhole: asBool(at(KEYS.roundWhole), false),
    refundPaid: asBool(at(KEYS.refundPaid), true),
    barcodes: asBool(at(KEYS.barcodes), true),
    methods: parseMethods(at(KEYS.methods)),
    activeUnit: typeof unit === 'string' && unit ? unit : null,
    ownHere: rows.filter((r) => r.resolved_from === 'branch').map((r) => r.key),
  };
}

export type Checked = { ok: string } | { problem: string };

/** A percent typed by a person, checked and turned into the fraction the server keeps ("7.5" becomes "0.0750"). Zero is allowed, a blank is not. */
export function checkPercent(text: string): Checked {
  const s = text.trim();
  if (!s) return { problem: 'Type a number, like 15.' };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { problem: 'Use digits only, like 7.5.' };
  const n = parseMoney(s);
  if (n.gt(100)) return { problem: 'That cannot be more than 100.' };
  return { ok: n.div(100).toFixed(4) };
}

/** The daily target in taka. Blank or zero means no target. Kept as text, never a JS number. */
export function checkTarget(text: string): Checked {
  const s = text.trim().replace(/,/g, '');
  if (!s) return { ok: '0' };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { problem: 'Use digits only, like 5000.' };
  if (s.replace(/\.\d+$/, '').length > 9) return { problem: 'That is too large.' };
  return { ok: parseMoney(s).toFixed() };
}

/** Words for the ways a settings write can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeSettingsError(e: unknown): string {
  if (!(e instanceof ApiError) || e.status >= 500) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'PERMISSION_DENIED':
      return 'You do not have permission to change this.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It was not saved. Try again.';
    case 'DUPLICATE_RESOURCE':
      return 'You already have one with that name.';
    case 'NOT_FOUND':
      return 'This was not found. Pull down to refresh.';
    default:
      return e.message || 'Could not save this.';
  }
}

// ---- Payment methods -----------------------------------------------------------------------------------------------------------

export type Tender = 'CASH' | 'MOBILE' | 'BANK' | 'CARD' | 'OTHER';
/** The usual ways of being paid. The server books each payment by the method's name, so these also say which ledger a name goes to. */
export const USUAL_METHODS: { code: string; hint: string; tender: Tender; aliases: string[] }[] = [
  { code: 'bKash', hint: 'Mobile banking', tender: 'MOBILE', aliases: ['bkash', 'b-kash', 'bkash merchant', 'bkash personal'] },
  { code: 'Nagad', hint: 'Mobile banking', tender: 'MOBILE', aliases: ['nagad', 'nogod'] },
  { code: 'Rocket', hint: 'Mobile banking', tender: 'MOBILE', aliases: ['rocket', 'dbbl rocket', 'dbbl mobile banking'] },
  { code: 'Upay', hint: 'Mobile banking', tender: 'MOBILE', aliases: ['upay', 'upay wallet'] },
  { code: 'Card', hint: 'Card machine', tender: 'CARD', aliases: ['card', 'cards', 'visa', 'mastercard', 'master card', 'visa/mastercard', 'visa / mastercard', 'debit card', 'credit card', 'pos card'] },
  { code: 'Bank Transfer', hint: 'Money sent to your bank', tender: 'BANK', aliases: ['bank transfer', 'banktransfer', 'bank', 'wire', 'wire transfer', 'eft', 'neft', 'rtgs'] },
  { code: 'Cheque', hint: 'Bank cheque', tender: 'BANK', aliases: ['cheque', 'check', 'bank cheque'] },
  { code: 'Others', hint: 'Anything else', tender: 'OTHER', aliases: ['others', 'other', 'misc', 'miscellaneous'] },
  { code: 'Card EMI', hint: 'Card paid in instalments', tender: 'CARD', aliases: ['emi', 'card emi', 'bank emi', 'credit card emi'] },
];
export const DEFAULT_METHODS = ['Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Others'];
export const MAX_METHOD_NAME = 30;

const usual = (raw: string) => USUAL_METHODS.find((m) => m.code.toLowerCase() === raw.trim().toLowerCase() || m.aliases.includes(raw.trim().toLowerCase()));
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const tidyName = (s: string) => s.trim().replace(/\s+/g, ' ');

/** The stored list ("Card, bKash, ...") as names in the shop's order. Old spellings are mapped to the usual name; an empty list falls back to the default. */
export function parseMethods(raw: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (typeof raw === 'string' ? raw : '').split(',')) {
    const name = usual(part)?.code ?? tidyName(part);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out.length ? out : [...DEFAULT_METHODS];
}
export const serializeMethods = (list: string[]): string => list.map((m) => m.trim()).filter(Boolean).join(', ');

/** Which ledger the server books a method under, from its name. Cash has its own button and is never in this list. */
export function tenderOf(name: string): Tender {
  const n = name.trim().toLowerCase();
  if (!n) return 'CASH';
  if (n === 'cash') return 'CASH';
  const known = usual(n);
  if (known) return known.tender;
  for (const m of USUAL_METHODS) for (const s of [m.code.toLowerCase(), ...m.aliases]) if (s.length >= 4 && n.includes(s)) return m.tender;
  return 'OTHER';
}
export const RECORDED_AS: Record<Tender, string> = { CASH: 'Cash', MOBILE: 'Mobile banking', BANK: 'Bank', CARD: 'Card', OTHER: 'Other' };

/** Why a name cannot go on the list, as an English key, or null when it can. `except` is the name being replaced. */
export function methodProblem(name: string, list: string[], except?: string): string | null {
  if (!name) return "Type the method's name.";
  if (name.includes(',')) return "A method's name cannot have a comma in it.";
  if (name.length > MAX_METHOD_NAME) return 'Keep it to 30 letters.';
  if (same(name, 'cash')) return 'Cash is always there already.';
  if (list.some((m) => same(m, name) && !(except && same(m, except)))) return 'That one is already in the list.';
  return null;
}

/** The usual methods not on the list yet, to offer as one tap each. */
export const unusedUsual = (list: string[]) => USUAL_METHODS.filter((m) => !list.some((x) => same(x, m.code)));

export function moveUp<T>(list: T[], i: number): T[] {
  if (i <= 0 || i >= list.length) return list;
  const next = list.slice();
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return next;
}

// ---- Stock types (units) ------------------------------------------------------------------------------------------------------

export type UnitPreset = { name: string; short: string; decimals: boolean; note: string };
export const UNIT_PRESETS: UnitPreset[] = [
  { name: 'Piece', short: 'pcs', decimals: false, note: 'Counted whole' },
  { name: 'Kilogram', short: 'kg', decimals: true, note: 'Weighed' },
  { name: 'Gram', short: 'g', decimals: true, note: 'Weighed' },
  { name: 'Litre', short: 'L', decimals: true, note: 'Poured' },
  { name: 'Millilitre', short: 'ml', decimals: true, note: 'Poured' },
  { name: 'Metre', short: 'm', decimals: true, note: 'Measured' },
  { name: 'Centimetre', short: 'cm', decimals: true, note: 'Measured' },
];
export const presetAdded = (p: UnitPreset, existing: { name: string }[]) => existing.some((u) => same(u.name, p.name));

/** Why a stock type cannot be added, as an English key, or null when it can. */
export function unitProblem(name: string, short: string, existing: { name: string }[]): string | null {
  const n = tidyName(name);
  if (!n) return 'Type a name, like Dozen.';
  if (n.length > 50) return 'Keep the name to 50 letters.';
  if (!short.trim()) return 'Type a short name, like doz.';
  if (short.trim().length > 10) return 'Keep the short name to 10 letters.';
  if (existing.some((u) => same(u.name, n))) return 'You already have one with that name.';
  return null;
}
export const unitBody = (name: string, short: string, decimals: boolean) => ({ name: tidyName(name), short_name: short.trim(), allow_decimal: decimals });
