import { compareMoney, subMoney, type Money } from '../lib/money.ts';
import type { LookupResponse } from './lookup-map.ts';

/** The shelf price of one thing, as a shop owner reads it at the shelf. */
export type PriceCheck = {
  variantId: string;
  name: string;
  sku: string;
  /** Per piece (or per kg): what one sells for in this branch, with any offer already in it. */
  price: Money;
  /** The printed price, only when it is higher than the selling price: then the customer is saving the difference. */
  mrp: Money | null;
  saving: Money | null;
  unitShort: string | null;
  allowDecimal: boolean;
  /** A carton or box whose own barcode was read: its name and what one sells for. */
  pack: { name: string; price: Money } | null;
};

type WithMrp = LookupResponse & { variant: LookupResponse['variant'] & { mrp?: string | null } };

/** `GET /products/lookup/` as a price check. The price is the server's, never worked out here. */
export function toPriceCheck(r: WithMrp): PriceCheck {
  const variantName = r.variant.name && r.variant.name.toLowerCase() !== 'default' && r.variant.name !== r.product.name ? ` ${r.variant.name}` : '';
  const mrp = r.variant.mrp && compareMoney(r.variant.mrp, r.price) > 0 ? r.variant.mrp : null;
  return {
    variantId: r.variant.id,
    name: `${r.product.name}${variantName}`.trim(),
    sku: r.variant.sku ?? '',
    price: r.price,
    mrp,
    saving: mrp ? subMoney(mrp, r.price) : null,
    unitShort: r.product.unit_short_name ?? null,
    allowDecimal: !!r.product.unit_allow_decimal,
    pack: r.unit && r.unit_price ? { name: r.unit.name, price: r.unit_price } : null,
  };
}

/** The words under a check that found nothing (the web till says the same: ask at the counter). */
export const notFoundText = (code: string) => ({ text: 'We could not find “{code}”. Please ask at the counter.', vars: { code: code.trim() } });
