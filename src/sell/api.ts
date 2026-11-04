import { ApiError } from '@/api/client';
import { api } from '@/api/session';
import type { MeData } from '@/api/auth';

import type { Cart, PaymentInput, ScannedItem, SellContext } from './cart';
import { buildPreviewRequest, buildSellRequest } from './cart';
import { fromCounterRows, type Counter } from './counters';
import { fromRow, type HeldCart, type holdBody } from './held';
import { toScannedItem, type LookupResponse } from './lookup-map';
import { isWalkIn, walkInBody, WALK_IN_CODE, WALK_IN_NAME } from './walk-in';

export type Shift = { id: string; counter_name?: string | null; opened_at: string; opening_cash: string };
export type SaleResult = { id: string; invoice_number: string; grand_total: string; paid_amount: string; due_amount: string; status: string; loyalty_points_earned?: number; loyalty_points_spent?: number };

/** `null` when no product has this code (404): the caller may offer to add it. `barcode` is a scanner's exact road, `code` the typed one (SKU or barcode). */
async function lookup(by: 'barcode' | 'code', code: string, branchId: string): Promise<ScannedItem | null> {
  try {
    const r = await api.get<LookupResponse>('/products/lookup/', { query: { [by]: code.trim(), branch: branchId } });
    return toScannedItem(r);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
export const lookupBarcode = (code: string, branchId: string) => lookup('barcode', code, branchId);
export const lookupCode = (code: string, branchId: string) => lookup('code', code, branchId);

const isForbidden = (e: unknown) => e instanceof ApiError && e.status === 403;

/** The branch's main warehouse: from `/warehouses/` when the role may list it, else from the stock rows it may read (they carry the warehouse). */
export async function findWarehouseId(branchId: string): Promise<string> {
  let warehouseId: string | undefined;
  try {
    const rows = await api.get<{ id: string; branch: string; type?: string }[]>('/warehouses/', { query: { limit: 100 } });
    const here = rows.filter((w) => String(w.branch) === branchId);
    warehouseId = (here.find((w) => w.type === 'MAIN') ?? here[0])?.id;
  } catch (e) {
    if (!isForbidden(e)) throw e;
  }
  if (!warehouseId) {
    const stock = await api.get<{ warehouse: string; warehouse_code: string }[]>('/inventory/stock/', { query: { limit: 200 } });
    warehouseId = (stock.find((s) => /-MAIN$/i.test(s.warehouse_code)) ?? stock[0])?.warehouse;
  }
  if (!warehouseId) throw new ApiError(0, 'NO_WAREHOUSE', 'This branch has no warehouse to sell from.');
  return warehouseId;
}

/**
 * Where this till sells from. A default Cashier may not list `/warehouses/` or `/customers/`, but may read
 * stock rows (which carry the warehouse) and the sync customer list (`sync.view`), which holds the walk-in
 * record. Both fallbacks are what the role allows, so the sale needs no extra rights.
 */
export async function loadSellContext(me: MeData): Promise<Omit<SellContext, 'shiftId'>> {
  const branchId = me.active_branch?.id;
  if (!branchId) throw new ApiError(0, 'NO_ACTIVE_BRANCH', 'You are not in a branch yet. Ask your manager to add you to one.');

  const warehouseId = await findWarehouseId(branchId);

  return { branchId, warehouseId, customerId: await findWalkInCustomer() };
}

type CustomerRow = { id: string; code?: string; name?: string };

/** Looks by code, then by name (never by reading a page of customers: a big shop pushes "W" past page one). */
async function findWalkIn(): Promise<string | null> {
  try {
    for (const wanted of [WALK_IN_CODE, WALK_IN_NAME]) {
      const rows = await api.get<CustomerRow[]>('/customers/', { query: { search: wanted, limit: 50 } });
      const found = rows.find(isWalkIn);
      if (found) return found.id;
    }
  } catch (e) {
    if (!isForbidden(e)) throw e;
  }
  const sync = await api.get<{ items: CustomerRow[] }>('/sync/customers/', { query: { since: '1970-01-01T00:00:00Z' } });
  return sync.items.find(isWalkIn)?.id ?? null;
}

/** A new shop has no walk-in record yet. Like the web till, make it the first time it is needed; a role that may not add customers is told who to ask. */
async function findWalkInCustomer(): Promise<string> {
  const found = await findWalkIn();
  if (found) return found;
  try {
    return (await api.post<{ id: string }>('/customers/', walkInBody())).id;
  } catch (e) {
    if (isForbidden(e)) throw new ApiError(0, 'NO_WALK_IN', 'This shop has no walk-in customer record yet. Ask a manager to open Sell once so it is made.');
    // Someone else made it a moment ago: the code is taken, so it exists now.
    const again = await findWalkIn().catch(() => null);
    if (again) return again;
    throw e;
  }
}

export async function currentShift(): Promise<Shift | null> {
  try {
    return await api.get<Shift>('/pos/shifts/current/');
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_OPEN_SHIFT') return null;
    throw e;
  }
}

export const openShift = (branchId: string, openingCash: string, counterId?: string | null) => api.post<Shift>('/pos/shifts/open/', { branch_id: branchId, opening_cash: openingCash, ...(counterId ? { counter_id: counterId } : {}) });

/** The branch's till counters (`pos.access`). A shop with none gets an empty list and opens its day without one. */
export const listCounters = async (branchId: string): Promise<Counter[]> => fromCounterRows(await api.get<Parameters<typeof fromCounterRows>[0]>('/pos/counters/', { query: { branch: branchId, limit: 50 } }));

/** The server's own total for this cart (price, tax, discounts), without saving anything. */
export async function previewTotal(ctx: Pick<SellContext, 'customerId' | 'branchId' | 'wholesale'>, cart: Cart): Promise<{ subtotal: string; tax_amount: string; grand_total: string }> {
  return api.post('/quotations/preview/', buildPreviewRequest(ctx, cart));
}

/** One `idempotencyKey` per sale attempt: a retry after a dropped connection returns the first result. */
export const sell = (ctx: SellContext, cart: Cart, payments: PaymentInput[], idempotencyKey: string) =>
  api.post<SaleResult>('/sales/sell/', buildSellRequest(ctx, cart, payments), { idempotencyKey });

export type ShiftSummary = { opening_cash: string; cash_sales: string; cash_refunds: string; cash_collected?: string; cash_in?: string; cash_out?: string; expected_cash: string; sale_count: number; total_sales?: string };
export const shiftSummary = (id: string) => api.get<ShiftSummary>(`/pos/shifts/${id}/summary/`);
export const closeShift = (id: string, countedCash: string, note: string) => api.post<{ expected_cash?: string; counted_cash?: string; difference?: string }>(`/pos/shifts/${id}/close/`, { counted_cash: countedCash, ...(note.trim() ? { note: note.trim() } : {}) });

// ---- parked carts (needs `pos.hold_sale`; checked against openapi.yaml: /pos/hold/, /pos/held/, /pos/held/{id}/resume/, DELETE /pos/held/{id}/) ----
export const holdCart = (body: ReturnType<typeof holdBody>) => api.post<unknown>('/pos/hold/', body);
export const heldCarts = async (): Promise<HeldCart[]> => (await api.get<Parameters<typeof fromRow>[0][]>('/pos/held/', { query: { limit: 50 } })).map(fromRow);
/** The server hands the cart over and deletes it in the same call, so two tills cannot ring it twice. */
export const resumeHeld = async (id: string): Promise<HeldCart> => fromRow(await api.post<Parameters<typeof fromRow>[0]>(`/pos/held/${id}/resume/`));
export const dropHeld = (id: string) => api.delete<unknown>(`/pos/held/${id}/`);

/** What a coupon is worth on THIS bill, asked before charging (any till may ask: `POST /coupons/check/`). The sale prices it again itself. */
export type CouponCheck = { code: string; mode: string; value: string; discount: string; description: string };
export const checkCoupon = (code: string, payable: string) => api.post<CouponCheck>('/coupons/check/', { code, payable });

/** A named customer's points balance (needs `customer.view`). */
export const customerPoints = async (id: string): Promise<number> => Number((await api.get<{ loyalty_points?: number }>(`/customers/${id}/`)).loyalty_points ?? 0);

/** The raw lookup for a price check (it keeps the printed price). `null` when nothing carries this code. Needs `product.view`. */
export async function lookupForPriceCheck(by: 'barcode' | 'code', code: string, branchId: string): Promise<(LookupResponse & { variant: LookupResponse['variant'] & { mrp?: string | null } }) | null> {
  try {
    return await api.get('/products/lookup/', { query: { [by]: code.trim(), branch: branchId } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
