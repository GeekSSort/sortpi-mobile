import { useQueries } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/api/session';
import { useSession } from '@/auth/session-provider';

import { buildChecklist, countsToFetch, type Counts, type StepId } from './steps';

const PATH: Record<StepId, string> = { product: '/products/', sale: '/sales/', staff: '/users/' };
const hiddenKey = (userId: string) => `sortpi.setup.hidden.${userId}`;

/** How many rows the server holds for a list, from the paginated envelope's `meta.total`. */
async function countOf(path: string): Promise<number> {
  const res = await api.envelope<unknown[]>('GET', path, { query: { limit: 1 } });
  return res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0);
}

/** Checklist state for the signed-in person: what is done on the server, and whether they hid the card. */
export function useSetupChecklist() {
  const { me } = useSession();
  const permissions = me?.permissions ?? [];
  const userId = me?.id ?? '';
  const [hidden, setHidden] = useState<boolean | null>(null); // null = still reading storage

  useEffect(() => {
    if (!userId) return;
    SecureStore.getItemAsync(hiddenKey(userId)).then((v) => setHidden(v === '1'), () => setHidden(false));
  }, [userId]);

  const ids = countsToFetch(permissions);
  const results = useQueries({ queries: ids.map((id) => ({ queryKey: ['setup-count', userId, id], queryFn: () => countOf(PATH[id]) })) });

  const counts: Counts = {};
  ids.forEach((id, i) => {
    const data = results[i]?.data;
    if (typeof data === 'number') counts[id] = data;
  });
  const loading = hidden === null || results.some((r) => r.isPending);
  const checklist = buildChecklist(permissions, counts);

  const hide = useCallback(async () => {
    setHidden(true);
    if (userId) await SecureStore.setItemAsync(hiddenKey(userId), '1').catch(() => undefined);
  }, [userId]);

  return { checklist, loading, hidden: hidden === true, hide };
}
