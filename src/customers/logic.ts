import { compareMoney, parseMoney } from '../lib/money.ts';

/** Money as typed: digits with up to 2 decimals, as the web's amount boxes allow. */
export const isAmountText = (v: string) => /^\d{1,12}(\.\d{1,2})?$/.test(v.trim());

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK' | 'MOBILE' | 'OTHER';
export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'MOBILE', label: 'Mobile banking' },
  { key: 'CARD', label: 'Card' },
  { key: 'BANK', label: 'Bank' },
  { key: 'OTHER', label: 'Other' },
];

/** What the customer owes now: the ledger balance when positive, else nothing (advances are not "due"). */
export const amountDue = (balance: string): string => (compareMoney(balance, '0') > 0 ? parseMoney(balance).toFixed(2) : '0.00');

/** The web refuses a payment above what is owed and one of zero. Returns a plain message, or null when fine. */
export function paymentProblem(amount: string, due: string): string | null {
  if (!isAmountText(amount) || compareMoney(amount, '0') <= 0) return 'Enter the amount received.';
  if (compareMoney(amount, due) > 0) return `The amount cannot be more than what is owed (${due}).`;
  return null;
}

/** Credit left under the limit; a limit of 0 means none was set. */
export function creditLeft(limit: string, balance: string): string | null {
  if (compareMoney(limit, '0') <= 0) return null;
  const left = parseMoney(limit).minus(parseMoney(balance));
  return (left.lt(0) ? parseMoney('0') : left).toFixed(2);
}

export type NewCustomerForm = { name: string; phone: string; wholesale: boolean; creditLimit: string };
export type CustomerErrors = Partial<Record<keyof NewCustomerForm, string>>;

export function validateNewCustomer(f: NewCustomerForm): CustomerErrors {
  const e: CustomerErrors = {};
  if (!f.name.trim()) e.name = 'Enter the customer name.';
  if (!f.phone.trim()) e.phone = 'Enter a phone number.';
  if (f.creditLimit.trim() && !isAmountText(f.creditLimit)) e.creditLimit = 'Enter an amount like 5000.';
  return e;
}

/** Body for POST /customers/. An empty credit limit is left out so the shop's default applies. */
export function buildCustomerRequest(f: NewCustomerForm) {
  return {
    name: f.name.trim(),
    phone: f.phone.trim(),
    email: '',
    customer_type: f.wholesale ? 'WHOLESALE' : 'RETAIL',
    is_active: true,
    ...(f.creditLimit.trim() ? { credit_limit: f.creditLimit.trim() } : {}),
  };
}
