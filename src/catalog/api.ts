import { api } from '@/api/session';

export type Option = { id: string; name: string };

/** Categories and units for the pickers. The server caps a page at 200; the search narrows big catalogues. */
export const listCategories = (search?: string) => api.get<Option[]>('/categories/', { query: { limit: 200, search } });
export const listUnits = (search?: string) => api.get<Option[]>('/units/', { query: { limit: 200, search } });

/** The item as the server made it, with every variant (opening stock is counted against these). */
export type CreatedProduct = { id: string; variants: { id: string; name: string; sku: string }[] };
export const createProduct = (body: unknown) => api.post<CreatedProduct>('/products/', body);

/** Counts opening stock in as one STOCK_IN adjustment, applied in the same call. Needs `inventory.adjust`. One key per save, so a retry cannot count it twice. */
export const postOpeningStock = (body: unknown, idempotencyKey: string) => api.post<{ id: string }>('/inventory/adjustments/', body, { idempotencyKey });

export type Photo = { uri: string; name: string; type: string };
/**
 * Puts a photo on an item in three steps, as the web does: ask for an upload ticket, send the bytes straight to storage (the
 * content type must match what the ticket was signed with), then confirm it as the item's main picture. The server identifies the
 * file by its bytes, not by the type sent. Needs `product.update`.
 */
export async function uploadProductImage(productId: string, photo: Photo): Promise<void> {
  const ticket = await api.post<{ uploadUrl?: string; upload_url?: string; image?: { id: string } }>(`/products/${productId}/images/`, { filename: photo.name, content_type: photo.type });
  const url = ticket.uploadUrl ?? ticket.upload_url ?? '';
  const imageId = ticket.image?.id ?? '';
  if (!url || !imageId) throw new Error('The upload could not be started.');
  const blob = await (await fetch(photo.uri)).blob();
  const put = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': photo.type } });
  if (!put.ok) throw new Error(`The photo could not be stored (${put.status}).`);
  await api.post<unknown>(`/products/${productId}/images/${imageId}/confirm/`, undefined, { query: { primary: true } });
}

export const createCategory = (body: unknown) => api.post<Option>('/categories/', body);
export const createUnit = (body: unknown) => api.post<Option>('/units/', body);

/** Everything for the manage screen, with how many items use each (checked live; the server caps a page at 200). */
export type ManageRow = { id: string; name: string; parent: string | null; product_count: number };
export const listCategoryRows = () => api.get<ManageRow[]>('/categories/', { query: { limit: 200 } });
export const listBrandRows = () => api.get<ManageRow[]>('/brands/', { query: { limit: 200 } }).then((rows) => rows.map((b) => ({ ...b, parent: null })));
/** Needs `category.create`. A parent makes it a kind inside another (three levels at most). */
export const addCategory = (body: { name: string; parent?: string }) => api.post<ManageRow>('/categories/', body);
export const addBrand = (body: { name: string }) => api.post<ManageRow>('/brands/', body);
/** Need `category.update` / `brand.update`. */
export const renameCategory = (id: string, body: { name: string }) => api.patch<ManageRow>(`/categories/${id}/`, body);
export const renameBrand = (id: string, body: { name: string }) => api.patch<ManageRow>(`/brands/${id}/`, body);
/** Need `category.delete` / `brand.delete`. Answer 204; refused with an IN_USE code while items use it. */
export const removeCategory = (id: string) => api.delete<unknown>(`/categories/${id}/`);
export const removeBrand = (id: string) => api.delete<unknown>(`/brands/${id}/`);
