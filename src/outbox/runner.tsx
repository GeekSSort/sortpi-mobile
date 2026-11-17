import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { postOpeningStock, uploadProductImage, type CreatedProduct } from '@/catalog/api';
import { describeProductError } from '@/catalog/new-product';
import { useT } from '@/i18n/prefs';
import { appDb } from '@/local/instance';
import { findWarehouseId } from '@/sell/api';
import { showToast } from '@/ui/toast';

import { due, enqueue, isPermanent, list, nextDue, openOutbox, recordFailure, remove, retryNow, saveProgress, senderAccount, type OutboxRow } from './outbox';
import { sendProduct, type MadeProduct, type Photo, type ProductJob, type SendDeps } from './send';

/** After this many tries that got an answer but not a good one (not "no signal"), the item waits for the person instead of trying for ever. */
const MAX_BAD_TRIES = 8;

// What the screens show: the person's items still waiting. Kept here so every screen sees the same list without asking the database.
let snapshot: { rows: OutboxRow[] } = { rows: [] };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => { listeners.delete(l); });
export const useOutbox = () => useSyncExternalStore(subscribe, () => snapshot, () => snapshot).rows;

let account: string | null = null;
let queryClient: QueryClient | null = null;
let say: (key: string, values?: Record<string, string | number>) => string = (k) => k;
let draining = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function db() {
  const d = await appDb();
  await openOutbox(d);
  return d;
}

async function refresh() {
  if (!account) {
    snapshot = { rows: [] };
  } else {
    try {
      snapshot = { rows: await list(await db(), account) };
    } catch {
      return; // the list stays as it was; sending is not affected
    }
  }
  listeners.forEach((l) => l());
}

/** The photo the person picked sits in a cache the system may empty; keep a copy until it is sent. */
function keepPhoto(id: string, photo: Photo): Photo {
  const dir = new Directory(Paths.document, 'outbox');
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${id}.jpg`);
  new File(photo.uri).copy(dest);
  return { ...photo, uri: dest.uri };
}

function dropPhoto(photo: Photo | null) {
  try {
    if (photo?.uri.includes('/outbox/')) new File(photo.uri).delete();
  } catch {
    // a copy that is already gone is fine
  }
}

/**
 * Saves a new product on the phone and returns at once. This is all the person waits for; the server hears about it in the background.
 * Throws only when the phone itself could not write it down.
 */
export async function queueProduct(userAccount: string, job: ProductJob): Promise<void> {
  account ??= userAccount; // the form is open, so someone is signed in: never leave the sender without an owner when this is saved
  const d = await db();
  const id = newIdempotencyKey();
  const photo = job.photo ? keepPhoto(id, job.photo) : null;
  await enqueue(d, { id, account: userAccount, kind: 'product', payload: JSON.stringify({ ...job, photo }), stock_key: newIdempotencyKey() }, Date.now());
  await refresh();
  void drain();
}

function deps(rowId: string): SendDeps {
  return {
    create: (body, key) => api.post<CreatedProduct>('/products/', body, { idempotencyKey: key }),
    async findExisting(job, since) {
      const rows = await api.get<{ id: string; name: string; created_at?: string }[]>('/products/', { query: { search: job.name, limit: 10 } });
      const hit = rows.find((r) => r.name.trim().toLowerCase() === job.name.trim().toLowerCase() && Date.parse(r.created_at ?? '') >= since - 120_000);
      return hit ? api.get<MadeProduct>(`/products/${hit.id}/`) : null;
    },
    warehouse: findWarehouseId,
    stock: async (body, key) => { await postOpeningStock(body, key); },
    upload: uploadProductImage,
    async save(p) { await saveProgress(await db(), rowId, p); },
  };
}

/** Sends what is due, one item at a time, oldest first. Safe to call from anywhere, any time: only one run goes at once. */
export async function drain(): Promise<void> {
  if (draining || !account) return;
  const mine = account;
  draining = true;
  try {
    const d = await db();
    for (;;) {
      const [row] = await due(d, mine, Date.now());
      if (!row) break;
      const job = JSON.parse(row.payload) as ProductJob;
      try {
        await sendProduct(row, job, deps(row.id));
        await remove(d, row.id);
        dropPhoto(job.photo);
        for (const key of ['stock', 'home', 'sell', 'products']) void queryClient?.invalidateQueries({ queryKey: [key] });
        showToast({ text: say('Sent to the shop: {name}', { name: job.name }) });
      } catch (e) {
        const answered = e instanceof ApiError && e.status !== 0;
        const permanent = (e instanceof ApiError && isPermanent({ status: e.status })) || (answered && row.attempts + 1 >= MAX_BAD_TRIES);
        const message = e instanceof ApiError ? describeProductError(e) : 'The photo could not be added. It will be tried again.';
        await recordFailure(d, row.id, { message, permanent }, Date.now());
        await refresh();
        if (!permanent) break; // no signal or a busy server: wait for the timer, do not hammer through the rest
      }
      await refresh();
    }
  } catch {
    // the phone's database would not open: nothing is lost, the next try opens it again
  } finally {
    draining = false;
    await refresh();
    await schedule();
  }
}

/** Wakes the sender at the moment the next waiting item is due (at least a second away, at most five minutes). */
async function schedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!account) return;
  try {
    const at = await nextDue(await db(), account);
    if (at === null) return;
    timer = setTimeout(() => void drain(), Math.min(Math.max(at - Date.now(), 1_000), 300_000));
  } catch {
    // no timer this round; the next app start, return to the front or signal will send it
  }
}

export async function tryAgain(id: string): Promise<void> {
  await retryNow(await db(), id, Date.now());
  await refresh();
  void drain();
}

export async function discard(id: string): Promise<void> {
  const d = await db();
  const row = (await list(d, account ?? '')).find((r) => r.id === id);
  if (row) dropPhoto((JSON.parse(row.payload) as ProductJob).photo);
  await remove(d, id);
  await refresh();
}

/** Mounted once under the session. Starts the sender for whoever is signed in and wakes it when the app returns to the front or the signal comes back. */
export function OutboxRunner() {
  const { status, me, workspaceUrl } = useSession();
  const qc = useQueryClient();
  const t = useT();
  const mine = senderAccount(status, workspaceUrl, me?.id);

  useEffect(() => {
    queryClient = qc;
    say = (key, values) => t(key, values);
  }, [qc, t]);

  useEffect(() => {
    account = mine;
    void refresh().then(() => drain());
    return () => {
      if (account === mine) account = null;
    };
  }, [mine]);

  useEffect(() => {
    const app = AppState.addEventListener('change', (s) => s === 'active' && void drain());
    const net = Network.addNetworkStateListener((s) => s.isConnected && void drain());
    return () => {
      app.remove();
      net.remove();
    };
  }, []);

  return null;
}
