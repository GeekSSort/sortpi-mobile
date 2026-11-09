import { useSyncExternalStore } from 'react';

let focused = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setTillFocus(value: boolean) {
  if (focused === value) return;
  focused = value;
  listeners.forEach((listener) => listener());
}

export const useTillFocus = () => useSyncExternalStore(subscribe, () => focused);
