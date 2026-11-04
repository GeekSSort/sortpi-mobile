import { api } from '@/api/session';

import { listStock } from '@/stock/api';

import { stockLineToItem, toCatalogItems, type CatalogItem, type CatalogProduct } from './catalog-map';

const PAGE = 20;
export type CatalogPage = { items: CatalogItem[]; nextPage: number | undefined };

/** Find items by name, SKU prefix or barcode (`GET /products/search/`, active products only). */
export async function searchCatalog(o: { q: string; page: number; wholesale: boolean }): Promise<CatalogPage> {
  const env = await api.envelope<CatalogProduct[]>('GET', '/products/search/', { query: { q: o.q.trim(), limit: PAGE, page: o.page } });
  return { items: toCatalogItems(env.data ?? [], o.wholesale), nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}

/** What can be sold now, A to Z, for one category or all: the stock list narrowed to items on the shelf (it carries the branch price). */
export async function browseCatalog(o: { category: string | null; page: number }): Promise<CatalogPage> {
  const r = await listStock({ search: '', filter: 'in', page: o.page, withUnstocked: false, category: o.category });
  return { items: r.rows.map(stockLineToItem), nextPage: r.nextPage };
}

/** Whether this shop works with barcodes at all (setting `catalog.use_barcodes`, on by default). A person who may not read settings gets the default. */
export async function shopUsesBarcodes(): Promise<boolean> {
  try {
    const rows = await api.get<{ key: string; value: unknown }[]>('/settings/resolved/');
    const row = rows.find((r) => r.key === 'catalog.use_barcodes');
    return row ? row.value !== false : true;
  } catch {
    return true;
  }
}
