import { ApiError } from '../api/client.ts';
import { compareMoney, parseMoney } from '../lib/money.ts';

export type OfferMode = 'PERCENT' | 'FLAT';
export type Offer = { id: string; variant: string; branch: string | null; mode: OfferMode; value: string; ends_on: string | null };

const amount = /^\d+(\.\d{1,4})?$/;

/** A selling price: a positive amount with up to four places. The server checks it again. */
export const priceProblem = (text: string): string | null => (amount.test(text.trim()) && compareMoney(text.trim(), '0') > 0 ? null : 'Enter the selling price.');

/** The body for `PUT /products/{id}/price/`: only the price and which kind. Wholesale and lowest price are left as they are (omitted means keep). */
export const priceBody = (price: string, variant: string) => ({ price: price.trim(), variant });

/** A percentage is above 0 and at most 100; an amount off is above 0 and less than the price. */
export function offerProblem(mode: OfferMode, value: string, price: string): string | null {
  const v = value.trim();
  if (!amount.test(v) || compareMoney(v, '0') <= 0) return 'Enter how much comes off.';
  if (mode === 'PERCENT' && compareMoney(v, '100') > 0) return 'A percentage cannot be more than 100.';
  if (mode === 'FLAT' && compareMoney(v, price) >= 0) return 'The amount off must be less than the price.';
  return null;
}

export type EndChoice = 'none' | 'week' | 'month';
/** The last day of the offer (inclusive), from a simple choice, as local YYYY-MM-DD. */
export function endsOn(choice: EndChoice, today: string): string | null {
  if (choice === 'none') return null;
  const [y, m, d] = today.split('-').map(Number);
  const when = new Date(y, m - 1, d + (choice === 'week' ? 7 : 30));
  return `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
}

export const offerBody = (o: { mode: OfferMode; value: string; variant: string; endChoice: EndChoice; today: string }) => {
  const ends = endsOn(o.endChoice, o.today);
  return { mode: o.mode, value: o.value.trim(), variant: o.variant, ...(ends ? { ends_on: ends } : {}) };
};

/** What one unit costs the customer with the offer on, for showing next to the old price. The server decides what is really charged. */
export function priceAfterOffer(price: string, offer: Pick<Offer, 'mode' | 'value'> | undefined): string {
  if (!offer) return price;
  const off = offer.mode === 'PERCENT' ? parseMoney(price).times(parseMoney(offer.value)).div(100) : parseMoney(offer.value);
  const after = parseMoney(price).minus(off);
  return (after.lt(0) ? parseMoney('0') : after).round(2).toFixed(2);
}

/** The shop-wide offer for a variant (a branch's own offer is a different scope and is not shown here). */
export const shopOfferFor = (offers: Offer[], variant: string): Offer | undefined => offers.find((o) => o.variant === variant && !o.branch);

export const nameProblem = (name: string): string | null => (name.trim() ? null : 'Give the item a name.');

export type Details = { name: string; category: string; brand: string; reorder: string };
/** `PATCH /products/{id}/` with only what changed, so nothing else on the product is touched. */
export function detailsBody(before: Details, after: Details) {
  const body: Record<string, string> = {};
  if (after.name.trim() !== before.name) body.name = after.name.trim();
  if (after.category !== before.category) body.category = after.category;
  if (after.brand !== before.brand) body.brand = after.brand;
  if (after.reorder.trim() !== before.reorder) body.reorder_level = after.reorder.trim();
  return body;
}
export const reorderProblem = (text: string): string | null => (text.trim() === '' || /^\d+(\.\d{1,3})?$/.test(text.trim()) ? null : 'Enter a number, or leave it empty.');

/** Words for the ways a change can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeProductError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'INVALID_PRICE_FLOOR':
      return 'The lowest price is above this price.';
    case 'INVALID_DISCOUNT_VALUE':
      return 'The offer must be more than zero, and a percentage cannot be more than 100.';
    case 'INVALID_DISCOUNT_MODE':
      return 'Choose percent or an amount.';
    case 'INVALID_DISCOUNT_END':
      return 'The end day has already passed.';
    case 'DUPLICATE_SKU':
      return 'Another item already uses this code.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NOT_FOUND':
      return 'This item was not found. It may have been archived.';
    case 'VALIDATION_ERROR': {
      const first = Object.values(e.errors ?? {})[0];
      return Array.isArray(first) && first[0] ? String(first[0]) : 'Check the details and try again.';
    }
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Check it and try again.';
    default:
      return e.message || 'Could not save this.';
  }
}

type WithStock = { stock_on_hand: string; variants: { id: string; stock_on_hand: string }[] };
/**
 * Checked live: `GET /products/{id}/` answers 0 stock for the product and every kind (even for items that have stock), while the list
 * answers the real figures. So the stock on an item page is taken from the list's copy of the same item.
 */
export function withListedStock<T extends WithStock>(one: T, listed: WithStock | undefined): T {
  if (!listed) return one;
  const byVariant = new Map(listed.variants.map((v) => [v.id, v.stock_on_hand]));
  return { ...one, stock_on_hand: listed.stock_on_hand, variants: one.variants.map((v) => ({ ...v, stock_on_hand: byVariant.get(v.id) ?? v.stock_on_hand })) };
}
