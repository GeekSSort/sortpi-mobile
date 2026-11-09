import * as SecureStore from 'expo-secure-store';

import { decodeDraft, decodePending, type DraftCart, type PendingSale } from './journal';

// The phone's own copy of a sale in progress. Kept in the same encrypted store as the sign-in, so another app cannot read it.
const PENDING = 'sortpi.pendingSale';
const DRAFT = 'sortpi.draftCart';

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export const loadPending = async (userId: string): Promise<PendingSale | null> => decodePending(await read(PENDING), userId, Date.now());

/** Written BEFORE the sale request is sent and awaited: if the phone dies a moment later the request is still on record. */
export async function savePending(p: PendingSale): Promise<void> {
  await SecureStore.setItemAsync(PENDING, JSON.stringify(p));
}
export const clearPending = () => SecureStore.deleteItemAsync(PENDING).catch(() => undefined);

export const loadDraft = async (userId: string, branchId: string): Promise<DraftCart | null> => decodeDraft(await read(DRAFT), userId, branchId, Date.now());
let draftWrites = Promise.resolve();

function writeDraft(operation: () => Promise<void>, required: boolean) {
  const next = draftWrites.then(operation);
  draftWrites = next.catch(() => undefined);
  return required ? next : draftWrites;
}

export function saveDraft(d: DraftCart, required = false): Promise<void> {
  return writeDraft(() => SecureStore.setItemAsync(DRAFT, JSON.stringify(d)), required);
}
export const clearDraft = (required = false) => writeDraft(() => SecureStore.deleteItemAsync(DRAFT), required);

/** Sign-out and a switch of person: nothing of the last sale stays on the phone. */
export async function clearSaleMemory(): Promise<void> {
  await Promise.all([clearPending(), clearDraft()]);
}
