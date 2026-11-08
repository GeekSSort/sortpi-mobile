import type { Db } from './db.ts';
import { DATA_TABLES, SCHEMA, SCHEMA_VERSION } from './schema.ts';
import { lowerKey, type ShopRows, type StockRow } from './snapshot.ts';

type Cell = string | number | null;

/** Makes the tables. A copy made by another version of the app is dropped first: it only mirrors the server and is downloaded again. */
export async function openStore(db: Db): Promise<void> {
  await db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)');
  const row = (await db.all<{ value: string }>("SELECT value FROM meta WHERE key='schema'"))[0];
  if (row && Number(row.value) !== SCHEMA_VERSION) {
    for (const t of [...DATA_TABLES, 'meta']) await db.exec(`DROP TABLE IF EXISTS ${t}`);
  }
  await db.exec(SCHEMA);
  await db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema', ?)", [String(SCHEMA_VERSION)]);
}

async function insertAll(db: Db, table: string, rows: Record<string, Cell>[]): Promise<void> {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  for (const r of rows) await db.run(sql, cols.map((c) => r[c] ?? null));
}

export type Published = { owner: string; serverTime: string; syncedAt: string };

/**
 * Replaces the whole copy in one transaction, so a reader sees the old shop or the new one, never a mix, and a failure halfway leaves the
 * old copy as it was. `owner` names whose copy it is (workspace, person, branch): a copy for someone else is cleared first.
 */
export async function publish(db: Db, rows: ShopRows, stock: StockRow[], meta: Published): Promise<void> {
  await db.transaction(async (tx) => {
    for (const t of DATA_TABLES) await tx.run(`DELETE FROM ${t}`);
    await insertAll(tx, 'products', rows.products);
    await insertAll(tx, 'variants', rows.variants);
    await insertAll(tx, 'barcodes', rows.barcodes);
    await insertAll(tx, 'customers', rows.customers);
    await insertAll(tx, 'categories', rows.categories);
    await insertAll(tx, 'brands', rows.brands);
    await insertAll(tx, 'units', rows.units);
    await insertAll(tx, 'warehouses', rows.warehouses);
    await insertAll(tx, 'settings', rows.settings);
    await insertAll(tx, 'stock', stock.map((s) => ({ variant_id: s.variant_id, warehouse_id: s.warehouse_id, quantity: s.quantity })));
    const put = "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)";
    await tx.run(put, ['owner', meta.owner]);
    await tx.run(put, ['server_time', meta.serverTime]);
    await tx.run(put, ['synced_at', meta.syncedAt]);
  });
}

/** Forgets the shop's data (sign-out, a different person, a different branch). */
export async function wipe(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    for (const t of DATA_TABLES) await tx.run(`DELETE FROM ${t}`);
    await tx.run("DELETE FROM meta WHERE key IN ('owner','server_time','synced_at')");
  });
}

export type StoreStatus = { owner: string | null; syncedAt: string | null; products: number; customers: number };
export async function status(db: Db): Promise<StoreStatus> {
  const meta = Object.fromEntries((await db.all<{ key: string; value: string }>('SELECT key, value FROM meta')).map((r) => [r.key, r.value]));
  const count = async (t: string) => (await db.all<{ n: number }>(`SELECT count(*) AS n FROM ${t}`))[0]?.n ?? 0;
  return { owner: meta.owner ?? null, syncedAt: meta.synced_at ?? null, products: await count('products'), customers: await count('customers') };
}

/** One sellable thing: a variant with its item's name, unit and the stock held across the branch's warehouses. */
export type LocalItem = { variantId: string; productId: string; name: string; productName: string; variantName: string; sku: string; price: string | null; wholesale: string | null; mrp: string | null; unitShort: string | null; allowDecimal: boolean; stock: string; reorderLevel: string | null; categoryName: string | null; brandName: string | null };

type ItemRow = { variant_id: string; product_id: string; product_name: string; variant_name: string | null; sku: string | null; price: string | null; wholesale_price: string | null; mrp: string | null; unit_short: string | null; allow_decimal: number; stock: number | null; reorder_level: string | null; category_name: string | null; brand_name: string | null };

const ITEM_SELECT = `SELECT v.id AS variant_id, v.product_id, p.name AS product_name, v.name AS variant_name, v.sku, v.price, v.wholesale_price, v.mrp,
  p.unit_short, p.allow_decimal, p.reorder_level, p.category_name, p.brand_name,
  (SELECT sum(CAST(s.quantity AS REAL)) FROM stock s WHERE s.variant_id = v.id) AS stock
  FROM variants v JOIN products p ON p.id = v.product_id`;

/** "Rice" with a variant "Default" is just "Rice"; "Cheese" with "500g" is "Cheese 500g" (the same rule the till uses). */
export function itemName(product: string, variant: string | null): string {
  const v = (variant ?? '').trim();
  return !v || /^default$/i.test(v) || v === product ? product : `${product} ${v}`;
}

const toItem = (r: ItemRow): LocalItem => ({
  variantId: r.variant_id, productId: r.product_id, name: itemName(r.product_name, r.variant_name), productName: r.product_name, variantName: r.variant_name ?? '', sku: r.sku ?? '', price: r.price, wholesale: r.wholesale_price, mrp: r.mrp,
  unitShort: r.unit_short, allowDecimal: !!r.allow_decimal, stock: String(r.stock ?? 0), reorderLevel: r.reorder_level, categoryName: r.category_name, brandName: r.brand_name,
});

