/** How old the copy of the shop on the phone may get before the app downloads it again (while it is open and online). */
export const SYNC_MAX_AGE_MS = 10 * 60_000;

/**
 * What the header shows about the copy of the shop on this phone, worst news first:
 * `off` the server gives this person no copy (nothing to show), `syncing` a download is running, `failed` the last one failed,
 * `offline` the server is not answering, `none` no copy yet, `stale` older than the app keeps it, `fresh` up to date.
 */
export type SyncLevel = 'off' | 'syncing' | 'failed' | 'offline' | 'none' | 'stale' | 'fresh';

export type SyncInput = { allowed: boolean; syncing: boolean; error: string | null; offline: boolean; syncedAt: string | null; now: number; maxAgeMs?: number };

export function syncLevel(o: SyncInput): SyncLevel {
  if (!o.allowed) return 'off';
  if (o.syncing) return 'syncing';
  if (o.error) return 'failed';
  if (o.offline) return 'offline';
  const at = o.syncedAt ? Date.parse(o.syncedAt) : Number.NaN;
  if (!Number.isFinite(at)) return 'none';
  return o.now - at >= (o.maxAgeMs ?? SYNC_MAX_AGE_MS) ? 'stale' : 'fresh';
}

/** Whole minutes since the copy was made, never below zero; null when there is no usable time. */
export function minutesOld(syncedAt: string | null, now: number): number | null {
  const at = syncedAt ? Date.parse(syncedAt) : Number.NaN;
  return Number.isFinite(at) ? Math.max(0, Math.floor((now - at) / 60_000)) : null;
}

/** The status in words (for the screen reader), so the state never rests on colour alone. `{n}` is filled by the caller. */
export const SYNC_TEXT: Record<Exclude<SyncLevel, 'off'>, string> = {
  syncing: 'Updating the shop on this phone',
  failed: 'The shop on this phone could not be updated',
  offline: 'No connection. The shop on this phone may be old',
  none: 'The shop is not on this phone yet',
  stale: 'The shop on this phone is {n} min old',
  fresh: 'The shop on this phone is up to date',
};
