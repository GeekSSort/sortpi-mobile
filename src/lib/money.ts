import Big from 'big.js';

/**
 * Money is a string on the wire and a decimal here. Never a JS number.
 * The server rounds amounts to 2dp and costs/rates to 4dp; we show what it sent.
 */
export type Money = string;

Big.DP = 4;
Big.RM = Big.roundHalfUp;

export function parseMoney(value: Money | null | undefined): Big {
  if (value == null || value.trim() === '') return new Big(0);
  return new Big(value);
}

export const addMoney = (a: Money, b: Money): Money => parseMoney(a).plus(parseMoney(b)).toFixed();
export const subMoney = (a: Money, b: Money): Money => parseMoney(a).minus(parseMoney(b)).toFixed();
/** amount x quantity (both strings), for a non-authoritative cart preview. */
export const mulMoney = (amount: Money, quantity: string): Money => parseMoney(amount).times(parseMoney(quantity)).toFixed();
export const isZeroMoney = (a: Money): boolean => parseMoney(a).eq(0);
export const compareMoney = (a: Money, b: Money): number => parseMoney(a).cmp(parseMoney(b));

/** Bangladeshi grouping: last three digits, then pairs (1,84,326). */
export function groupBD(integerDigits: string): string {
  if (integerDigits.length <= 3) return integerDigits;
  const head = integerDigits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${integerDigits.slice(-3)}`;
}

/**
 * `৳1,84,326.50`. Decimal places default to 2 (amounts); pass 4 for unit costs.
 * Rounds half up like the server's quantize_money().
 */
export function formatBDT(value: Money | null | undefined, opts: { dp?: number; symbol?: boolean } = {}): string {
  const { dp = 2, symbol = true } = opts;
  const big = parseMoney(value);
  const negative = big.lt(0);
  const fixed = big.abs().toFixed(dp);
  const [int, frac] = fixed.split('.');
  const body = frac ? `${groupBD(int)}.${frac}` : groupBD(int);
  return `${negative ? '-' : ''}${symbol ? '৳' : ''}${body}`;
}
