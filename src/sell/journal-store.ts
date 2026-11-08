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
export async function saveDraft(d: DraftCart): Promise<void> {
  try {
    await SecureStore.setItemAsync(DRAFT, JSON.stringify(d));
  } catch {
    // a draft is a convenience: failing to save it never stops a sale
  }
}
export const clearDraft = () => SecureStore.deleteItemAsync(DRAFT).catch(() => undefined);

/** Sign-out and a switch of person: nothing of the last sale stays on the phone. */
export async function clearSaleMemory(): Promise<void> {
  await Promise.all([clearPending(), clearDraft()]);
}
