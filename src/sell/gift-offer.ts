import { parseMethods, tenderOf } from '../settings/logic.ts';

/**
 * Does this shop take gift cards at the till? The web offers a "Gift card" method when the owner added it to the payment methods
 * (Settings > Payment methods), and shops of the gift trade have the feature on. `methods` is the stored list, as the server keeps it.
 */
export function giftCardOffered(features: readonly string[] | undefined, methods: unknown): boolean {
  if (features?.includes('gift')) return true;
  return typeof methods === 'string' && parseMethods(methods).some((m) => tenderOf(m) === 'GIFT_CARD');
}
