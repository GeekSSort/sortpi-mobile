import type { Purchase, PurchaseItemRow } from './api.ts';
import type { Line } from './logic.ts';

type Perms = readonly string[] | undefined;
const has = (p: Perms, c: string) => !!p?.includes(c);

/** A draft, or a placed order nothing has arrived on, can be changed in full (the server refuses anything else). */
export function canEditPurchase(p: Pick<Purchase, 'status' | 'items'>, perms: Perms): boolean {
  if (!has(perms, 'purchase.update')) return false;
  if (p.status === 'DRAFT') return true;
  return p.status === 'CONFIRMED' && p.items.every((i) => Number(i.received_quantity) === 0);
}
/** Only a draft can be deleted; a placed order is cancelled instead. */
export const canDeleteDraft = (p: Pick<Purchase, 'status'>, perms: Perms): boolean => p.status === 'DRAFT' && has(perms, 'purchase.delete');

/** A saved line back into the form. Quantity and cost are shown as plain numbers. */
export const lineFromItem = (i: PurchaseItemRow): Line => ({
  variantId: i.variant,
  name: i.variant_name && i.variant_name !== i.product_name ? `${i.product_name} ${i.variant_name}` : i.product_name,
  sku: i.sku,
  unitShort: i.unit_short_name || null,
  allowDecimal: i.unit_allow_decimal,
  quantity: String(Number(i.quantity)),
  unitCost: String(Number(i.unit_cost)),
});

/**
 * Body for PATCH /purchases/{id}/. The server REPLACES the lines, and a line sent without its `tax_rate` loses its tax (checked live),
 * so each line that was already on the order keeps its tax, discount, batch and expiry; a new line has none.
 */
export function editBody(o: { lines: Line[]; before: PurchaseItemRow[]; invoiceNo: string; note: string }) {
  const old = new Map(o.before.map((i) => [i.variant, i]));
  return {
    supplier_invoice_no: o.invoiceNo.trim(),
    note: o.note.trim(),
    items: o.lines.map((l) => {
      const b = old.get(l.variantId);
      return {
        variant: l.variantId,
        quantity: l.quantity.trim(),
        unit_cost: l.unitCost.trim(),
        ...(b?.tax_rate ? { tax_rate: b.tax_rate } : {}),
        ...(b?.discount_amount && Number(b.discount_amount) > 0 ? { discount_amount: b.discount_amount } : {}),
        ...(b?.batch_no ? { batch_no: b.batch_no } : {}),
        ...(b?.expiry_date ? { expiry_date: b.expiry_date } : {}),
      };
    }),
  };
}
