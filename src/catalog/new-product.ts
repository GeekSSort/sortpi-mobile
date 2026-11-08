import { ApiError } from '../api/client.ts';
import { compareMoney, parseMoney, subMoney } from '../lib/money.ts';

/**
 * Adding a product from a scanned code. Pure logic, unit-tested.
 * The server rejects a duplicate SKU or barcode and requires a name, category and unit; the checks here
 * only save a round trip and say what is missing in plain words.
 */
export type NewProductForm = {
  barcode: string;
  name: string;
  categoryId: string;
  unitId: string;
  price: string;
  sku: string;
  /** What the shop pays. Only asked of people who may see costs. */
  costPrice: string;
  wholesalePrice: string;
  mrp: string;
  reorderLevel: string;
  /** The brand (optional). */
  brandId?: string;
  /** What is in it, for trades that ask (pharmacy). */
  genericName?: string;
  /** How many are on the shelf now (a single item). Counted in right after the item is made, at the cost typed above. */
  openingStock?: string;
  /** Sizes or colours. Two or more make it a VARIABLE item, each with its own price, cost and opening stock. */
  variants?: VariantRow[];
};

/** One size or colour of an item. */
export type VariantRow = { name: string; price: string; cost: string; opening: string };

export type FormErrors = Partial<Record<keyof NewProductForm, string>>;

/** Money as typed on a keyboard: digits with up to 4 decimals, as the API accepts. */
export const isPriceText = (v: string) => /^\d{1,14}(\.\d{1,4})?$/.test(v.trim());

/** A stock quantity as typed: whole or up to 3 decimals, as the API accepts. */
export const isQtyText = (v: string) => /^\d{1,10}(\.\d{1,3})?$/.test(v.trim());

export function validateNewProduct(f: NewProductForm): FormErrors {
  const errors: FormErrors = {};
  if (!f.name.trim()) errors.name = 'Enter the product name.';
  if (!f.categoryId) errors.categoryId = 'Choose a category.';
  if (!f.unitId) errors.unitId = 'Choose a unit.';
  const amount = 'Enter an amount like 120 or 120.50.';
  if (f.price.trim() && !isPriceText(f.price)) errors.price = 'Enter a price like 120 or 120.50.';
  if (f.costPrice.trim() && !isPriceText(f.costPrice)) errors.costPrice = amount;
  if (f.wholesalePrice.trim() && !isPriceText(f.wholesalePrice)) errors.wholesalePrice = amount;
  if (f.mrp.trim() && !isPriceText(f.mrp)) errors.mrp = amount;
  if (f.reorderLevel.trim() && !isQtyText(f.reorderLevel)) errors.reorderLevel = 'Enter a quantity like 10.';
  const rows = f.variants ?? [];
  if (rows.length > 0) {
    const names = rows.map((r) => r.name.trim().toLowerCase());
    if (rows.length < 2) errors.variants = 'Add at least two sizes or colours, or switch it off.';
    else if (names.some((n) => !n)) errors.variants = 'Every size or colour needs a name.';
    else if (new Set(names).size !== names.length) errors.variants = 'Two of them have the same name.';
    else if (rows.some((r) => (r.price.trim() && !isPriceText(r.price)) || (r.cost.trim() && !isPriceText(r.cost)))) errors.variants = 'Check the prices. Use an amount like 120 or 120.50.';
    else if (rows.some((r) => r.opening.trim() && !isQtyText(r.opening))) errors.variants = 'Check how many are on the shelf. Use a number like 10.';
    else if (rows.some((r) => Number(r.opening) > 0 && !(Number(r.cost) > 0))) errors.variants = 'To count stock in, type what you paid for each one.';
  } else {
    if (f.openingStock?.trim() && !isQtyText(f.openingStock)) errors.openingStock = 'Enter a quantity like 10.';
    else if (Number(f.openingStock) > 0 && !(Number(f.costPrice) > 0)) errors.openingStock = 'To count stock in, type what you paid.';
  }
  return errors;
}

/** What the shop keeps on each sale, shown while typing. Null until both prices are real amounts. */
export function profitNote(cost: string, price: string): { profit: string; percent: string; loss: boolean } | null {
  if (!isPriceText(cost) || !isPriceText(price) || parseMoney(price).lte(0)) return null;
  const profit = subMoney(price, cost);
  const percent = parseMoney(profit).div(parseMoney(price)).times(100).round(1).toFixed(1);
  return { profit, percent, loss: compareMoney(profit, '0') < 0 };
}

