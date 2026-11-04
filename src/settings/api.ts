import { File } from 'expo-file-system';

import { api } from '@/api/session';

import { TYPE_OF, type Resolved, type SettingKey } from './logic';
import type { Company, Coupon, CouponMode } from './shop-details';

/** Every setting as this branch sees it (needs `settings.view`). Values come typed: real true/false and decimal text. */
export const resolvedSettings = () => api.get<Resolved[]>('/settings/resolved/');

type Stored = { id: string; key: string; branch: string | null };

/**
 * Change one shop-wide setting (needs `settings.update`). A key is stored once per shop, so the existing row is updated and the first
 * time the row is made. Saving the same value twice is harmless, so a retry after a lost connection is safe.
 */
export async function saveSetting(key: SettingKey, value: string): Promise<void> {
  const rows = await api.get<Stored[]>('/settings/', { query: { limit: 200 } });
  const mine = rows.find((r) => r.key === key && !r.branch);
  if (mine) await api.patch(`/settings/${mine.id}/`, { value });
  else await api.post('/settings/', { key, value, value_type: TYPE_OF[key] });
}

export type UnitRow = { id: string; name: string; short_name: string; allow_decimal: boolean };
/** Stock types (needs `unit.view`; adding needs `unit.create`). The server caps a page at 200. */
export const listUnitRows = () => api.get<UnitRow[]>('/units/', { query: { limit: 200 } });
export const addUnit = (body: { name: string; short_name: string; allow_decimal: boolean }) => api.post<UnitRow>('/units/', body);

/** The shop's own details (needs `settings.view`; changing needs `settings.update`). The server returns only this shop's one record. */
export const getCompany = async () => (await api.get<Company[]>('/organizations/'))[0] ?? null;
/** The logo goes up as a file (needs `settings.update`); the server checks the real bytes and keeps 2 MB. It replaces any logo before it. */
export const uploadLogo = (id: string, uri: string) => {
  const form = new FormData();
  // Expo's fetch cannot send React Native's { uri, name, type } part; a File reads the picture from disk and is a Blob.
  form.append('file', new File(uri) as unknown as Blob);
  return api.postForm<Company>(`/organizations/${id}/logo/`, form);
};
export const removeLogo = (id: string) => api.delete<Company>(`/organizations/${id}/logo/`);
export const saveCompany = (id: string, patch: Record<string, string>) => api.patch<Company>(`/organizations/${id}/`, patch);

/** Coupon codes (needs `settings.view`; adding, changing and removing need `settings.update`). */
export const listCoupons = () => api.get<Coupon[]>('/coupons/', { query: { limit: 200 } });
export const addCoupon = (body: { code: string; mode: CouponMode; value: string }) => api.post<Coupon>('/coupons/', body);
export const changeCoupon = (id: string, body: Partial<{ code: string; mode: CouponMode; value: string; is_active: boolean }>) => api.patch<Coupon>(`/coupons/${id}/`, body);
export const removeCoupon = (id: string) => api.delete<unknown>(`/coupons/${id}/`);

/** Several settings at once: the rows are read one time, then each changed key is updated or made. Stops at the first refusal, so the caller reads the settings again. */
export async function saveMany(changes: { key: string; value: string; type: string }[]): Promise<void> {
  if (!changes.length) return;
  const rows = await api.get<Stored[]>('/settings/', { query: { limit: 200 } });
  for (const c of changes) {
    const mine = rows.find((r) => r.key === c.key && !r.branch);
    if (mine) await api.patch(`/settings/${mine.id}/`, { value: c.value });
    else await api.post('/settings/', { key: c.key, value: c.value, value_type: c.type });
  }
}
