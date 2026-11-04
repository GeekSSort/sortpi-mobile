import { useSyncExternalStore } from 'react';

/**
 * Whether the server has been answering. The API client reports after every request, so there is no extra polling:
 * the first failed request shows the banner, the first answer hides it.
 */
let offline = false;
const listeners = new Set<() => void>();

export function setReachable(reachable: boolean): void {
  if (offline === !reachable) return;
  offline = !reachable;
  listeners.forEach((l) => l());
}
export const isOffline = (): boolean => offline;
export const useOffline = (): boolean => useSyncExternalStore((l) => (listeners.add(l), () => void listeners.delete(l)), () => offline);
