/** Bump when a table changes. A database made by an older version is thrown away and downloaded again (it is only a copy of the server). */
export const SCHEMA_VERSION = 2; // 2: products know whether they are sold by serial number

/**
 * The phone's copy of the shop. Money is TEXT, exactly as the server sends it (never a float). `*_key` columns hold the lower-cased text
 * used for searching, made in code because SQLite lowers only ASCII and shop names can be Bangla.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL, category_id TEXT, category_name TEXT, brand_id TEXT, brand_name TEXT,
  unit_short TEXT, allow_decimal INTEGER NOT NULL DEFAULT 0, tax_rate TEXT, type TEXT, is_active INTEGER NOT NULL DEFAULT 1,
  reorder_level TEXT, generic_name TEXT, track_serial INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS variants (
  id TEXT NOT NULL PRIMARY KEY, product_id TEXT NOT NULL, name TEXT, sku TEXT, sku_key TEXT, price TEXT, wholesale_price TEXT, mrp TEXT,
  cost_price TEXT, is_default INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS barcodes (code TEXT NOT NULL PRIMARY KEY, variant_id TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT NOT NULL PRIMARY KEY, code TEXT, name TEXT NOT NULL, name_key TEXT NOT NULL, phone TEXT, customer_type TEXT, credit_limit TEXT,
  current_balance TEXT, is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS categories (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, parent TEXT);
CREATE TABLE IF NOT EXISTS brands (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS units (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, short_name TEXT, allow_decimal INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS warehouses (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, code TEXT, is_default INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS settings (key TEXT NOT NULL PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS stock (variant_id TEXT NOT NULL, warehouse_id TEXT NOT NULL, quantity TEXT NOT NULL, PRIMARY KEY (variant_id, warehouse_id));
CREATE INDEX IF NOT EXISTS products_name ON products (name_key);
CREATE INDEX IF NOT EXISTS variants_product ON variants (product_id);
CREATE INDEX IF NOT EXISTS variants_sku ON variants (sku_key);
CREATE INDEX IF NOT EXISTS barcodes_variant ON barcodes (variant_id);
CREATE INDEX IF NOT EXISTS customers_name ON customers (name_key);
CREATE INDEX IF NOT EXISTS customers_phone ON customers (phone);
`;

/** Every table that holds shop data (not meta), in the order they are emptied before a new copy goes in. */
export const DATA_TABLES = ['stock', 'barcodes', 'variants', 'products', 'customers', 'categories', 'brands', 'units', 'warehouses', 'settings'] as const;
