import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';

import { MODEL } from './model-spec';
import { isComplete, startGate, stateFromDisk, type Gate, type ModelState } from './model-state';

/** Where the model lives. It is a plain file in the app's own storage: removed with the app, never uploaded, never part of a backup of shop data. */
export const modelPath = (): string => `${FileSystem.documentDirectory}models/${MODEL.file}`;

let state: ModelState = { kind: 'absent' };
let task: FileSystem.DownloadResumable | null = null;
const listeners = new Set<() => void>();
const set = (s: ModelState) => {
  state = s;
  listeners.forEach((l) => l());
};
export const useModelState = (): ModelState => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), () => state);

async function sizeOnDisk(): Promise<number | null> {
  const info = await FileSystem.getInfoAsync(modelPath());
  return info.exists && !info.isDirectory ? info.size : null;
}

/** Looks at the disk once when the app needs to know (a partly downloaded file is offered for resuming). */
export async function loadModelState(): Promise<ModelState> {
  if (task) return state; // a download is running: its own progress is the truth
  set(stateFromDisk(await sizeOnDisk()));
  return state;
}

/** Can a download start now, or what must the person fix first? Mobile data is a warning the screen asks about, not a block. */
export async function checkGate(): Promise<Gate> {
  const net = await Network.getNetworkStateAsync().catch(() => null);
  return startGate({
    freeBytes: Paths.availableDiskSpace,
    ramBytes: Device.totalMemory,
    onWifi: net?.type === Network.NetworkStateType.WIFI || net?.type === Network.NetworkStateType.ETHERNET,
    partialBytes: (await sizeOnDisk()) ?? 0,
  });
}

async function finish(): Promise<void> {
  task = null;
  const size = await sizeOnDisk();
  if (size !== null && isComplete(size)) return set({ kind: 'ready' });
  // Cut off or damaged: never keep a file the model could not load.
  await FileSystem.deleteAsync(modelPath(), { idempotent: true });
  set({ kind: 'failed', received: 0, why: 'damaged' });
}

/** Starts, or continues from what is already on the disk. Keep the app open while it runs. */
export async function startDownload(): Promise<void> {
  if (task) return;
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}models/`, { intermediates: true });
  const have = (await sizeOnDisk()) ?? 0;
  if (have > MODEL.bytes) await FileSystem.deleteAsync(modelPath(), { idempotent: true });
  const from = have > 0 && have < MODEL.bytes ? have : 0;
  const t = FileSystem.createDownloadResumable(MODEL.url, modelPath(), {}, (p) => set({ kind: 'downloading', received: p.totalBytesWritten }), from > 0 ? String(from) : undefined);
  task = t;
  set({ kind: 'downloading', received: from });
  try {
    await (from > 0 ? t.resumeAsync() : t.downloadAsync());
    if (task === t) await finish(); // a pause or cancel clears `task` first and has already set its own state
  } catch {
    if (task !== t) return;
    task = null;
    set({ kind: 'failed', received: (await sizeOnDisk()) ?? 0, why: 'network' });
  }
}

export async function pauseDownload(): Promise<void> {
  const t = task;
  if (!t) return;
  task = null;
  await t.pauseAsync().catch(() => undefined);
  set({ kind: 'paused', received: (await sizeOnDisk()) ?? 0 });
}

export async function removeModel(): Promise<void> {
  const t = task;
  task = null;
  await t?.cancelAsync().catch(() => undefined);
  await FileSystem.deleteAsync(modelPath(), { idempotent: true });
  set({ kind: 'absent' });
}
