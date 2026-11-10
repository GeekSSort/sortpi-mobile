import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/auth/session-provider';
import { readyDb } from '@/local/instance';
import { settingValue } from '@/local/store';
import { KEYS } from '@/settings/logic';

import { giftCardOffered } from './gift-offer';

/** Whether this till shows "Pay with a gift card": the shop's trade has gift cards, or the owner put a gift-card method on the payment list. */
export function useGiftCardOffered(): boolean {
  const { me } = useSession();
  const features = (me?.organization as { category?: { features?: string[] } } | undefined)?.category?.features;
  // Read from the phone's own copy of the settings: any role may, and the till must not wait for the network.
  const methods = useQuery({ queryKey: ['local', 'payment-methods'], queryFn: async () => ((await readyDb().then((db) => (db ? settingValue(db, KEYS.methods) : undefined))) ?? null), staleTime: 5 * 60_000 });
  return giftCardOffered(features, methods.data);
}
