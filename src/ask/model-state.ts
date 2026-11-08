import { MODEL } from './model-spec.ts';

/** Why a download should not start yet, in the order a person can fix them. */
export type Gate = 'ok' | 'low_memory' | 'no_space' | 'mobile_data';

const GB = 1_000_000_000;
/** A download needs the file plus room to spare, so the phone is not left with no space at all. */
export const spaceNeeded = (partialBytes: number): number => Math.max(0, MODEL.bytes - partialBytes) + 0.3 * GB;

export function startGate(o: { freeBytes: number; ramBytes: number | null; onWifi: boolean; partialBytes: number }): Gate {
  if (o.ramBytes !== null && o.ramBytes < MODEL.minRamBytes) return 'low_memory';
  if (o.freeBytes < spaceNeeded(o.partialBytes)) return 'no_space';
  if (!o.onWifi) return 'mobile_data';
  return 'ok';
}

/** A finished download is exactly the published size. Anything else is a cut-off or damaged file and is thrown away, never loaded. */
export const isComplete = (sizeOnDisk: number): boolean => sizeOnDisk === MODEL.bytes;

export const percent = (received: number): number => Math.max(0, Math.min(100, Math.floor((received / MODEL.bytes) * 100)));
export const megabytes = (bytes: number): number => Math.round(bytes / 1_000_000);

export type ModelState =
  | { kind: 'absent' }
  | { kind: 'downloading'; received: number }
  | { kind: 'paused'; received: number }
  | { kind: 'failed'; received: number; why: 'network' | 'damaged' | 'space' }
  | { kind: 'ready' };

/** What to call the state when the app starts, from what is on disk: nothing, part of the file, or all of it. */
export function stateFromDisk(sizeOnDisk: number | null): ModelState {
  if (sizeOnDisk === null || sizeOnDisk === 0) return { kind: 'absent' };
  if (isComplete(sizeOnDisk)) return { kind: 'ready' };
  if (sizeOnDisk < MODEL.bytes) return { kind: 'paused', received: sizeOnDisk };
  return { kind: 'failed', received: sizeOnDisk, why: 'damaged' }; // bigger than published: not our file
}
