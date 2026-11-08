import { api } from '@/api/session';

export type WarehouseType = 'MAIN' | 'TRANSIT' | 'DAMAGED' | 'RETURN';
/** A place stock is kept (checked live). Needs `warehouse.view`. */
export type Warehouse = { id: string; branch: string; code: string; name: string; type: WarehouseType; is_default: boolean; is_active: boolean };

export const listWarehouses = () => api.get<Warehouse[]>('/warehouses/', { query: { limit: 100 } });
/** Needs `warehouse.create`. */
export const createWarehouse = (body: { branch: string; code: string; name: string; type: WarehouseType }) => api.post<Warehouse>('/warehouses/', { ...body, is_default: false, is_active: true });
/** Needs `warehouse.update`. */
export const updateWarehouse = (id: string, body: Partial<Pick<Warehouse, 'name' | 'type' | 'is_active'>>) => api.patch<Warehouse>(`/warehouses/${id}/`, body);
/** Needs `warehouse.delete`; checked live: the place is gone from every list afterwards. */
export const deleteWarehouse = (id: string) => api.delete<void>(`/warehouses/${id}/`);
