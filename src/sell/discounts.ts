import { ApiError } from '../api/client.ts';
import { parseMoney, type Money } from '../lib/money.ts';
import type { Resolved } from '../settings/logic.ts';

/**
 * What a coupon, customer points and "round to a whole taka" do to the total, in the order the server applies them
 * (`apps/sales/services.py`): coupon off the bill, then points off what is left, then the rounding, last.
 * The phone only works this out to show the figure before paying. The server prices the sale again and refuses a payment
 * above its own total, naming it, so a difference is shown as a message and never as a wrong sale.
 */
const q2 = (v: ReturnType<typeof parseMoney>): Money => v.round(2).toFixed(2);
const atLeastZero = (v: ReturnType<typeof parseMoney>) => (v.lt(0) ? parseMoney('0') : v);

/** `pos.round_to_whole`: .40 and above rounds up, under .40 rounds down (not half-up). Zero is left alone. */
export function roundWhole(amount: Money): Money {
  const a = parseMoney(q2(parseMoney(amount)));
  if (a.lte(0)) return a.toFixed(2);
  const whole = a.round(0, 0); // round down
  return (a.minus(whole).gte('0.4') ? whole.plus(1) : whole).toFixed(2);
}

export type Totals = { afterCoupon: Money; afterPoints: Money; final: Money; rounding: Money };

export function finalTotal(o: { total: Money; coupon?: Money; points?: Money; rounds: boolean }): Totals {
  const afterCoupon = q2(atLeastZero(parseMoney(o.total).minus(o.coupon ?? '0')));
  const afterPoints = q2(atLeastZero(parseMoney(afterCoupon).minus(o.points ?? '0')));
  const final = o.rounds ? roundWhole(afterPoints) : afterPoints;
  return { afterCoupon, afterPoints, final, rounding: q2(parseMoney(final).minus(afterPoints)) };
}

// ---- customer points ----------------------------------------------------------------------------------------------------------

export type Loyalty = {
  enabled: boolean;
  redeemMode: 'FLAT' | 'PERCENT';
  redeemPoints: number;
  redeemValue: number;
  redeemPercent: number;
  minRedeemPoints: number;
  allowPartialRedeem: boolean;
  /** 0 means no ceiling. */
  maxRedeemPerSale: number;
};

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const yes = (v: unknown) => v === true || v === 'true';

/** The shop's points scheme from its resolved settings. Null when the settings could not be read (a role without `settings.view`). */
export function readLoyalty(rows: Resolved[] | undefined): Loyalty | null {
  if (!rows) return null;
  const at = (k: string) => rows.find((r) => r.key === k)?.value;
  return {
    enabled: yes(at('loyalty.enabled')),
    redeemMode: at('loyalty.redeem_mode') === 'PERCENT' ? 'PERCENT' : 'FLAT',
    redeemPoints: num(at('loyalty.redeem_points'), 100),
    redeemValue: num(at('loyalty.redeem_value'), 50),
    redeemPercent: num(at('loyalty.redeem_percent'), 1),
    minRedeemPoints: num(at('loyalty.min_redeem_points'), 100),
    allowPartialRedeem: yes(at('loyalty.allow_partial_redeem')),
    maxRedeemPerSale: num(at('loyalty.max_redeem_per_sale'), 0),
  };
}

const paysOut = (r: Loyalty) => r.redeemPoints > 0 && (r.redeemMode === 'PERCENT' ? r.redeemPercent > 0 : r.redeemValue > 0);
const blocksIn = (r: Loyalty, points: number) => (!paysOut(r) || points <= 0 ? 0 : Math.floor(points / r.redeemPoints));

/** What spending `points` takes off a bill of `payable` (to the paisa, half up, as the server does). */
export function pointsDiscount(r: Loyalty, points: number, payable: Money): Money {
  if (!r.enabled || points <= 0 || !paysOut(r)) return '0.00';
  const bill = atLeastZero(parseMoney(payable));
  if (r.redeemMode === 'PERCENT') return q2(bill.times(Math.min(100, blocksIn(r, points) * r.redeemPercent)).div(100));
  if (r.allowPartialRedeem) return q2(parseMoney(String(points)).times(r.redeemValue).div(r.redeemPoints));
  return q2(parseMoney(String(blocksIn(r, points))).times(r.redeemValue));
}

/** The most of a balance this bill can take: under the shop's per-sale cap, the bill itself, and the minimum below which none can be spent. */
export function redeemablePoints(r: Loyalty, balance: number, payable: Money): number {
  const bill = parseMoney(payable);
  if (!r.enabled || balance <= 0 || bill.lte(0) || !paysOut(r) || balance < r.minRedeemPoints) return 0;
  let allowed = balance;
  if (r.maxRedeemPerSale > 0) allowed = Math.min(allowed, r.maxRedeemPerSale);
  if (r.redeemMode === 'PERCENT') {
    allowed = Math.min(Math.floor(allowed / r.redeemPoints), Math.floor(100 / r.redeemPercent)) * r.redeemPoints;
  } else {
    const perPoint = r.redeemValue / r.redeemPoints;
    if (perPoint <= 0) return 0;
    allowed = Math.min(allowed, Math.floor(bill.div(perPoint).toNumber()));
    if (!r.allowPartialRedeem) allowed = Math.floor(allowed / r.redeemPoints) * r.redeemPoints;
  }
  return allowed >= r.minRedeemPoints ? allowed : 0;
}

// ---- refusals -----------------------------------------------------------------------------------------------------------------

/** Words for the ways a coupon or points can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeDiscountError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'UNKNOWN_COUPON':
      return 'There is no coupon with that code.';
    case 'COUPON_INACTIVE':
      return 'That coupon is switched off at the moment.';
    case 'COUPON_CODE_REQUIRED':
      return 'Type the coupon code.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Could not check the coupon.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    default:
      return e.message || 'Could not check the coupon.';
  }
}

/**
 * When the server refuses a payment because the total is not what the phone worked out, it names the difference: "paid more than the
 * total" names the total, and a walk-in who is left owing names the amount left. Both give the total the phone could not see
 * (rounding, or a rule it may not read). `paid` is what the phone sent.
 */
export function totalFromRefusal(e: unknown, paid: Money = '0'): Money | null {
  if (!(e instanceof ApiError)) return null;
  const num = (v: unknown) => (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? v : null);
  if (e.code === 'PAYMENT_EXCEEDS_TOTAL') {
    const t = num(e.errors?.grand_total);
    return t ? q2(parseMoney(t)) : null;
  }
  if (e.code === 'WALK_IN_MUST_PAY_IN_FULL') {
    const due = num(e.errors?.due);
    return due && parseMoney(due).gt(0) ? q2(parseMoney(paid).plus(due)) : null;
  }
  return null;
}

/** A code as the till types it: trimmed and upper case, which is how the server stores and finds it. */
export const couponText = (s: string) => s.trim().toUpperCase();
