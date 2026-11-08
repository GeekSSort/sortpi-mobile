import type { LocalItem } from './store.ts';

/** What the till's lookup answer looks like (`/products/lookup/`), made from the local copy so the same screens work offline. */
export function toLookupResponse(i: LocalItem) {
  return {
    variant: { id: i.variantId, sku: i.sku, name: i.variantName, mrp: i.mrp },
    product: { name: i.productName, unit_allow_decimal: i.allowDecimal, ...(i.unitShort ? { unit_short_name: i.unitShort } : {}) },
    price: i.price ?? '0',
  };
}

/** A tappable item for the Sell search. A wholesale customer sees the wholesale price where one is set. */
export function toCatalogItem(i: LocalItem, wholesale: boolean) {
  const useWholesale = wholesale && i.wholesale !== null && Number(i.wholesale) > 0;
  return { variantId: i.variantId, sku: i.sku, name: i.name, price: (useWholesale ? i.wholesale : i.price) ?? '0', unitShort: i.unitShort, allowDecimal: i.allowDecimal, stock: i.stock };
}
