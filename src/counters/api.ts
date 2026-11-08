import { api } from '@/api/session';

/** A till position in a branch (checked live). `in_use_by` is the cashier whose shift is open there, if any. Reading needs `pos.access`. */
export type Counter = { id: string; branch_id: string; branch_name: string; name: string; code: string; is_active: boolean; sort_order: number; in_use_by?: string | null };

export const listCounters = () => api.get<Counter[]>('/pos/counters/', { query: { limit: 100 } });
/** Add and change both need `branch.update`. */
export const createCounter = (body: { branch_id: string; name: string; code: string }) => api.post<Counter>('/pos/counters/', { ...body, is_active: true });
/** A counter is never deleted: it is taken out of use, and can be switched on again. */
export const updateCounter = (id: string, body: Partial<Pick<Counter, 'name' | 'code' | 'is_active'>>) => api.patch<Counter>(`/pos/counters/${id}/`, body);
