import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getMe, type MeData } from '@/api/auth';
import { ApiError } from '@/api/client';
import { api, checkWorkspace, endSession, loadWorkspace, onSessionEnd, secureTokens, setWorkspace, workspaceToBaseUrl } from '@/api/session';
import { PLATFORM_DOMAIN } from './platform';
import { identify } from '@/lib/crash';
import { isFresh, retryableUnlockError } from './unlock';

const BIOMETRIC = 'sortpi.biometric';

type MeResult = { kind: 'ok'; me: MeData } | { kind: 'unreachable' } | { kind: 'ended' };

/** Ask the server who this is. Never throws: the caller decides what each answer means. */
async function fetchMe(): Promise<MeResult> {
  try {
    return { kind: 'ok', me: await getMe() };
  } catch (error) {
    return error instanceof ApiError && (error.status === 0 || error.status >= 500) ? { kind: 'unreachable' } : { kind: 'ended' };
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
  chooseWorkspace: (input: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
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
  const unlockBusy = useRef(false);
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

  const boot = useCallback(async () => {
    setStatus('booting');
    const url = await loadWorkspace();
    setWorkspaceUrl(url);
    const hardware = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    setBiometricAvailable(hardware);
    const wantsLock = hardware && (await SecureStore.getItemAsync(BIOMETRIC)) === '1';
    setBiometricEnabledState(wantsLock);
    const { access, refresh } = await secureTokens.get();
    if (!url || (!access && !refresh)) return setStatus('signedOut');
    if (wantsLock) {
      warm.current = { at: Date.now(), result: fetchMe() }; // fetched now, shown only after unlock
      return setStatus('locked');
    }
    await loadMe();
  }, [loadMe]);

  useEffect(() => {
    onSessionEnd(() => {
      setMe(null);
      setStatus('signedOut');
    });
    void boot();
  }, [boot]);

  const chooseWorkspace = useCallback(async (input: string) => {
    const url = workspaceToBaseUrl(input, PLATFORM_DOMAIN);
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
    setMe(null);
    setStatus('signedOut');
  }, []);

  const unlock = useCallback(async () => {
    if (unlockBusy.current) return false; // one prompt at a time: a second tap must not open a second prompt
    unlockBusy.current = true;
    setUnlocking(true);
    try {
      let result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock SortPi', cancelLabel: 'Cancel' });
      if (!result.success && retryableUnlockError(result.error)) {
        await new Promise((resolve) => setTimeout(resolve, 400)); // let the screen settle, then ask once more
        result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock SortPi', cancelLabel: 'Cancel' });
      }
      if (!result.success) return false;
      const ready = warm.current && isFresh(warm.current.at, Date.now()) ? warm.current.result : fetchMe();
      warm.current = null;
      await apply(await ready);
      return true;
    } finally {
      unlockBusy.current = false;
      setUnlocking(false);
    }
  }, [apply]);

  const setBiometricEnabled = useCallback(async (on: boolean) => {
    if (on) await SecureStore.setItemAsync(BIOMETRIC, '1');
    else await SecureStore.deleteItemAsync(BIOMETRIC);
    setBiometricEnabledState(on);
  }, []);

  useEffect(() => identify(me), [me]);

  const value = useMemo(
    () => ({ status, me, workspaceUrl, biometricAvailable, biometricEnabled, unlocking, chooseWorkspace, signIn, signOut, unlock, retry: boot, setBiometricEnabled }),
    [status, me, workspaceUrl, biometricAvailable, biometricEnabled, unlocking, chooseWorkspace, signIn, signOut, unlock, boot, setBiometricEnabled],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
