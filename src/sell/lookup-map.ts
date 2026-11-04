import type { ScannedItem } from './cart.ts';

/** The parts of `GET /products/lookup/` the cart needs (see BarcodeLookup in api/schema.d.ts). */
export type LookupResponse = {
  variant: { id: string; sku?: string; name: string };
  product: { name: string; unit_allow_decimal?: boolean; unit_short_name?: string };
  price: string;
  unit?: { id: string; name: string } | null;
  unit_price?: string | null;
};

/**
 * Turn a lookup answer into a cart item. A selling unit's own barcode (a carton's) answers the
 * variant AND `unit` with `unit_price` for one of that unit, so the cashier rings one carton.
 */
export function toScannedItem(r: LookupResponse): ScannedItem {
  const variantName = r.variant.name && r.variant.name !== r.product.name ? ` ${r.variant.name}` : '';
  const unit = r.unit ?? null;
  return {
    variantId: r.variant.id,
    unitId: unit ? unit.id : null,
    name: `${r.product.name}${variantName}`.trim(),
    sku: r.variant.sku ?? '',
    unitLabel: unit ? unit.name : null,
    unitPrice: unit && r.unit_price ? r.unit_price : r.price,
    // A carton is always counted whole; the product's own unit may be sold in parts.
    ...(!unit && r.product.unit_allow_decimal ? { allowDecimal: true } : {}),
    ...(!unit && r.product.unit_short_name ? { unitShort: r.product.unit_short_name } : {}),
  };
}
