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
};

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
  return errors;
}

/** What the shop keeps on each sale, shown while typing. Null until both prices are real amounts. */
export function profitNote(cost: string, price: string): { profit: string; percent: string; loss: boolean } | null {
  if (!isPriceText(cost) || !isPriceText(price) || parseMoney(price).lte(0)) return null;
  const profit = subMoney(price, cost);
  const percent = parseMoney(profit).div(parseMoney(price)).times(100).round(1).toFixed(1);
  return { profit, percent, loss: compareMoney(profit, '0') < 0 };
}

/** Body for POST /products/. A product without `variants` gets one default variant on the server. */
export function buildProductRequest(f: NewProductForm) {
  // The code, cost price and MRP belong to the variant, so they ride on one "Default" row, as the web sends them.
  const row = {
    ...(f.sku.trim() ? { sku: f.sku.trim() } : {}),
    ...(f.costPrice.trim() ? { cost_price: f.costPrice.trim() } : {}),
    ...(f.mrp.trim() ? { mrp: f.mrp.trim() } : {}),
  };
  return {
    name: f.name.trim(),
    category: f.categoryId,
    unit: f.unitId,
    ...(f.barcode.trim() ? { barcode: f.barcode.trim() } : {}),
    ...(f.price.trim() ? { price: f.price.trim() } : {}),
    ...(f.wholesalePrice.trim() ? { wholesale_price: f.wholesalePrice.trim() } : {}),
    ...(f.reorderLevel.trim() ? { reorder_level: f.reorderLevel.trim() } : {}),
    ...(Object.keys(row).length ? { variants: [{ name: 'Default', is_default: true, ...row }] } : {}),
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
