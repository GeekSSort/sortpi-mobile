import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getMe, type MeData } from '@/api/auth';
import { ApiError } from '@/api/client';
import { api, checkWorkspace, endSession, loadWorkspace, onSessionEnd, secureTokens, setWorkspace, workspaceToBaseUrl } from '@/api/session';
import { PLATFORM_DOMAIN } from './platform';
import { identify } from '@/lib/crash';
import { clearDraft } from '@/sell/journal-store';
import { setTillFocus } from '@/ui/till-focus';
import { isFresh, retryableUnlockError, shouldRelock } from './unlock';

const BIOMETRIC = 'sortpi.biometric';

type MeResult = { kind: 'ok'; me: MeData } | { kind: 'unreachable' } | { kind: 'ended' };

/** 401 (no good token) and the 403s that mean this person can no longer use this shop (checked against docs/reference/lookup-tables.md). */
const ENDING_403 = ['ACCOUNT_INACTIVE', 'ACCOUNT_DISABLED', 'SUBSCRIPTION_INACTIVE', 'TENANT_MISMATCH', 'DEVICE_REVOKED'];
const endsSession = (e: ApiError): boolean => e.status === 401 || (e.status === 403 && ENDING_403.includes(e.code));

/** Ask the server who this is. Never throws: the caller decides what each answer means. */
async function fetchMe(): Promise<MeResult> {
  try {
    return { kind: 'ok', me: await getMe() };
  } catch (error) {
    // Only the server saying "you are not signed in" ends the session. A throttle (429), a refusal of a permission or any hiccup keeps it, and the person can retry.
    return error instanceof ApiError && endsSession(error) ? { kind: 'ended' } : { kind: 'unreachable' };
  }
}

/** booting: reading storage. unreachable: signed in before but the server did not answer. */
export type SessionStatus = 'booting' | 'signedOut' | 'locked' | 'signedIn' | 'unreachable';

