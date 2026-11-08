import * as SecureStore from 'expo-secure-store';

import { newIdempotencyKey } from '@/api/idempotency';
import { api } from '@/api/session';

const TERMINAL = 'sortpi.terminalId';
const DEVICE = 'sortpi.deviceId';

type Stored = { owner: string; id: string };

/** The id this phone keeps for itself. The server treats the same terminal and person again as the same device. */
async function terminalId(): Promise<string> {
  const have = await SecureStore.getItemAsync(TERMINAL);
  if (have) return have;
  const made = newIdempotencyKey();
  await SecureStore.setItemAsync(TERMINAL, made);
  return made;
}

/** Registers this phone with the server for the active branch (once per person and branch) and remembers the device id. */
export async function ensureDevice(owner: string, branchId: string): Promise<string> {
  const raw = await SecureStore.getItemAsync(DEVICE);
  if (raw) {
    try {
      const s = JSON.parse(raw) as Stored;
      if (s.owner === owner && s.id) return s.id;
    } catch {
      // fall through and register again
    }
  }
  const made = await api.post<{ id: string }>('/sync/devices/', { branch_id: branchId, terminal_id: await terminalId(), name: 'SortPi phone' });
  await SecureStore.setItemAsync(DEVICE, JSON.stringify({ owner, id: made.id } satisfies Stored));
  return made.id;
}

export const forgetDevice = (): Promise<void> => SecureStore.deleteItemAsync(DEVICE);
