import type { ScannedItem } from './cart.ts';

/**
 * A product just created from the Sell screen's "Add this product", waiting for Sell to put it in the cart.
 * Set only when the form was opened from Sell, and taken once, so a product added elsewhere (Stock) never
 * appears in a later cart.
 */
let pending: ScannedItem | null = null;
export const setPendingItem = (item: ScannedItem | null) => void (pending = item);
export function takePendingItem(): ScannedItem | null {
  const item = pending;
  pending = null;
  return item;
}
