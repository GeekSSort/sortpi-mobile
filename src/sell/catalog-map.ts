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
  images?: { url: string; thumbnail_url?: string; variant?: string | null; is_primary?: boolean; status?: string }[];
};

/** One thing a cashier can tap: a variant of a product, named the way the till names it. */
export type CatalogItem = { variantId: string; sku: string; name: string; price: string; unitShort: string | null; allowDecimal: boolean; stock: string | null; image?: string };

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
      .map((v) => {
        const images = p.images?.filter((image) => (!image.status || image.status === 'READY') && (image.url || image.thumbnail_url)) ?? [];
        const image = images.find((picture) => picture.variant === v.id && picture.is_primary)
          ?? images.find((picture) => picture.variant === v.id)
          ?? images.find((picture) => !picture.variant && picture.is_primary)
          ?? images.find((picture) => !picture.variant);
        return {
          variantId: v.id,
          sku: v.sku,
          name: itemName(p.name, v.name),
          price: wholesale && v.wholesale_price ? v.wholesale_price : v.price,
          unitShort: p.unit_short_name ?? null,
          allowDecimal: p.unit_allow_decimal === true,
          stock: p.track_inventory === false ? null : (v.stock_on_hand ?? null),
          ...(image ? { image: image.thumbnail_url || image.url } : {}),
        };
      }),
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
export type StockLine = { variant: string; sku: string; product_name: string; variant_name: string; price: string; available: string; unit_short_name: string | null; unit_allow_decimal: boolean | null; product_image?: string };

export function stockLineToItem(r: StockLine): CatalogItem {
  return {
    variantId: r.variant,
    sku: r.sku,
    name: itemName(r.product_name, r.variant_name),
    price: r.price,
    unitShort: r.unit_short_name,
    allowDecimal: r.unit_allow_decimal === true,
    stock: r.available,
    ...(r.product_image ? { image: r.product_image } : {}),
  };
}
