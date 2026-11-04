import { ApiError } from '../api/client.ts';
import { localDateISO } from '../lib/dates.ts';
import { compareMoney, parseMoney, subMoney } from '../lib/money.ts';

export type OrderStatus = 'OPEN' | 'READY' | 'COLLECTED' | 'CANCELLED';
export const ORDER_WORDS: Record<OrderStatus, string> = { OPEN: 'Waiting', READY: 'Ready to collect', COLLECTED: 'Handed over', CANCELLED: 'Cancelled' };
export type QuoteStatus = 'OPEN' | 'SENT' | 'CANCELLED';

type Perms = string[] | undefined;
const has = (p: Perms, code: string) => !!p?.includes(code);
/** Whole days from `from` to `to` (negative when `to` is earlier). Calendar days, so daylight saving cannot shift it. */
export const daysBetween = (from: string, to: string): number => Math.round((Date.UTC(...ymd(to)) - Date.UTC(...ymd(from))) / 86_400_000);
function ymd(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m - 1, d];
}

export type DueState = 'late' | 'today' | 'soon' | 'later' | 'done';
/** How urgent an order is: late and today are what the shop must act on; a finished order has no urgency. */
export function dueState(o: { status: string; due_date: string }, today: string = localDateISO()): { state: DueState; days: number } {
  const days = daysBetween(today, o.due_date);
  if (o.status !== 'OPEN' && o.status !== 'READY') return { state: 'done', days };
  return { state: days < 0 ? 'late' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'later', days };
}

/** What a person may do next with an order, from its status, what is left to pay and their permissions. The server decides again. */
export function orderSteps(o: { status: string; balance: string }, perms: Perms) {
  const live = o.status === 'OPEN' || o.status === 'READY';
  const sale = has(perms, 'sale.create');
  return {
    deposit: live && sale && compareMoney(o.balance, '0') > 0,
    ready: o.status === 'OPEN' && sale,
    collect: live && sale,
    cancel: live && has(perms, 'sale.cancel'),
  };
}

/** A deposit is a positive amount, and not more than what is left. */
export function depositProblem(amount: string, balance: string): string | null {
  const a = amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(a) || compareMoney(a, '0') <= 0) return 'Enter how much was paid.';
  if (compareMoney(a, balance) > 0) return 'That is more than is left to pay.';
  return null;
}
export const depositBody = (amount: string, method: string) => ({ amount: amount.trim(), payment_method: method });

/**
 * Checked live: the deposit call takes a second deposit when it is repeated, even with the same Idempotency-Key. So after a lost
 * connection the order is read again, and the deposit counts as taken when what was paid has gone up by the amount.
 */
export const alreadyDeposited = (paidBefore: string, paidAfter: string, amount: string): boolean => compareMoney(subMoney(paidAfter, paidBefore), amount) >= 0;

/** Handing the order over: the whole balance paid one way. The server refuses anything less (BALANCE_NOT_PAID). */
export const collectBody = (balance: string, method: string) => ({ payments: compareMoney(balance, '0') > 0 ? [{ payment_method: method, amount: parseMoney(balance).toFixed(2) }] : [] });

export type DocLine = { variantId: string; name: string; sku: string; unitShort: string | null; allowDecimal: boolean; quantity: string };
const qtyOk = (q: string, decimal: boolean) => (decimal ? /^\d+(\.\d{1,3})?$/ : /^\d+$/).test(q.trim()) && Number(q) > 0;

/** Adds an item, or one more of it when it is already on the list. */
export function addDocLine(lines: DocLine[], item: Omit<DocLine, 'quantity'>): DocLine[] {
  const at = lines.findIndex((l) => l.variantId === item.variantId);
  if (at < 0) return [...lines, { ...item, quantity: '1' }];
  return lines.map((l, i) => (i === at ? { ...l, quantity: parseMoney(l.quantity).plus(1).toFixed() } : l));
}

export function docProblem(o: { who: boolean; lines: DocLine[] }): string | null {
  if (!o.who) return 'Choose the customer.';
  if (o.lines.length === 0) return 'Add at least one item.';
  if (o.lines.some((l) => !qtyOk(l.quantity, l.allowDecimal))) return 'Every item needs an amount above zero.';
  return null;
}