/**
 * Body for POST /products/, the way the web's New Items form sends it. One item: a single "Default" variant carries the code, cost and
 * MRP, while the price, barcode and wholesale price ride at the top (the server puts them on that variant). Sizes or colours (two or
 * more): the item is VARIABLE and every price lives on its own row, because the top-level ones would only disagree with the rows.
 */
export function buildProductRequest(f: NewProductForm) {
  const rows = f.variants ?? [];
  const base = {
    name: f.name.trim(),
    category: f.categoryId,
    unit: f.unitId,
    ...(f.brandId ? { brand: f.brandId } : {}),
    ...(f.genericName?.trim() ? { generic_name: f.genericName.trim() } : {}),
    ...(f.reorderLevel.trim() ? { reorder_level: f.reorderLevel.trim() } : {}),
  };
  if (rows.length > 1) {
    return {
      ...base,
      type: 'VARIABLE' as const,
      variants: rows.map((r, i) => ({
        name: r.name.trim(),
        is_default: i === 0,
        ...(r.cost.trim() ? { cost_price: r.cost.trim() } : {}),
        ...(r.price.trim() && Number(r.price) > 0 ? { selling_price: r.price.trim() } : {}),
      })),
    };
  }
  // The code, cost price and MRP belong to the variant, so they ride on one "Default" row, as the web sends them.
  const row = {
    ...(f.sku.trim() ? { sku: f.sku.trim() } : {}),
    ...(f.costPrice.trim() ? { cost_price: f.costPrice.trim() } : {}),
    ...(f.mrp.trim() ? { mrp: f.mrp.trim() } : {}),
  };
  return {
    ...base,
    ...(f.barcode.trim() ? { barcode: f.barcode.trim() } : {}),
    ...(f.price.trim() ? { price: f.price.trim() } : {}),
    ...(f.wholesalePrice.trim() ? { wholesale_price: f.wholesalePrice.trim() } : {}),
    ...(Object.keys(row).length ? { variants: [{ name: 'Default', is_default: true, ...row }] } : {}),
  };
}

type Made = { id: string; name: string }[];
/**
 * Counts the opening stock in after the item is made, as the web does: one STOCK_IN adjustment (goods arriving, not goods found, so it
 * stays out of the profit), applied in the same call. A new variant holds nothing, so each line expects zero on the shelf and carries the
 * cost typed for it. Null when nothing was typed.
 */
export function openingStockBody(f: NewProductForm, made: Made, warehouse: string) {
  const rows = f.variants ?? [];
  const lines =
    rows.length > 1
      ? rows.flatMap((r) => {
          const hit = made.find((v) => v.name.trim().toLowerCase() === r.name.trim().toLowerCase());
          return hit && Number(r.opening) > 0 ? [{ variant: hit.id, qty: r.opening, cost: r.cost }] : [];
        })
      : made[0] && Number(f.openingStock) > 0
        ? [{ variant: made[0].id, qty: f.openingStock as string, cost: f.costPrice }]
        : [];
  if (lines.length === 0) return null;
  return {
    warehouse,
    reason: 'STOCK_IN' as const,
    note: `Opening stock for ${f.name.trim()}`,
    apply: true,
    expect_unchanged: true,
    items: lines.map((l) => ({ variant: l.variant, new_quantity: parseMoney(l.qty).toFixed(3), expected_quantity: '0.000', unit_cost: l.cost.trim() })),
  };
}

export function describeProductError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Could not save the product. Try again.';
  switch (error.code) {
    case 'DUPLICATE_BARCODE':
      return 'Another product already uses this barcode.';
    case 'DUPLICATE_SKU':
      return 'Another product already uses this SKU. Change it or leave it blank.';
    case 'PERMISSION_DENIED':
      return 'You are not allowed to add products.';
    case 'VALIDATION_ERROR': {
      const first = Object.entries(error.errors ?? {})[0];
      const msg = first && Array.isArray(first[1]) ? String(first[1][0]) : '';
      return msg ? `${first![0]}: ${msg}` : 'Check the details and try again.';
    }
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Check it and try again.';
    default:
      return error.message || 'Could not save the product.';
  }
}
