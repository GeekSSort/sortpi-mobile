import { api } from '@/api/session';

import type { Place } from './draft';
import type { Transfer } from './logic';

/** Transfers between this shop's places, newest first (needs `inventory.transfer`). Few enough to load at once and filter on the phone. */
export const listTransfers = () => api.get<Transfer[]>('/inventory/transfers/', { query: { limit: 100 } });
export const getTransfer = (id: string) => api.get<Transfer>(`/inventory/transfers/${id}/`);

export type TransferTotals = { count: number; draft: number; in_transit: number; received: number; units_moved: string };
export const transferTotals = () => api.get<TransferTotals>('/inventory/transfers/summary/');

/** Source to transit (needs `inventory.transfer`). Only a draft, and only from the source branch. */
export const dispatchTransfer = (id: string) => api.post<Transfer>(`/inventory/transfers/${id}/dispatch/`, {});
/** Transit to the destination (needs `inventory.receive_transfer`). No lines means everything still outstanding; naming lines means an item not named receives nothing, and a short receipt leaves the transfer on the way. */
export const receiveTransfer = (id: string, body: { lines?: { item: string; quantity: string }[] } = {}) => api.post<Transfer>(`/inventory/transfers/${id}/receive/`, body);
/** Takes a dispatch back (needs `inventory.transfer`). Only while nothing has arrived. */
export const undoDispatch = (id: string) => api.post<Transfer>(`/inventory/transfers/${id}/undo-dispatch/`, {});

/** Shelves and branches' warehouses, open and closed (needs `warehouse.view`). Closed ones cannot receive stock, so the picker leaves them out. */
export const listPlaces = () => api.get<Place[]>('/warehouses/', { query: { limit: 200 } });

/** Items on one shelf with stock, to pick what to send (needs `inventory.view`). A search narrows it on the server. */
export type StockLine = { variant: string; sku: string; product_name: string; variant_name: string; available: string; unit_short_name: string | null; unit_allow_decimal: boolean | null };
export const listShelf = (o: { warehouse: string; search?: string }) => api.get<StockLine[]>('/inventory/stock/', { query: { warehouse: o.warehouse, limit: 40, search: o.search || undefined } });

/**
 * Makes a draft (needs `inventory.transfer`; the shelf it leaves must be in the person's branch). No stock moves until it is sent.
 * There is no Idempotency-Key on this call: after a lost connection the list is read before it is tried again.
 */
export const createTransfer = (body: ReturnType<typeof import('./draft').transferBody>) => api.post<Transfer>('/inventory/transfers/', body);
