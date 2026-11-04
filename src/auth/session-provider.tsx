import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getMe, type MeData } from '@/api/auth';
import { ApiError } from '@/api/client';
import { api, checkWorkspace, endSession, loadWorkspace, onSessionEnd, secureTokens, setWorkspace, workspaceToBaseUrl } from '@/api/session';
import { PLATFORM_DOMAIN } from './platform';
import { identify } from '@/lib/crash';

const BIOMETRIC = 'sortpi.biometric';

/** booting: reading storage. unreachable: signed in before but the server did not answer. */
export type SessionStatus = 'booting' | 'signedOut' | 'locked' | 'signedIn' | 'unreachable';

type Session = {
  status: SessionStatus;
  me: MeData | null;
  /** Saved API base URL, or null before a workspace is chosen. */
  workspaceUrl: string | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
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

  const loadMe = useCallback(async () => {
    try {
      setMe(await getMe());
      setStatus('signedIn');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
        setStatus('unreachable');
      } else {
        await endSession();
        setMe(null);
        setStatus('signedOut');
      }
    }
  }, []);

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
    if (wantsLock) return setStatus('locked'); // /auth/me waits until the person proves it is them
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
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock SortPi', cancelLabel: 'Cancel' });
    if (!result.success) return false;
    await loadMe();
    return true;
  }, [loadMe]);

  const setBiometricEnabled = useCallback(async (on: boolean) => {
    if (on) await SecureStore.setItemAsync(BIOMETRIC, '1');
    else await SecureStore.deleteItemAsync(BIOMETRIC);
    setBiometricEnabledState(on);
  }, []);

  useEffect(() => identify(me), [me]);

  const value = useMemo(
    () => ({ status, me, workspaceUrl, biometricAvailable, biometricEnabled, chooseWorkspace, signIn, signOut, unlock, retry: boot, setBiometricEnabled }),
    [status, me, workspaceUrl, biometricAvailable, biometricEnabled, chooseWorkspace, signIn, signOut, unlock, boot, setBiometricEnabled],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
