import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

type ScannerMode = 'device' | 'auto' | 'manual';
type ScanFeedback = 'sound' | 'vibration' | 'silent';
type TillDevice = { scannerMode: ScannerMode; feedback: ScanFeedback };

const KEY = 'sortpi.till.device';
let state: TillDevice = { scannerMode: 'device', feedback: 'vibration' };
const listeners = new Set<() => void>();
let load: Promise<void> | undefined;
let write = Promise.resolve();

function loadSettings() {
  load ??= SecureStore.getItemAsync(KEY).then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<TillDevice>;
    state = {
      scannerMode: saved.scannerMode === 'auto' || saved.scannerMode === 'manual' ? saved.scannerMode : 'device',
      feedback: saved.feedback === 'sound' || saved.feedback === 'silent' ? saved.feedback : 'vibration',
    };
    listeners.forEach((notify) => notify());
  }).catch(() => undefined);
  return load;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadSettings();
  return () => { listeners.delete(listener); };
}

export function setTillDevice(update: Partial<TillDevice>) {
  void loadSettings().then(() => {
    state = { ...state, ...update };
    const value = JSON.stringify(state);
    listeners.forEach((notify) => notify());
    write = write.then(() => SecureStore.setItemAsync(KEY, value)).catch(() => undefined);
  });
}

export const useTillDevice = () => useSyncExternalStore(subscribe, () => state);
