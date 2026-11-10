import { ApiError } from '../api/client.ts';

/** Words a cashier can act on for the ways ringing up a sale can fail (codes from the server's registry). */
export function describeSellError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (error.code) {
    case 'INSUFFICIENT_STOCK':
      return 'Not enough stock for one of the items. Nothing was sold. To sell goods that are finished, a manager can turn on “Allow selling more than is in stock” in Shop settings.';
    case 'NO_PRICE_DEFINED':
      return 'One item has no price in this branch. Ask your manager to set it.';
    case 'NO_OPEN_SHIFT':
    case 'SHIFT_REQUIRED':
      return 'Open your shift first.';
    case 'PAYMENT_EXCEEDS_TOTAL':
      return 'The payment is more than the sale is worth.';
    case 'WALK_IN_MUST_PAY_IN_FULL':
      return 'A walk-in customer must pay in full.';
    case 'DECIMAL_QUANTITY_NOT_ALLOWED':
      return 'One item cannot be sold in parts. Use a whole number.';
    case 'COUNTER_IN_USE':
      return 'Somebody else is using that counter. Pick another one.';
    case 'SHIFT_ALREADY_OPEN':
      return 'You already have the day open on this phone.';
    case 'SERIALS_REQUIRED':
      return 'Each unit of a serial-numbered item needs its own number. Check the numbers and try again.';
    case 'SERIAL_NOT_FOUND':
      return 'One of the serial numbers is not in stock here. Check it and try again.';
    case 'SERIAL_ALREADY_SOLD':
      return 'One of the serial numbers was already sold.';
    case 'SERIAL_ELSEWHERE':
      return 'One of the serial numbers is in another place, not this shelf.';
    case 'DUPLICATE_SERIAL':
    case 'TOO_MANY_SERIALS':
      return 'A serial number is repeated, or there are more numbers than units.';
    case 'INVALID_SERIAL':
      return 'One of the serial numbers is not valid.';
    case 'NOT_SERIAL_TRACKED':
      return 'One of the items is not sold by serial number. Remove its numbers.';
    case 'SERIAL_QUANTITY_NOT_WHOLE':
      return 'An item sold by serial number must be sold in whole units.';
    case 'GIFT_CARD_NOT_FOUND':
      return 'No gift card has that code. Check it and try again.';
    case 'GIFT_CARD_INACTIVE':
      return 'That gift card was voided and cannot be used.';
    case 'GIFT_CARD_EXPIRED':
      return 'That gift card has expired.';
    case 'GIFT_CARD_BALANCE':
      return 'The gift card does not have enough left for this payment. Nothing was sold.';
    case 'GIFT_CARD_SALE_CANCEL':
      return 'A sale paid with a gift card cannot be cancelled. Return the goods instead.';
    case 'DUPLICATE_REFERENCE':
      return 'This cart was already put on hold.';
    case 'SALE_ALREADY_CANCELLED':
      return 'This sale was already cancelled.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'IDEMPOTENCY_KEY_REUSED':
    case 'REQUEST_IN_PROGRESS':
      return 'The sale is still being processed. Wait a moment and check before trying again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. The sale may not have gone through. Tap Confirm again: it will not charge twice.';
    default:
      return error.message || 'Could not complete the sale.';
  }
}

/**
 * What the till says when a code finds no product. Same words as the web till (saas/client
 * components/modules/pos/ScanResult.tsx and ProductGrid.tsx), so a cashier sees one message everywhere.
 */
export const NOT_IN_CATALOGUE_TITLE = 'Not in the catalogue';
export const LOOKUP_FAILED_TITLE = 'That scan could not be looked up';

/** English text key plus the code to fill in, so the screen can translate the sentence and then insert the code. */
export function notInCatalogueText(scanned: boolean, code: string): { text: string; vars?: { code: string } } {
  // A scanner read the code cleanly. A typed entry may just be a typo.
  return scanned ? { text: 'The scanner read it cleanly — no product carries this barcode yet.' } : { text: 'No product with the code “{code}”.', vars: { code } };
}
