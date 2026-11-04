import { ApiError } from '../api/client.ts';
import { MONTHS } from '../home/week.ts';
import { formatBDT, groupBD } from '../lib/money.ts';
import { describeSettingsError } from '../settings/logic.ts';
import type { IconName } from '../components/icons/icon.tsx';

export type Status = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type Interval = 'MONTHLY' | 'YEARLY';
export type Limits = { max_branches: number | null; max_users: number | null; max_products: number | null };
export type LimitKey = keyof Limits;

export type Plan = { id: string; code: string; name: string; description: string; price: string; interval: Interval; trial_days: number } & Limits;
export type Subscription = {
  plan: Plan;
  status: Status;
  current_period_end: string;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  limits: Partial<Limits>;
  usage: Partial<Record<LimitKey, number>>;
};
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type UpgradeRequest = { id: string; status: RequestStatus; plan: { code: string; name: string; price: string; interval: Interval }; transaction_id: string; decision_note: string; created_at: string };

export type Tone = 'good' | 'info' | 'warn' | 'bad' | 'quiet';
export const LIMIT_KEYS: LimitKey[] = ['max_branches', 'max_users', 'max_products'];
export const LIMIT_WORD: Record<LimitKey, { one: string; many: string }> = {
  max_branches: { one: 'branch', many: 'branches' },
  max_users: { one: 'person', many: 'people' },
  max_products: { one: 'item', many: 'items' },
};

/** How a plan status reads to a shopkeeper: words, a colour and an icon (never colour alone). */
export function statusLook(s: Status): { text: string; tone: Tone; icon: IconName } {
  switch (s) {
    case 'TRIALING':
      return { text: 'Free trial', tone: 'info', icon: 'Gift' };
    case 'ACTIVE':
      return { text: 'Active', tone: 'good', icon: 'CheckCircle' };
    case 'PAST_DUE':
      return { text: 'Payment is late', tone: 'warn', icon: 'TriangleAlert' };
    case 'SUSPENDED':
      return { text: 'Stopped', tone: 'bad', icon: 'Lock' };
    default:
      return { text: 'Cancelled', tone: 'bad', icon: 'Cancel' };
  }
}

/** "5 Nov 2026" / "৫ নভেম্বর 2026": the day on the phone's own clock. Blank when the date cannot be read. */
export function dayText(iso: string | null | undefined, lang: 'en' | 'bn'): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}

/** Whole days from `now` to `iso`, never below 0. Null when the date cannot be read. */
export function daysLeft(iso: string | null | undefined, now: Date): number | null {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86_400_000));
}

/** The one sentence about time: when the trial ends, when it renews, when it stops. English key plus its numbers. */
export function periodLine(s: Subscription, now: Date, lang: 'en' | 'bn'): { text: string; vars: Record<string, string | number> } | null {
  const end = dayText(s.current_period_end, lang);
  if (s.status === 'TRIALING') {
    const trial = s.trial_ends_at ?? s.current_period_end;
    const n = daysLeft(trial, now);
    if (n === null) return null;
    return { text: n === 1 ? 'Free trial ends on {date}. 1 day left.' : 'Free trial ends on {date}. {n} days left.', vars: { date: dayText(trial, lang), n } };
  }
  if (s.status === 'ACTIVE') return end ? { text: s.cancel_at_period_end ? 'Ends on {date}. It will not renew.' : 'Renews on {date}.', vars: { date: end } } : null;
  if (s.status === 'PAST_DUE') return end ? { text: 'The period ended on {date}. Send your payment below.', vars: { date: end } } : null;
  return null;
}

export type Meter = { used: number; limit: number | null; pct: number; tone: Tone; full: boolean };

/** One bar: green while there is room, orange from 80%, red at the limit. No limit means no bar. */
export function meter(used: number | undefined, limit: number | null | undefined): Meter {
  const u = Math.max(0, used ?? 0);
  if (limit === null || limit === undefined) return { used: u, limit: null, pct: 0, tone: 'good', full: false };
  if (limit <= 0) return { used: u, limit, pct: 100, tone: 'bad', full: true };
  const pct = Math.min(100, Math.round((u / limit) * 100));
  return { used: u, limit, pct, tone: u >= limit ? 'bad' : pct >= 80 ? 'warn' : 'good', full: u >= limit };
}

