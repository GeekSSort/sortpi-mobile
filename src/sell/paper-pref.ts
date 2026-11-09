import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

import { DEFAULT_RECEIPT_WIDTH, parsePaperPref, type ReceiptWidth } from './paper';

const KEY = 'sortpi.paper';

// One copy for the whole app, so the settings screen and the print action always agree. `undefined` is "not read from the phone yet".
let current: ReceiptWidth | undefined;
let pendingSave = Promise.resolve();
const listeners = new Set<(p: ReceiptWidth) => void>();

export async function loadPaperPref(): Promise<ReceiptWidth> {
  if (current !== undefined) return current;
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    current ??= parsePaperPref(saved);
  } catch {
    current ??= DEFAULT_RECEIPT_WIDTH;
  }
  return current;
}

export function setPaperPref(p: ReceiptWidth): Promise<void> {
  current = p;
  listeners.forEach((l) => l(p));
  pendingSave = pendingSave.then(() => SecureStore.setItemAsync(KEY, p)).catch(() => {
    // Keep the choice for this session if storage is unavailable.
  });
  return pendingSave;
}

export function usePaperPref(): [ReceiptWidth, typeof setPaperPref] {
  const [pref, setPref] = useState(current ?? DEFAULT_RECEIPT_WIDTH);
  useEffect(() => {
    let live = true;
    void loadPaperPref().then((p) => live && setPref(current ?? p));
    listeners.add(setPref);
    return () => {
      live = false;
      listeners.delete(setPref);
    };
  }, []);
  return [pref, setPaperPref];
}
