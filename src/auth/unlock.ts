/**
 * Android can cancel the fingerprint prompt by itself (the screen was still coming up, the app was
 * not in front yet). That is not the person saying no, so it is worth asking once more.
 * A real "Cancel", a lockout or a wrong finger is never retried.
 */
export const retryableUnlockError = (error?: string): boolean => error === 'system_cancel' || error === 'app_cancel' || error === 'unable_to_process';

/** Away from the app this long (home button, a call, another app), and a phone with the lock on asks for the fingerprint again. */
export const LOCK_AFTER_MS = 60_000;
export const shouldRelock = (leftAt: number | null, now: number): boolean => leftAt !== null && now - leftAt >= LOCK_AFTER_MS;

/** Why the fingerprint did not open the shop, in words a shopkeeper can act on. The raw code goes beside it so it can be read out for support. */
export function unlockErrorText(error?: string): string {
  switch (error) {
    case 'lockout':
      return 'Fingerprint is locked after too many tries. Wait a minute, or unlock the phone once with its PIN, then tap Unlock.';
    case 'not_enrolled':
      return 'No fingerprint is saved on this phone. Add one in the phone Settings, then tap Unlock.';
    case 'not_available':
    case 'passcode_not_set':
      return 'This phone cannot use a fingerprint right now. Check the phone Settings, then tap Unlock.';
    case 'authentication_failed':
      return 'Fingerprint not recognised. Tap Unlock and try again.';
    default:
      return 'The fingerprint was not read. Tap Unlock to try again.';
  }
}

/** A /auth/me answer fetched while the lock screen was up is good for a minute; after that ask again. */
export const WARM_ME_MAX_AGE_MS = 60_000;
export const isFresh = (fetchedAt: number, now: number): boolean => now - fetchedAt <= WARM_ME_MAX_AGE_MS;
