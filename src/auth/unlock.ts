/**
 * Android can cancel the fingerprint prompt by itself (the screen was still coming up, the app was
 * not in front yet). That is not the person saying no, so it is worth asking once more.
 * A real "Cancel", a lockout or a wrong finger is never retried.
 */
export const retryableUnlockError = (error?: string): boolean => error === 'system_cancel' || error === 'app_cancel' || error === 'unable_to_process';

/** A /auth/me answer fetched while the lock screen was up is good for a minute; after that ask again. */
export const WARM_ME_MAX_AGE_MS = 60_000;
export const isFresh = (fetchedAt: number, now: number): boolean => now - fetchedAt <= WARM_ME_MAX_AGE_MS;
