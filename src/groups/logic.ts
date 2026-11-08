import type { Refill } from './api.ts';

/** A wa.me link with the reminder typed in. Bangladeshi numbers are written 01XXXXXXXXX; WhatsApp wants 880 and no leading zero. Null when there is no usable number. */
export function whatsappLink(number: string, text: string): string | null {
  let digits = number.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `88${digits}`;
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type RefillLook = 'late' | 'today' | 'soon' | 'told';
/** Where a refill stands: already told, late, due today, or coming up. */
export const refillLook = (r: Pick<Refill, 'days_left' | 'contacted_at'>): RefillLook => (r.contacted_at ? 'told' : r.days_left < 0 ? 'late' : r.days_left === 0 ? 'today' : 'soon');

export const percentWord = (p: string): string => `${Number(p)}%`;
export function validateGroup(f: { name: string; percent: string }): { name?: string; percent?: string } {
  const e: { name?: string; percent?: string } = {};
  if (!f.name.trim()) e.name = 'Enter the group name.';
  const n = Number(f.percent);
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(f.percent.trim()) || n <= 0 || n > 100) e.percent = 'Enter a percentage from 1 to 100.';
  return e;
}
