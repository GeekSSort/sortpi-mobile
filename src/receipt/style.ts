// How a shop's receipt looks, as Settings -> Invoice layout stores it. Ported from the web app (saas/client/src/lib/receiptStyle.ts) so a
// phone prints the same paper the computer does. Every default is what the receipt printed before the setting existed.

export type ReceiptPaper = '80mm' | '58mm';
export type ReceiptFontSize = 'small' | 'normal' | 'large';

export interface ReceiptStyle {
  layout: 'slip' | 'sheet';
  paper: ReceiptPaper;
  fontSize: ReceiptFontSize;
  showLogo: boolean;
  showTagline: boolean;
  showAddress: boolean;
  showBin: boolean;
  showCustomer: boolean;
  showBarcode: boolean;
  showPhoneLine: boolean;
  showReturnPolicy: boolean;
  saleTitle: string;
  headerText: string;
  noteText: string;
  thankYou: string;
  footerText: string;
  returnDays: number;
  slipBlocks: string;
  sheetBlocks: string;
  labels: string;
}

export const DEFAULT_RECEIPT_STYLE: ReceiptStyle = {
  layout: 'slip',
  paper: '80mm',
  fontSize: 'normal',
  showLogo: false,
  showTagline: true,
  showAddress: true,
  showBin: true,
  showCustomer: true,
  showBarcode: false,
  showPhoneLine: true,
  showReturnPolicy: true,
  saleTitle: 'SALES INVOICE',
  headerText: '',
  noteText: 'To enjoy special discount, please register as a VIP Member.',
  thankYou: 'Thank you for shopping with {shop}',
  footerText: '',
  returnDays: 7,
  slipBlocks: '',
  sheetBlocks: '',
  labels: '',
};

/** The shop's settings (key -> value, as `GET /settings/resolved/` gives them), read into one style. A missing key keeps its default. */
export function readReceiptStyle(values: Record<string, unknown> | null | undefined): ReceiptStyle {
  const v = values ?? {};
  const d = DEFAULT_RECEIPT_STYLE;
  const flag = (key: string, fallback: boolean) => (v[key] === undefined || v[key] === null ? fallback : String(v[key]) === 'true');
  const text = (key: string, fallback: string) => (v[key] === undefined || v[key] === null ? fallback : String(v[key]));
  const days = Number(v['sale.return_window_days']);
  const size = String(v['receipt.font_size'] ?? '');
  return {
    layout: String(v['receipt.layout'] ?? 'slip') === 'sheet' ? 'sheet' : 'slip',
    paper: String(v['pos.receipt_width'] ?? '') === '58mm' ? '58mm' : '80mm',
    fontSize: size === 'small' || size === 'large' ? size : 'normal',
    showLogo: flag('receipt.show_logo', d.showLogo),
    showTagline: flag('receipt.show_tagline', d.showTagline),
    showAddress: flag('receipt.show_address', d.showAddress),
    showBin: flag('receipt.show_bin', d.showBin),
    showCustomer: flag('receipt.show_customer', d.showCustomer),
    showBarcode: flag('receipt.show_barcode', d.showBarcode),
    showPhoneLine: flag('receipt.show_phone_line', d.showPhoneLine),
    showReturnPolicy: flag('receipt.show_return_policy', d.showReturnPolicy),
    saleTitle: text('receipt.sale_title', d.saleTitle) || d.saleTitle,
    headerText: text('receipt.header_text', d.headerText),
    noteText: text('receipt.note_text', d.noteText),
    thankYou: text('receipt.thank_you', d.thankYou),
    footerText: text('sale.invoice_footer_text', d.footerText),
    returnDays: Number.isFinite(days) && days >= 0 ? Math.round(days) : d.returnDays,
    slipBlocks: text('receipt.slip_blocks', ''),
    sheetBlocks: text('receipt.sheet_blocks', ''),
    labels: text('receipt.labels', ''),
  };
}

/** How much the slip's text is scaled for each size. */
export const RECEIPT_ZOOM: Record<ReceiptFontSize, number> = { small: 0.9, normal: 1, large: 1.15 };
