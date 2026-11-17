/**
 * The barcode printed on a receipt is the invoice number drawn as a barcode (see src/receipt/barcode.ts), so scanning it where products are
 * scanned looks like a barcode nobody has: a branch code with the year, a dash and a running number, such as MAIN26-24.
 * These two rules let a scan screen tell "this is an invoice" from "this is a product that is not in the catalogue".
 */

/** Could this text be an invoice number? Letters first and a dash before the digits, which no EAN or UPC barcode has. A check only: the shop must still have that invoice. */
export function looksLikeInvoiceNumber(code: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]{1,9}-\d{1,9}$/.test(code.trim());
}

/** The sale among `rows` whose invoice number is exactly `code` (ignoring capitals), or null. A search also returns near matches, which must not count. */
export function pickInvoice<T extends { invoice_number: string }>(rows: readonly T[], code: string): T | null {
  const want = code.trim().toLowerCase();
  return rows.find((r) => r.invoice_number.trim().toLowerCase() === want) ?? null;
}
