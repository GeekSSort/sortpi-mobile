/**
 * The server's workspace download (`GET /sync/changes/`): a list of pages, each the same JSON the normal list endpoint answers. This turns
 * them into table rows, after checking the copy is whole. A copy with a missing page or a repeated row is refused, never half-kept.
 */
export type SnapshotItem = { path: string; body: { data?: unknown; meta?: { page?: number; limit?: number; total?: number; total_pages?: number } } };
export type StockRow = { variant_id: string; warehouse_id: string; quantity: string };

const FAMILIES = ['/products/', '/customers/', '/categories/', '/brands/', '/units/', '/warehouses/', '/settings/resolved/'] as const;
export type Family = (typeof FAMILIES)[number];

const familyOf = (path: string): string => path.split('?')[0].replace(/\/?$/, '/');
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const text = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const flag = (v: unknown, otherwise = 1): number => (v === undefined || v === null ? otherwise : v ? 1 : 0);

/** Throws when the pages are not one complete copy; otherwise returns each family's rows. Families the server left out (no permission) are simply absent. */
export function rowsByFamily(items: SnapshotItem[]): Partial<Record<Family, Record<string, unknown>[]>> {
  const groups = new Map<string, SnapshotItem[]>();
  for (const it of items) {
    const fam = familyOf(it.path);
    if (!(FAMILIES as readonly string[]).includes(fam)) continue; // a list this app does not keep
    groups.set(fam, [...(groups.get(fam) ?? []), it]);
  }
  const out: Partial<Record<Family, Record<string, unknown>[]>> = {};
  for (const [fam, pages] of groups) {
    const data = pages.map((p) => p.body?.data);
    if (data.some((d) => !Array.isArray(d))) throw new Error(`The copy of ${fam} is not a list.`);
    const meta = pages[0].body.meta;
    if (meta && meta.total_pages !== undefined) {
      const total = Number(meta.total), limit = Number(meta.limit), tp = Number(meta.total_pages);
      const seen = new Set(pages.map((p) => Number(p.body.meta?.page)));
      if (pages.length !== tp || seen.size !== tp || [...seen].some((n) => !Number.isInteger(n) || n < 1 || n > tp)) throw new Error(`The copy of ${fam} is missing a page.`);
      for (const p of pages) {
        const page = Number(p.body.meta?.page);
        const expected = page === tp ? total - limit * (tp - 1) : limit;
        if ((p.body.data as unknown[]).length !== expected) throw new Error(`A page of ${fam} is incomplete.`);
      }
    }
    const rows = (data as unknown[][]).flat().filter(isObj);
    const keyOf = fam === '/settings/resolved/' ? 'key' : 'id';
    const ids = rows.map((r) => text(r[keyOf]));
    if (ids.some((i) => !i) || new Set(ids).size !== ids.length) throw new Error(`The copy of ${fam} has a missing or repeated row.`);
    if (meta && meta.total !== undefined && rows.length !== Number(meta.total)) throw new Error(`The copy of ${fam} has the wrong number of rows.`);
    out[fam as Family] = rows;
  }
  return out;
}

export const lowerKey = (s: unknown): string => text(s).trim().toLowerCase();

export type ShopRows = {
  products: Record<string, string | number | null>[];
  variants: Record<string, string | number | null>[];
  barcodes: Record<string, string | number | null>[];
  customers: Record<string, string | number | null>[];
  categories: Record<string, string | number | null>[];
  brands: Record<string, string | number | null>[];
  units: Record<string, string | number | null>[];
  warehouses: Record<string, string | number | null>[];
  settings: Record<string, string | number | null>[];
  /** The families the server sent. Tables of families it left out are emptied, so a person who lost access does not keep old data. */
  present: Family[];
};

/** Flattens the pages into rows for every table. Barcodes sit inside variants in the download; a code on two variants keeps the first. */
export function toRows(items: SnapshotItem[]): ShopRows {
  const by = rowsByFamily(items);
  const r: ShopRows = { products: [], variants: [], barcodes: [], customers: [], categories: [], brands: [], units: [], warehouses: [], settings: [], present: Object.keys(by) as Family[] };
  const codes = new Set<string>();
  for (const p of by['/products/'] ?? []) {
    r.products.push({ id: text(p.id), name: text(p.name), name_key: lowerKey(p.name), category_id: text(p.category) || null, category_name: text(p.category_name) || null, brand_id: text(p.brand) || null, brand_name: text(p.brand_name) || null, unit_short: text(p.unit_short_name) || null, allow_decimal: flag(p.unit_allow_decimal, 0), tax_rate: text(p.tax_rate) || null, type: text(p.type) || null, is_active: flag(p.is_active), reorder_level: text(p.reorder_level) || null, generic_name: text(p.generic_name) || null , track_serial: flag(p.track_serial, 0) });
    for (const v of Array.isArray(p.variants) ? (p.variants as unknown[]).filter(isObj) : []) {
      r.variants.push({ id: text(v.id), product_id: text(p.id), name: text(v.name) || null, sku: text(v.sku) || null, sku_key: lowerKey(v.sku), price: text(v.price) || null, wholesale_price: text(v.wholesale_price) || null, mrp: text(v.mrp) || null, cost_price: text(v.cost_price) || null, is_default: flag(v.is_default, 0), is_active: flag(v.is_active) });
      for (const b of Array.isArray(v.barcodes) ? (v.barcodes as unknown[]).filter(isObj) : []) {
        const code = text(b.barcode).trim();
        if (code && !codes.has(code)) {
          codes.add(code);
          r.barcodes.push({ code, variant_id: text(v.id), is_primary: flag(b.is_primary, 0) });
        }
      }
    }
  }
  for (const c of by['/customers/'] ?? []) r.customers.push({ id: text(c.id), code: text(c.code) || null, name: text(c.name), name_key: lowerKey(c.name), phone: text(c.phone) || null, customer_type: text(c.customer_type) || null, credit_limit: text(c.credit_limit) || null, current_balance: text(c.current_balance) || null, is_active: flag(c.is_active) });
  for (const c of by['/categories/'] ?? []) r.categories.push({ id: text(c.id), name: text(c.name), parent: text(c.parent) || null });
  for (const b of by['/brands/'] ?? []) r.brands.push({ id: text(b.id), name: text(b.name) });
  for (const u of by['/units/'] ?? []) r.units.push({ id: text(u.id), name: text(u.name), short_name: text(u.short_name) || null, allow_decimal: flag(u.allow_decimal, 0) });
  for (const w of by['/warehouses/'] ?? []) r.warehouses.push({ id: text(w.id), name: text(w.name), code: text(w.code) || null, is_default: flag(w.is_default, 0), is_active: flag(w.is_active) });
  for (const s of by['/settings/resolved/'] ?? []) r.settings.push({ key: text(s.key), value: JSON.stringify(s.value ?? null) });
  return r;
}

/** Stock rows must look like the server's (a quantity with up to three decimals); anything else means the answer cannot be trusted. */
export function checkStock(items: unknown): StockRow[] {
  if (!Array.isArray(items)) throw new Error('The stock list is not a list.');
  for (const r of items) {
    if (!isObj(r) || typeof r.variant_id !== 'string' || typeof r.warehouse_id !== 'string' || typeof r.quantity !== 'string' || !/^-?\d+(\.\d{1,3})?$/.test(r.quantity)) throw new Error('The stock list has a row that is not valid.');
  }
  return items as StockRow[];
}
