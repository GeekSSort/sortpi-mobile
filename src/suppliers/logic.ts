import { ApiError } from '../api/client.ts';
import { compareMoney, parseMoney } from '../lib/money.ts';

/** What the shop owes a supplier: a positive balance is money owed TO the supplier. Never below nothing here (an advance is not a debt). */
export const weOwe = (balance: string): string => (compareMoney(balance, '0') > 0 ? parseMoney(balance).toFixed(2) : '0.00');

/** Money as typed: digits with up to two decimals. */
export const isAmountText = (v: string): boolean => /^\d{1,12}(\.\d{1,2})?$/.test(v.trim());

/** The web lets a payment go up to what is owed and no more; zero is refused by the server. Returns plain words, or null when fine. */
export function payProblem(amount: string, owed: string): string | null {
  if (!isAmountText(amount) || compareMoney(amount, '0') <= 0) return 'Enter the amount you paid.';
  if (compareMoney(amount, owed) > 0) return 'The amount is more than you owe this supplier.';
  return null;
}

/** The next free code like SUP-021, counted from the codes already used (the server refuses a duplicate). */
export function nextSupplierCode(codes: string[]): string {
  let highest = 0;
  for (const c of codes) {
    const m = /(\d+)\s*$/.exec(c);
    if (m) highest = Math.max(highest, Number(m[1]));
  }
  return `SUP-${String(highest + 1).padStart(3, '0')}`;
}

export type NewSupplierForm = { name: string; phone: string; contact: string };
export type SupplierErrors = Partial<Record<keyof NewSupplierForm, string>>;

/** The web needs a name and a phone number. */
export function validateNewSupplier(f: NewSupplierForm): SupplierErrors {
  const e: SupplierErrors = {};
  if (!f.name.trim()) e.name = 'Enter the supplier name.';
  if (!f.phone.trim()) e.phone = 'Enter a phone number.';
  return e;
}

export function supplierBody(f: NewSupplierForm, code: string) {
  return { code, name: f.name.trim(), phone: f.phone.trim(), email: '', ...(f.contact.trim() ? { contact_person: f.contact.trim() } : {}), is_active: true };
}

/** One line of the account, in everyday words. Rows with a positive amount make the shop owe more; a payment or goods sent back is negative. */
export function ledgerWords(type: string): string {
  switch (type) {
    case 'OPENING':
      return 'Owed from before';
    case 'PURCHASE':
      return 'Bought on credit';
    case 'PAYMENT':
      return 'You paid';
    case 'PURCHASE_RETURN':
      return 'Goods sent back';
    case 'ADJUSTMENT':
      return 'Adjustment';
    default:
      return type;
  }
}

/** Whether a ledger amount makes the shop owe more (true) or less (false). */
export const owesMore = (amount: string): boolean => compareMoney(amount, '0') > 0;

export function describeSupplierError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'ZERO_LEDGER_AMOUNT':
      return 'The amount must be more than zero.';
    case 'DUPLICATE_CODE':
      return 'Another supplier was just added with the same code. Tap Save again.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'IDEMPOTENCY_KEY_REUSED':
    case 'REQUEST_IN_PROGRESS':
      return 'This is still being saved. Wait a moment and check before trying again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. It may not have been saved. Tap Save again: it will not be written twice.';
    default:
      return e.message || 'Could not save this.';
  }
}
