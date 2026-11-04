import type { ScannedItem } from './cart.ts';

/** The parts of a catalogue or search row the till needs (see `GET /products/pos-catalog/` and `GET /products/search/`). */
export type CatalogVariant = { id: string; sku: string; name: string; price: string; wholesale_price: string | null; stock_on_hand?: string | null; is_active?: boolean };
export type CatalogProduct = {
  id: string;
  name: string;
  unit_short_name?: string;
  unit_allow_decimal?: boolean;
  track_inventory?: boolean;
  variants: CatalogVariant[];
};

/** One thing a cashier can tap: a variant of a product, named the way the till names it. */
export type CatalogItem = { variantId: string; sku: string; name: string; price: string; unitShort: string | null; allowDecimal: boolean; stock: string | null };

/** "Rice" with a variant "Default" is just "Rice"; "Cheese" with "500g" is "Cheese 500g". */
export function itemName(product: string, variant: string): string {
  const v = variant.trim();
  return !v || /^default$/i.test(v) || v === product ? product : `${product} ${v}`;
}

/** Every sellable variant of these products as tappable items. A wholesale customer sees the wholesale price where one is set. */
export function toCatalogItems(products: CatalogProduct[], wholesale = false): CatalogItem[] {
  return products.flatMap((p) =>
    p.variants
      .filter((v) => v.is_active !== false)
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        name: itemName(p.name, v.name),
        price: wholesale && v.wholesale_price ? v.wholesale_price : v.price,
        unitShort: p.unit_short_name ?? null,
        allowDecimal: p.unit_allow_decimal === true,
        stock: p.track_inventory === false ? null : (v.stock_on_hand ?? null),
      })),
  );
}

/** The cart line for a tapped item. The server still prices the whole cart; this price is the estimate shown while the cart is built. */
export function toCartItem(item: CatalogItem): ScannedItem {
  return {
    variantId: item.variantId,
    unitId: null,
    name: item.name,
    sku: item.sku,
    unitLabel: null,
    unitPrice: item.price,
    ...(item.allowDecimal ? { allowDecimal: true } : {}),
    ...(item.allowDecimal && item.unitShort ? { unitShort: item.unitShort } : {}),
  };
}

/** The parts of a stock line (`GET /inventory/stock/`) that make a tappable item. Stock lines already carry the branch price and what is on the shelf. */
export type StockLine = { variant: string; sku: string; product_name: string; variant_name: string; price: string; available: string; unit_short_name: string | null; unit_allow_decimal: boolean | null };

export function stockLineToItem(r: StockLine): CatalogItem {
  return {
    variantId: r.variant,
    sku: r.sku,
    name: itemName(r.product_name, r.variant_name),
    price: r.price,
    unitShort: r.unit_short_name,
    allowDecimal: r.unit_allow_decimal === true,
    stock: r.available,
  };
}