type Session = {
  status: SessionStatus;
  me: MeData | null;
  /** Saved API base URL, or null before a workspace is chosen. */
  workspaceUrl: string | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  /** True from the fingerprint prompt until the shop has opened. */
  unlocking: boolean;
  /** Raw reason the last fingerprint try failed (`lockout`, `not_enrolled`...), or null. */
  unlockError: string | null;
  chooseWorkspace: (input: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  lockTill: (resume: boolean) => Promise<boolean>;
  resumeTill: boolean;
  manualLock: boolean;
  clearTillResume: () => void;
  beforeTillLock: (save: () => Promise<void>) => () => void;
  retry: () => Promise<void>;
  setBiometricEnabled: (on: boolean) => Promise<void>;
};

const Ctx = createContext<Session | null>(null);
export const useSession = (): Session => {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('booting');
  const [me, setMe] = useState<MeData | null>(null);
  const [workspaceUrl, setWorkspaceUrl] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const unlockBusy = useRef(false);
  const lockBusy = useRef(false);
  const saveTill = useRef<(() => Promise<void>) | null>(null);
  const [resumeTill, setResumeTill] = useState(false);
  const [manualLock, setManualLock] = useState(false);
  const clearTillResume = useCallback(() => setResumeTill(false), []);
  const beforeTillLock = useCallback((save: () => Promise<void>) => {
    saveTill.current = save;
    return () => { if (saveTill.current === save) saveTill.current = null; };
  }, []);
  /** /auth/me started while the fingerprint prompt is up, so its wait overlaps with the person's touch. Nothing is shown until unlock. */
  const warm = useRef<{ at: number; result: Promise<MeResult> } | null>(null);

  const apply = useCallback(async (result: MeResult) => {
    if (result.kind === 'ok') {
      setMe(result.me);
      setStatus('signedIn');
    } else if (result.kind === 'unreachable') {
      setStatus('unreachable');
    } else {
      await endSession();
      setMe(null);
      setStatus('signedOut');
    }
  }, []);

  const loadMe = useCallback(async () => apply(await fetchMe()), [apply]);

  const run = useCallback(async () => {
    // Everything the start needs is read from the phone at the same time, not one after another.
    const [url, hardware, flag, tokens] = await Promise.all([
      loadWorkspace(),
      Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]).then(([has, enrolled]) => has && enrolled).catch(() => false),
      SecureStore.getItemAsync(BIOMETRIC).catch(() => null),
      secureTokens.get(),
    ]);
    setWorkspaceUrl(url);
    setBiometricAvailable(hardware);
    const wantsLock = hardware && flag === '1';
    setBiometricEnabledState(wantsLock);
    const { access, refresh } = tokens;
    if (!url || (!access && !refresh)) return setStatus('signedOut');
    if (wantsLock) {
      warm.current = { at: Date.now(), result: fetchMe() }; // fetched now, shown only after unlock
      return setStatus('locked');
    }
    await loadMe();
  }, [loadMe]);

  /** Start over from the phone's own storage (the "Try again" on the unreachable screen). */
  const boot = useCallback(async () => {
    setStatus('booting');
    await run();
  }, [run]);

  const queryClient = useQueryClient();
  // Nothing the last person saw stays for the next one on a shared phone: the cached shop data and the saved cart go with the session.
  // (An unfinished sale is kept, tied to its own user, so signing back in can still finish it.)
  const forgetSession = useCallback(() => {
    setResumeTill(false);
    setManualLock(false);
    setTillFocus(false);
    queryClient.clear();
    void clearDraft();
  }, [queryClient]);

  useEffect(() => {
    onSessionEnd(() => {
      forgetSession();
      setMe(null);
      setStatus('signedOut');
    });
    // The status is already 'booting' the first time. Started a moment later, so nothing is set while this effect is still running.
    queueMicrotask(() => void run());
  }, [run, forgetSession]);

  const chooseWorkspace = useCallback(async (input: string) => {
    const url = workspaceToBaseUrl(input, PLATFORM_DOMAIN, __DEV__);
    await checkWorkspace(url);
    await setWorkspace(url);
    setWorkspaceUrl(url);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const pair = await api.post<{ access: string; refresh: string }>('/auth/login', { email: email.trim(), password }, { anonymous: true });
      if (!pair?.access) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      await secureTokens.set(pair.access, pair.refresh);
      await loadMe();
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    const { refresh } = await secureTokens.get();
    // Tell the server to revoke it, but never let a failed call keep someone signed in.
    if (refresh) await api.post('/auth/logout', { refresh }).catch(() => undefined);
    await endSession();
    forgetSession();
    setMe(null);
    setStatus('signedOut');
  }, [forgetSession]);

  const lockTill = useCallback(async (resume: boolean) => {
    if (status !== 'signedIn' || !biometricEnabled || !biometricAvailable || lockBusy.current) return false;
    lockBusy.current = true;
    try {
      await saveTill.current?.();
      setResumeTill(resume);
      setManualLock(true);
      warm.current = { at: Date.now(), result: fetchMe() };
      setStatus('locked');
      return true;
    } catch {
      return false;
    } finally {
      lockBusy.current = false;
    }
  }, [status, biometricEnabled, biometricAvailable]);

  const unlock = useCallback(async () => {
    if (unlockBusy.current) return false; // one prompt at a time: a second tap must not open a second prompt
    unlockBusy.current = true;
    setUnlocking(true);
    setUnlockError(null);
    try {
      // An earlier prompt that Android dropped without an answer leaves the library believing one is still open, and it then
      // refuses every new request with `app_cancel` until the app restarts. Clearing it first makes each tap start fresh.
      const ask = async () => {
        await LocalAuthentication.cancelAuthenticate().catch(() => undefined);
        return LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock SortPi', cancelLabel: 'Cancel' });
      };
      let result = await ask();
      if (!result.success && retryableUnlockError(result.error)) {
        await new Promise((resolve) => setTimeout(resolve, 400)); // let the screen settle, then ask once more
        result = await ask();
      }
      if (!result.success) {
        setUnlockError(result.error ?? 'unknown');
        return false;
      }
      const ready = warm.current && isFresh(warm.current.at, Date.now()) ? warm.current.result : fetchMe();
      warm.current = null;
      await apply(await ready);
      setManualLock(false);
      return true;
    } finally {
      unlockBusy.current = false;
      setUnlocking(false);
    }
  }, [apply]);

  // A phone with the lock on asks for the fingerprint again after a minute away from the app. The cart on screen is saved, so it comes back.
  useEffect(() => {
    if (!biometricEnabled || status !== 'signedIn') return;
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') leftAt = Date.now();
      else if (next === 'active') {
        if (shouldRelock(leftAt, Date.now())) {
          warm.current = { at: Date.now(), result: fetchMe() }; // fetched now, shown only after unlock
          setStatus('locked');
        }
        leftAt = null;
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, status]);

  const setBiometricEnabled = useCallback(async (on: boolean) => {
    if (on) await SecureStore.setItemAsync(BIOMETRIC, '1');
    else await SecureStore.deleteItemAsync(BIOMETRIC);
    setBiometricEnabledState(on);
  }, []);

  useEffect(() => identify(me), [me]);

  const value = useMemo(
    () => ({ status, me, workspaceUrl, biometricAvailable, biometricEnabled, unlocking, unlockError, chooseWorkspace, signIn, signOut, unlock, lockTill, resumeTill, manualLock, clearTillResume, beforeTillLock, retry: boot, setBiometricEnabled }),
    [status, me, workspaceUrl, biometricAvailable, biometricEnabled, unlocking, unlockError, chooseWorkspace, signIn, signOut, unlock, lockTill, resumeTill, manualLock, clearTillResume, beforeTillLock, boot, setBiometricEnabled],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