/** What a plan costs, in a few words. Free is free. */
export function priceLine(p: Pick<Plan, 'price' | 'interval'>): { text: string; vars: Record<string, string> } {
  const free = Number(p.price) <= 0;
  if (free) return { text: 'Free', vars: {} };
  return { text: p.interval === 'YEARLY' ? '{amount} a year' : '{amount} a month', vars: { amount: formatBDT(p.price, { dp: 0 }) } };
}

export type Choice = { kind: 'current' } | { kind: 'ok' } | { kind: 'smaller'; what: LimitKey[] };

/** Can the shop move to this plan? The server refuses a plan with a lower ceiling than the current one; say which, before the shop pays. */
export function choiceFor(sub: Pick<Subscription, 'plan' | 'limits'>, plan: Plan): Choice {
  if (plan.code === sub.plan.code) return { kind: 'current' };
  const lower = LIMIT_KEYS.filter((k) => {
    const have = sub.limits[k] === undefined ? sub.plan[k] : sub.limits[k];
    const next = plan[k];
    return next !== null && (have === null || have === undefined || next < have);
  });
  return lower.length ? { kind: 'smaller', what: lower } : { kind: 'ok' };
}

export type RequestForm = { method: 'MOBILE_BANKING' | 'BANK_TRANSFER' | 'CARD'; transactionId: string; amount: string; note: string };
export const METHODS: { code: RequestForm['method']; title: string }[] = [
  { code: 'MOBILE_BANKING', title: 'bKash, Nagad or Rocket' },
  { code: 'BANK_TRANSFER', title: 'Bank transfer' },
  { code: 'CARD', title: 'Card' },
];

export type RequestProblem = { field: 'transactionId' | 'amount' | 'note'; text: string };

/** Why the request cannot be sent yet, as an English key, or null when it can. */
export function requestProblem(f: RequestForm): RequestProblem | null {
  const t = f.transactionId.trim();
  if (!t) return { field: 'transactionId', text: 'Type the transaction number of your payment.' };
  if (t.length > 120) return { field: 'transactionId', text: 'That is too long. Keep it to 120 letters.' };
  if (f.amount.trim() && !/^\d{1,9}(\.\d{1,2})?$/.test(f.amount.trim())) return { field: 'amount', text: 'Type the amount in digits, like 1500.' };
  if (f.note.length > 2000) return { field: 'note', text: 'That is too long. Keep it shorter.' };
  return null;
}

export function requestBody(planCode: string, f: RequestForm) {
  const amount = f.amount.trim();
  const note = f.note.trim();
  return { plan_code: planCode, payment_method: f.method, transaction_id: f.transactionId.trim(), ...(amount ? { amount } : {}), ...(note ? { note } : {}) };
}

export function requestLook(s: RequestStatus): { text: string; tone: Tone; icon: IconName } {
  switch (s) {
    case 'PENDING':
      return { text: 'Waiting for SortPi', tone: 'info', icon: 'Pause' };
    case 'APPROVED':
      return { text: 'Approved', tone: 'good', icon: 'CheckCircle' };
    case 'REJECTED':
      return { text: 'Not accepted', tone: 'bad', icon: 'Cancel' };
    default:
      return { text: 'Cancelled', tone: 'quiet', icon: 'Circle' };
  }
}

export function describeBillingError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'UPGRADE_REQUEST_PENDING':
        return 'A request is already waiting. Cancel it first, or wait for SortPi to check it.';
      case 'PLAN_UNCHANGED':
        return 'You are already on this plan.';
      case 'PLAN_DOWNGRADE_NOT_ALLOWED':
        return 'That plan is smaller than what you have now. Pick a bigger one.';
      case 'NOT_FOUND':
        return 'Your shop has no plan on record.';
    }
  }
  return describeSettingsError(e);
}

/** What a plan allows, in one line: "1 branch · 5 people · 2,000 items". `t` translates; no limit reads as "any number of". */
export function limitsLine(p: Plan, t: (k: string, v?: Record<string, string | number>) => string): string {
  return LIMIT_KEYS.map((k) => {
    const n = p[k];
    const word = t(n === 1 ? LIMIT_WORD[k].one : LIMIT_WORD[k].many);
    return n === null ? t('Any number of {what}', { what: word }) : t('{n} {what}', { n: groupBD(String(n)), what: word });
  }).join(' · ');
}
