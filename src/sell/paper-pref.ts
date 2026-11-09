import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

import { DEFAULT_RECEIPT_WIDTH, parsePaperPref, savedPaperWidth, type ReceiptWidth } from './paper';
import { androidPosDevice, builtInPaperWidth } from './device-printer';

const KEY = 'sortpi.paper';

// One copy for the whole app, so the settings screen and the print action always agree. `undefined` is "not read from the phone yet".
let current: ReceiptWidth | null | undefined;
let pendingSave = Promise.resolve();
const listeners = new Set<(p: ReceiptWidth) => void>();

export async function loadPaperPref(builtIn?: '58mm' | '80mm' | null): Promise<ReceiptWidth> {
  if (current === undefined) {
    const saved = await SecureStore.getItemAsync(KEY).catch(() => null);
    if (current === undefined) current = savedPaperWidth(saved);
  }
  const detected = builtIn === undefined && !current ? await builtInPaperWidth() : builtIn;
  return parsePaperPref(current, detected ?? androidPosDevice?.suggestedPaper);
}

export function setPaperPref(p: ReceiptWidth | null): Promise<void> {
  current = p;
  if (p === null) {
    void loadPaperPref().then((width) => {
      if (current === null) listeners.forEach((listener) => listener(width));
    });
  } else {
    listeners.forEach((listener) => listener(p));
  }
  pendingSave = pendingSave.then(() => p === null ? SecureStore.deleteItemAsync(KEY) : SecureStore.setItemAsync(KEY, p)).catch(() => {
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
