import { api } from '@/api/session';

export type Option = { id: string; name: string };

/** Categories and units for the pickers. The server caps a page at 200; the search narrows big catalogues. */
export const listCategories = (search?: string) => api.get<Option[]>('/categories/', { query: { limit: 200, search } });
export const listUnits = (search?: string) => api.get<Option[]>('/units/', { query: { limit: 200, search } });

export const createProduct = (body: unknown) => api.post<{ id: string }>('/products/', body);

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
