import { useSyncExternalStore } from 'react';

/** Height of a bar pinned above the tab bar (the pay bar on Sell), so a toast can sit above it instead of covering it. */
let height = 0;
const listeners = new Set<() => void>();
export function setBottomBar(h: number): void {
  const next = Math.round(h);
  if (next === height) return;
  height = next;
  listeners.forEach((l) => l());
}
export function useBottomBar(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => height,
    () => 0,
  );
}
