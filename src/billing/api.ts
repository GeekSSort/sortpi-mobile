import { ApiError } from '@/api/client';
import { api } from '@/api/session';

import type { Plan, RequestForm, Subscription, UpgradeRequest } from './logic';

/** The shop's plan, status, period, ceilings and what is used (needs `billing.view`). Null when the shop has no plan on record: older shops are not limited. */
export async function getSubscription(): Promise<Subscription | null> {
  try {
    return await api.get<Subscription>('/billing/subscription');
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND') return null;
    throw e;
  }
}

/** The plans a shop could move to: public and active ones only. */
export const listPlans = () => api.get<Plan[]>('/billing/plans/', { query: { limit: 50 } });

/** The shop's requests to move up, newest first (needs `billing.view`). */
export const listRequests = () => api.get<UpgradeRequest[]>('/billing/upgrade-requests/', { query: { limit: 20 } });

/**
 * Tell SortPi a payment was made for a plan (needs `billing.manage`). Nothing is charged here and the plan does not change until SortPi checks
 * the payment. One request may wait at a time, so a repeat after a lost connection is refused with UPGRADE_REQUEST_PENDING and harms nothing.
 */
export const fileRequest = (body: { plan_code: string; payment_method: RequestForm['method']; transaction_id: string; amount?: string; note?: string }) => api.post<UpgradeRequest>('/billing/upgrade-requests/', body);

/** Take back a request that is still waiting. */
export const cancelRequest = (id: string) => api.post<UpgradeRequest>(`/billing/upgrade-requests/${id}/cancel/`, {});