/** Items whose name, code or barcode contains what was typed; names that start with it come first. Only active items. */
export async function searchItems(db: Db, typed: string, limit = 30): Promise<LocalItem[]> {
  const q = lowerKey(typed);
  if (!q) return [];
  const rows = await db.all<ItemRow>(
    `${ITEM_SELECT}
     WHERE p.is_active = 1 AND v.is_active = 1
       AND (instr(p.name_key, ?) > 0 OR instr(v.sku_key, ?) > 0 OR instr(lower(coalesce(v.name, '')), ?) > 0
            OR EXISTS (SELECT 1 FROM barcodes b WHERE b.variant_id = v.id AND b.code LIKE ? ESCAPE '\\'))
     ORDER BY CASE WHEN p.name_key LIKE ? ESCAPE '\\' THEN 0 WHEN v.sku_key = ? THEN 0 ELSE 1 END, p.name_key, v.is_default DESC
     LIMIT ?`,
    [q, q, q, `${q.replace(/[\\%_]/g, '\\$&')}%`, `${q.replace(/[\\%_]/g, '\\$&')}%`, q, limit],
  );
  return rows.map(toItem);
}

/** The item with exactly this barcode (or exactly this item code), or null. */
export async function findByCode(db: Db, code: string): Promise<LocalItem | null> {
  const c = code.trim();
  if (!c) return null;
  const rows = await db.all<ItemRow>(`${ITEM_SELECT} WHERE p.is_active = 1 AND v.is_active = 1 AND (v.id IN (SELECT variant_id FROM barcodes WHERE code = ?) OR v.sku_key = ?) LIMIT 1`, [c, lowerKey(c)]);
  return rows[0] ? toItem(rows[0]) : null;
}

/** Items at or below their reorder level (a level of 0 means none was set), the least stock first. */
export async function lowStock(db: Db, limit = 50): Promise<LocalItem[]> {
  const rows = await db.all<ItemRow>(`${ITEM_SELECT} WHERE p.is_active = 1 AND v.is_active = 1 AND CAST(coalesce(p.reorder_level, '0') AS REAL) > 0 AND coalesce((SELECT sum(CAST(s.quantity AS REAL)) FROM stock s WHERE s.variant_id = v.id), 0) <= CAST(p.reorder_level AS REAL) ORDER BY stock, p.name_key LIMIT ?`, [limit]);
  return rows.map(toItem);
}

export type LocalCustomer = { id: string; code: string; name: string; phone: string; wholesale: boolean; balance: string; creditLimit: string };
type CustomerRow = { id: string; code: string | null; name: string; phone: string | null; customer_type: string | null; current_balance: string | null; credit_limit: string | null };
export async function searchCustomers(db: Db, typed: string, limit = 30): Promise<LocalCustomer[]> {
  const q = lowerKey(typed);
  const rows = await db.all<CustomerRow>(
    `SELECT id, code, name, phone, customer_type, current_balance, credit_limit FROM customers WHERE is_active = 1 ${q ? 'AND (instr(name_key, ?) > 0 OR instr(coalesce(phone, \'\'), ?) > 0 OR instr(lower(coalesce(code, \'\')), ?) > 0)' : ''} ORDER BY name_key LIMIT ?`,
    q ? [q, q, q, limit] : [limit],
  );
  return rows.map((c) => ({ id: c.id, code: c.code ?? '', name: c.name, phone: c.phone ?? '', wholesale: c.customer_type === 'WHOLESALE', balance: c.current_balance ?? '0', creditLimit: c.credit_limit ?? '0' }));
}

/** Every active item's name (once per item, not per size), for matching what someone typed against the shop's own words. */
export async function itemNames(db: Db): Promise<{ id: string; name: string }[]> {
  return db.all<{ id: string; name: string }>('SELECT id, name FROM products WHERE is_active = 1');
}

export async function customerNames(db: Db): Promise<{ id: string; name: string }[]> {
  return db.all<{ id: string; name: string }>('SELECT id, name FROM customers WHERE is_active = 1');
}

/** The words this shop itself uses: its busiest categories and brands, its units and a few item names. The model is told these about the shop. */
export type ShopWords = { categories: string[]; brands: string[]; units: string[]; items: string[] };
export async function shopWords(db: Db, per = 12): Promise<ShopWords> {
  const top = async (column: 'category_name' | 'brand_name') =>
    (await db.all<{ n: string }>(`SELECT ${column} AS n FROM products WHERE is_active = 1 AND ${column} IS NOT NULL AND ${column} <> '' GROUP BY ${column} ORDER BY count(*) DESC, ${column} LIMIT ?`, [per])).map((r) => r.n);
  return {
    categories: await top('category_name'),
    brands: await top('brand_name'),
    units: (await db.all<{ n: string }>("SELECT coalesce(nullif(short_name, ''), name) AS n FROM units ORDER BY name LIMIT ?", [per])).map((r) => r.n),
    items: (await db.all<{ n: string }>('SELECT name AS n FROM products WHERE is_active = 1 ORDER BY name_key LIMIT ?', [per])).map((r) => r.n),
  };
}
