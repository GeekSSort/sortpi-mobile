import { ApiError } from '../api/client.ts';
import { formatBDT } from '../lib/money.ts';
import { describeSettingsError, tidyName } from './logic.ts';

// ---- Shop details (the company profile) -----------------------------------------------------------------------------------

export type Company = {
  id: string;
  name: string;
  legal_name: string;
  tax_number: string;
  phone: string;
  email: string;
  address: string;
  /** A web address the picture can be loaded from, or empty when there is no logo. */
  logo_url: string;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
};
export type CompanyForm = { name: string; legal: string; tax: string; phone: string; address: string };
export type CompanyField = keyof CompanyForm;

const LIMITS: Record<CompanyField, number> = { name: 200, legal: 200, tax: 50, phone: 50, address: 1000 };

export const formOf = (c: Company): CompanyForm => ({ name: c.name, legal: c.legal_name, tax: c.tax_number, phone: c.phone, address: c.address });

/** What the person typed, tidied: spaces around and doubled spaces inside are dropped. The address keeps its line breaks. */
const tidy = (f: CompanyForm): CompanyForm => ({ name: tidyName(f.name), legal: tidyName(f.legal), tax: tidyName(f.tax), phone: tidyName(f.phone), address: f.address.trim().replace(/[ \t]+/g, ' ') });

/** Why a field cannot be saved, as an English key per field. The shop must have a name; the rest may stay empty. */
export function companyProblems(form: CompanyForm): Partial<Record<CompanyField, string>> {
  const f = tidy(form);
  const out: Partial<Record<CompanyField, string>> = {};
  if (!f.name) out.name = "Type your shop's name.";
  for (const k of Object.keys(LIMITS) as CompanyField[]) if (f[k].length > LIMITS[k]) out[k] = k === 'tax' || k === 'phone' ? 'Keep this to 50 letters.' : k === 'address' ? 'Keep the address shorter.' : 'Keep this to 200 letters.';
  return out;
}

/** Only the fields that changed, named as the server names them. Empty when nothing changed. */
export function companyPatch(c: Company, form: CompanyForm): Record<string, string> {
  const f = tidy(form);
  const was = formOf(c);
  const names: Record<CompanyField, string> = { name: 'name', legal: 'legal_name', tax: 'tax_number', phone: 'phone', address: 'address' };
  const patch: Record<string, string> = {};
  for (const k of Object.keys(names) as CompanyField[]) if (f[k] !== was[k]) patch[names[k]] = f[k];
  return patch;
}

// ---- Coupons ----------------------------------------------------------------------------------------------------------------

export type CouponMode = 'PERCENT' | 'FLAT';
export type Coupon = { id: string; code: string; mode: CouponMode; value: string; is_active: boolean; description: string };

/** The code as the server keeps it: one case, no spaces round it. */
export const tidyCode = (s: string) => s.trim().toUpperCase();

/** "10.0000" reads as 10, "7.5000" as 7.5. */
export const plainValue = (v: string) => (/^\d+(\.\d+)?$/.test(v) ? v.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : v);

export type CouponProblem = { field: 'code' | 'value'; text: string };

/** Why a coupon cannot be saved, as an English key, or null when it can. `except` is the coupon being changed. The server lets 150% through, so the phone does not. */
export function couponProblem(code: string, mode: CouponMode, value: string, list: Coupon[], except?: string): CouponProblem | null {
  const c = tidyCode(code);
  if (!c) return { field: 'code', text: 'Type the code customers will say.' };
  if (c.length > 40) return { field: 'code', text: 'Keep the code to 40 letters.' };
  if (/\s/.test(c)) return { field: 'code', text: 'A code cannot have a space in it.' };
  if (list.some((x) => x.id !== except && x.code.toUpperCase() === c)) return { field: 'code', text: 'You already have a coupon with this code.' };
  const v = value.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v) || !(Number(v) > 0)) return { field: 'value', text: mode === 'PERCENT' ? 'Type how many percent to take off.' : 'Type how many taka to take off.' };
  if (mode === 'PERCENT' && Number(v) > 100) return { field: 'value', text: 'A coupon cannot take off more than 100%.' };
  return null;
}

export const couponBody = (code: string, mode: CouponMode, value: string) => ({ code: tidyCode(code), mode, value: value.trim() });

/** What a coupon is worth, as an English key and its numbers. */
export function worthOf(c: Pick<Coupon, 'mode' | 'value'>): { text: string; vars: Record<string, string> } {
  return c.mode === 'PERCENT' ? { text: '{n}% off', vars: { n: plainValue(c.value) } } : { text: '{amount} off', vars: { amount: formatBDT(c.value, { dp: 0 }) } };
}

/** Ones that are on first, then by code. */
export const sortCoupons = (list: Coupon[]) => list.slice().sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.code.localeCompare(b.code));

export function describeCouponError(e: unknown): string {
  if (e instanceof ApiError && e.code === 'DUPLICATE_CODE') return 'You already have a coupon with this code.';
  return describeSettingsError(e);
}
