import { localDateISO } from '../lib/dates.ts';

export const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'],
} as const;

/** The last 7 calendar days ending today, oldest first, each as a local yyyy-mm-dd with its weekday number (0 = Sunday). */
export function lastSevenDays(today: Date = new Date()): { date: string; weekday: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
    return { date: localDateISO(d), weekday: d.getDay() };
  });
}

/** Bar heights as 0..1 of the biggest day. All zero stays flat, so an empty week shows no bars instead of dividing by zero. */
export function barFractions(values: number[]): number[] {
  const max = Math.max(...values, 0);
  return values.map((v) => (max > 0 ? v / max : 0));
}

export const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
} as const;

/** When a sale happened, as people say it: today / yesterday / "3 Nov", plus the clock time like "5:04 pm". */
export function saleWhen(iso: string, now: Date = new Date()): { day: 'today' | 'yesterday' | { date: number; month: number }; time: string } {
  const d = new Date(iso);
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const gap = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const h = d.getHours();
  const time = `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  return { day: gap === 0 ? 'today' : gap === 1 ? 'yesterday' : { date: d.getDate(), month: d.getMonth() }, time };
}
