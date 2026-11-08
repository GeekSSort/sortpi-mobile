import { ApiError } from '@/api/client';
import { api } from '@/api/session';

import type { Db } from './db.ts';
import { ensureDevice, forgetDevice } from './device';
import { publish, wipe } from './store.ts';
import { downloadSnapshot, type Net } from './sync-core.ts';

const net: Net = {
  manifest: () => api.get('/sync/manifest/'),
  changes: (deviceId, cursor) => api.get('/sync/changes/', { query: { device_id: deviceId, cursor: cursor ?? undefined } }),
  stock: (deviceId) => api.get('/pos/till/stock/', { query: { device_id: deviceId } }),
};

/** The server will not give this person the offline copy (no permission). The app then simply works online, as before. */
export class SyncNotAllowed extends Error {}

/**
 * Downloads the shop and swaps it in. A failure leaves the copy already on the phone untouched. A switched-off phone (DEVICE_REVOKED)
 * forgets its device and its data.
 */
export async function syncShop(db: Db, o: { owner: string; branchId: string }): Promise<void> {
  try {
    const deviceId = await ensureDevice(o.owner, o.branchId);
    const dl = await downloadSnapshot(net, deviceId);
    await publish(db, dl.rows, dl.stock, { owner: o.owner, serverTime: dl.serverTime, syncedAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'DEVICE_REVOKED') {
      await forgetDevice();
      await wipe(db);
      throw new SyncNotAllowed('This phone was switched off for offline use.');
    }
    if (e instanceof ApiError && (e.status === 403 || e.code === 'PERMISSION_DENIED')) throw new SyncNotAllowed('You may not keep the shop on this phone.');
    throw e;
  }
}