const lineBody = (l: DocLine) => ({ variant_id: l.variantId, quantity: parseMoney(l.quantity).toFixed(3) });

/** The server prices everything: only what and how many are sent. */
export const orderBody = (o: { customerId: string; dueDate: string; note: string; branchId?: string; lines: DocLine[] }) => ({
  customer_id: o.customerId,
  due_date: o.dueDate,
  ...(o.note.trim() ? { note: o.note.trim() } : {}),
  ...(o.branchId ? { branch_id: o.branchId } : {}),
  items: o.lines.map(lineBody),
});

/** A quotation is for a customer on file, or just a name and number for someone who is not. */
export const quoteBody = (o: { customer: { id: string } | { name: string; phone: string }; validUntil: string; note: string; branchId?: string; lines: DocLine[] }) => ({
  ...('id' in o.customer ? { customer_id: o.customer.id } : { customer_name: o.customer.name.trim(), ...(o.customer.phone.trim() ? { customer_phone: o.customer.phone.trim() } : {}) }),
  valid_until: o.validUntil,
  ...(o.note.trim() ? { note: o.note.trim() } : {}),
  ...(o.branchId ? { branch_id: o.branchId } : {}),
  items: o.lines.map(lineBody),
});

export type DateChoice = 'tomorrow' | 'three' | 'week' | 'fortnight' | 'month';
export const DUE_CHOICES: { id: DateChoice; label: string }[] = [
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'three', label: 'In 3 days' },
  { id: 'week', label: 'In a week' },
  { id: 'fortnight', label: 'In 2 weeks' },
];
export const VALID_CHOICES: { id: DateChoice; label: string }[] = [
  { id: 'week', label: 'A week' },
  { id: 'fortnight', label: '2 weeks' },
  { id: 'month', label: 'A month' },
];
const AHEAD: Record<DateChoice, number> = { tomorrow: 1, three: 3, week: 7, fortnight: 14, month: 30 };
/** A day counted ahead from today, as local yyyy-mm-dd. */
export const dateAhead = (choice: DateChoice, now: Date = new Date()): string => localDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + AHEAD[choice]));

/** A quotation that is open but past its date can no longer be sent or cancelled (the server says so). */
export const quoteSteps = (q: { status: string; expired: boolean }, perms: Perms) => ({ send: q.status === 'OPEN' && !q.expired && has(perms, 'sale.create'), cancel: q.status === 'OPEN' && !q.expired && has(perms, 'sale.create') });

/** Words for the ways an order or quotation can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeOrderError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'EMPTY_CART':
      return 'Add at least one item.';
    case 'CUSTOMER_REQUIRED':
      return 'Choose the customer, or write a name.';
    case 'DUE_DATE_REQUIRED':
      return 'Choose the day it will be collected.';
    case 'INVALID_DUE_DATE':
      return 'That day has already passed.';
    case 'INVALID_VALID_UNTIL':
      return 'Choose a day from today up to a year ahead.';
    case 'INVALID_QUANTITY':
      return 'Every item needs an amount above zero.';
    case 'DEPOSIT_EXCEEDS_TOTAL':
      return 'That is more than is left to pay.';
    case 'BALANCE_NOT_PAID':
      return 'The whole balance must be paid to hand it over.';
    case 'ORDER_NOT_OPEN':
      return 'This order was already handed over or cancelled.';
    case 'NO_OPEN_SHIFT':
      return 'Open your day on the Sell tab first. Handing over an order is a sale.';
    case 'QUOTATION_NOT_OPEN':
      return 'This quotation was already sent to the till or cancelled.';
    case 'QUOTATION_EXPIRED':
      return 'This quotation is past its last day.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It may not have been saved. Check the list before trying again.';
    default:
      return e.message || 'Could not save this.';
  }
}

/** The shop's day for a due date in words: "2 days late", "today", "tomorrow", "in 5 days". */
export const dueWords = (days: number): { key: string; n?: number } => (days < -1 ? { key: '{n} days late', n: -days } : days === -1 ? { key: 'A day late' } : days === 0 ? { key: 'Due today' } : days === 1 ? { key: 'Due tomorrow' } : { key: 'Due in {n} days', n: days });
