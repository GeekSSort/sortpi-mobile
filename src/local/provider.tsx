import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/auth/session-provider';

import { appDb, setCurrentOwner } from './instance';
import { status, wipe } from './store.ts';
import { syncShop, SyncNotAllowed } from './sync';
import { ownerKey, shouldSync } from './sync-core.ts';

/** How old the copy may get before the app quietly downloads the shop again (while it is open and online). */
const MAX_AGE_MS = 10 * 60_000;

type Shop = {
  /** A download is running now. */
  syncing: boolean;
  /** When the copy on this phone was made (ISO), or null when there is none. */
  syncedAt: string | null;
  products: number;
  /** Plain words about the last failed try, or null. */
  error: string | null;
  /** False when the server will not give this person an offline copy; the app then works online only. */
  allowed: boolean;
  syncNow: () => Promise<void>;
};

const Ctx = createContext<Shop | null>(null);
export const useLocalShop = (): Shop => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLocalShop must be used inside <LocalProvider>');
  return v;
};

/**
 * Keeps a copy of the shop on the phone: downloads it after sign-in, again when the app comes back to the front or the copy is 10
 * minutes old, and forgets it on sign-out. A copy for someone else is never read (see `readyDb`). Failing to download changes nothing the
 * person sees: the app carries on asking the server.
 */
export function LocalProvider({ children }: { children: ReactNode }) {
  const { status: session, me, workspaceUrl } = useSession();
  const branchId = me?.active_branch?.id ?? null;
  const owner = session === 'signedIn' && me && workspaceUrl && branchId ? ownerKey(workspaceUrl, me.id, branchId) : null;
  const [info, setInfo] = useState<{ syncedAt: string | null; products: number }>({ syncedAt: null, products: 0 });
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const running = useRef(false);

  useEffect(() => {
    setCurrentOwner(owner);
  }, [owner]);

  useEffect(() => {
    if (session !== 'signedOut') return;
    void (async () => {
      try {
        const db = await appDb();
        await wipe(db);
        setInfo({ syncedAt: null, products: 0 });
      } catch {
        // nothing was stored, or the store could not open: nothing to forget
      }
    })();
  }, [session]);

  const run = useCallback(
    async (force: boolean) => {
      if (!owner || !branchId || running.current) return;
      running.current = true;
      try {
        const db = await appDb();
        const before = await status(db);
        if (!force && !shouldSync(before, owner, Date.now(), MAX_AGE_MS, false)) {
          setInfo({ syncedAt: before.syncedAt, products: before.products });
          return;
        }
        setSyncing(true);
        setError(null);
        await syncShop(db, { owner, branchId });
        const after = await status(db);
        setInfo({ syncedAt: after.syncedAt, products: after.products });
        setAllowed(true);
      } catch (e) {
        if (e instanceof SyncNotAllowed) setAllowed(false);
        else setError('The shop on this phone could not be updated. It will try again.');
      } finally {
        running.current = false;
        setSyncing(false);
      }
    },
    [owner, branchId],
  );

  useEffect(() => {
    if (!owner) return;
    queueMicrotask(() => void run(false)); // started after the effect, so no state is set inside it
    const timer = setInterval(() => void run(false), MAX_AGE_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void run(false);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [owner, run]);

  const value = useMemo<Shop>(() => ({ syncing, syncedAt: info.syncedAt, products: info.products, error, allowed, syncNow: () => run(true) }), [syncing, info, error, allowed, run]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
