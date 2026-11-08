import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

import { parsePaperPref, type PaperPref } from './paper';

const KEY = 'sortpi.paper';

// One copy for the whole app, so the More screen and the print sheet always agree. `undefined` is "not read from the phone yet".
let current: PaperPref | undefined;
const listeners = new Set<(p: PaperPref) => void>();

async function load(): Promise<PaperPref> {
  if (current !== undefined) return current;
  try {
    current = parsePaperPref(await SecureStore.getItemAsync(KEY));
  } catch {
    current = null;
  }
  return current;
}

export async function setPaperPref(p: Exclude<PaperPref, null>): Promise<void> {
  current = p;
  listeners.forEach((l) => l(p));
  try {
    await SecureStore.setItemAsync(KEY, p);
  } catch {
    // the choice still holds until the app closes; the next print asks again
  }
}

/** The saved receipt paper, `undefined` for the moment it is being read. */
export function usePaperPref(): [PaperPref | undefined, (p: Exclude<PaperPref, null>) => Promise<void>] {
  const [pref, setPref] = useState<PaperPref | undefined>(current);
  useEffect(() => {
    let live = true;
    void load().then((p) => live && setPref(p));
    listeners.add(setPref);
    return () => {
      live = false;
      listeners.delete(setPref);
    };
  }, []);
  return [pref, setPaperPref];
}
