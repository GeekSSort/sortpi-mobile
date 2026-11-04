import * as SecureStore from 'expo-secure-store';

import { setReachable } from '../ui/connection';
import { ApiError, createApiClient, type TokenStore } from './client';

const ACCESS = 'sortpi.access';
const REFRESH = 'sortpi.refresh';
const BASE = 'sortpi.baseUrl';

/** Tokens live in Keychain/Keystore, never in AsyncStorage or logs. */
export const secureTokens: TokenStore = {
  async get() {
    return { access: await SecureStore.getItemAsync(ACCESS), refresh: await SecureStore.getItemAsync(REFRESH) };
  },
  async set(access, refresh) {
    await SecureStore.setItemAsync(ACCESS, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
  },
  async clear() {
    await Promise.all([ACCESS, REFRESH].map((k) => SecureStore.deleteItemAsync(k)));
  },
};

let baseUrl: string | null = null;
let sessionEndListener: (() => void) | undefined;

/** `acme` + `sortpi.com` -> https://acme.sortpi.com/api/v1. Dev servers may pass a full http://host:8000 URL. */
export function workspaceToBaseUrl(workspace: string, platformDomain: string): string {
  const w = workspace.trim().toLowerCase();
  if (/^https?:\/\//.test(w)) return `${w.replace(/\/+$/, '')}/api/v1`;
  return `https://${w}.${platformDomain}/api/v1`;
}

export async function loadWorkspace(): Promise<string | null> {
  baseUrl = await SecureStore.getItemAsync(BASE);
  return baseUrl;
}
export async function setWorkspace(url: string): Promise<void> {
  baseUrl = url;
  await SecureStore.setItemAsync(BASE, url);
}
/** Sign out: tokens only; the workspace address is remembered. */
export const endSession = () => secureTokens.clear();
export const onSessionEnd = (fn: () => void) => void (sessionEndListener = fn);

export const api = createApiClient({
  baseUrl: () => baseUrl,
  tokens: secureTokens,
  onSessionEnd: () => sessionEndListener?.(),
  onReach: setReachable,
});

/**
 * Is there a SortPi workspace at this address? Checked before it is saved, with a plain fetch because
 * the saved address is not set yet. Anything other than a clear "not found" or "closed" passes.
 */
export async function checkWorkspace(url: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${url}/auth/workspace`, { headers: { Accept: 'application/json' } });
  } catch {
    // An address nobody has registered has no DNS record at all, so "no answer" usually means a mistyped name.
    throw new ApiError(0, 'WORKSPACE_UNREACHABLE', 'Could not reach that workspace.');
  }
  if (response.status === 404 || response.status === 403) {
    const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new ApiError(response.status, body.code ?? `HTTP_${response.status}`, body.message ?? 'Workspace unavailable.');
  }
}
