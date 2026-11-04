import { api } from '@/api/session';

import { withListedStock, type Offer, type offerBody, type priceBody } from './logic';

/** The parts of a product the phone shows (checked on the OpenAPI file and the live local API). Money is text; `cost_price` is there only for roles that may see cost. */
export type Variant = { id: string; sku: string; name: string; cost_price?: string; price: string; stock_on_hand: string; is_default: boolean; is_active: boolean; barcodes: { id: string; barcode: string; is_primary: boolean }[] };
export type Product = {
  id: string;
  name: string;
  category: string;
  category_name: string;
  brand: string | null;
  brand_name: string;
  stock_on_hand: string;
  unit_name: string;
  unit_short_name: string;
  unit_allow_decimal: boolean;
  reorder_level: string;
  is_active: boolean;
  variants: Variant[];
};

const PAGE = 25;

/** One page of items (active only), by name. Search matches name, code prefix or an exact barcode. Needs `product.view`. */
export async function listProducts(o: { search: string; page: number }) {
  const env = await api.envelope<Product[]>('GET', '/products/', { query: { limit: PAGE, page: o.page, status: 'active', ordering: 'name', search: o.search.trim() || undefined } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}
/** One item. Its stock figures are replaced with the list's (the single-item call answers 0: see `withListedStock`); the list is found by the item's first code. */
export async function getProduct(id: string): Promise<Product> {
  const one = await api.get<Product>(`/products/${id}/`);
  const code = one.variants[0]?.sku;
  if (!code) return one;
  try {
    const listed = await listProducts({ search: code, page: 1 });
    return withListedStock(one, listed.rows.find((p) => p.id === id));
  } catch {
    return one; // the stock line may be wrong, the price and details are not
  }
}

/** Sets the shop-wide selling price of one variant. Needs `product.update` (the server gates price on it, not on `product.update_price`). */
export const setPrice = (id: string, body: ReturnType<typeof priceBody>) => api.request<unknown>('PUT', `/products/${id}/price/`, { body });
/** Sets the shop-wide offer of one variant. Needs `product.update`. */
export const setOffer = (id: string, body: ReturnType<typeof offerBody>) => api.request<Offer>('PUT', `/products/${id}/discount/`, { body });
/** Removes the shop-wide offer of one variant (answers 204; a branch's own offer is a different scope and stays). */
export const clearOffer = (id: string, variant: string) => api.request<unknown>('DELETE', `/products/${id}/discount/`, { body: { variant } });
/** Every offer running now. Needs `product.view`. */
export const listOffers = () => api.get<Offer[]>('/products/discounts/', { query: { limit: 200 } });

/** Changes only the fields sent. Needs `product.update`. */
export const updateProduct = (id: string, body: Record<string, string>) => api.patch<Product>(`/products/${id}/`, body);
export const listBrands = (search?: string) => api.get<{ id: string; name: string }[]>('/brands/', { query: { limit: 200, search } });

/** The cards above the list. `stock_value` is only there for roles that may see cost. Low and finished count kinds, not items, so they are not shown on the items list. */
export type ProductSummary = { total_products: number; stock_value?: string };
export const productSummary = () => api.get<ProductSummary>('/products/summary/');
