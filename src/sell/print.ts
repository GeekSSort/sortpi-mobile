import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { buildReceipt, type ReceiptShop } from '@/receipt/build';
import { renderSheetHtml } from '@/receipt/sheet';
import { renderSlipHtml } from '@/receipt/slip';
import { getSale } from '@/sales/api';
import { getCompany, resolvedSettings } from '@/settings/api';

import { receiptHtml } from './api';
import { fitToPaper, type ReceiptWidth } from './paper';
import { loadPaperPref } from './paper-pref';
import { printReceiptHtml, SunmiPrintError, sunmiPaperWidth } from './sunmi-printer';

/** Words for a receipt that would not print, in the shop's terms. */
export function printErrorText(e: unknown): string {
  if (e instanceof SunmiPrintError) return e.message;
  if (e instanceof ApiError) {
    if (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT') return 'No connection. Check the internet and try again.';
    if (e.status === 403 || e.code === 'PERMISSION_DENIED') return 'You do not have permission to print this receipt.';
    if (e.status === 404) return 'This sale could not be found.';
  }
  return 'The receipt could not be printed. Try again.';
}

type Who = { shopName: string; branchName?: string | null };

/**
 * The receipt the shop designed on the computer (Settings -> Invoice layout): the sale, the shop's details and its receipt settings
 * are read, then drawn with the same blocks the web prints. Someone who may not read the settings or the company record still gets the
 * built-in receipt with the shop's name.
 */
async function designedHtml(saleId: string, width: ReceiptWidth, who: Who): Promise<string> {
  const [sale, company, rows] = await Promise.all([getSale(saleId), getCompany().catch(() => null), resolvedSettings().catch(() => null)]);
  const shop: ReceiptShop = company ?? { name: who.shopName };
  const settings = rows ? Object.fromEntries(rows.map((r) => [r.key, r.value])) : null;
  const full = { sale, shop: { ...shop, name: shop.name || who.shopName }, settings, branchName: who.branchName };
  return width === 'a4' ? renderSheetHtml(buildReceipt({ ...full, layout: 'sheet' })) : renderSlipHtml(buildReceipt({ ...full, paper: width }));
}

/** Use the built-in printer for its configured roll size, or Android printing for other paper. */
export async function printReceipt(saleId: string, who: Who): Promise<void> {
  try {
    const builtIn = await sunmiPaperWidth();
    const width = await loadPaperPref(builtIn);
    let html: string;
    try {
      html = await designedHtml(saleId, width, who);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT')) throw e;
      html = fitToPaper(await receiptHtml(saleId, width), width); // anything else: the server's own receipt rather than none
    }
    await printReceiptHtml(html, width, builtIn);
  } catch (e) {
    Alert.alert('Receipt not printed', printErrorText(e));
  }
}

/** A sample receipt for checking the selected paper and printer without creating a sale. */
export async function printTestReceipt(): Promise<void> {
  try {
    const builtIn = await sunmiPaperWidth();
    const width = await loadPaperPref(builtIn);
    const label = width === 'a4' ? 'A4' : width.replace('mm', ' mm');
    const sample = `<!doctype html><html><meta charset="utf-8"><style>body{font:14px monospace;padding:4mm;box-sizing:border-box}h2{font-size:16px}hr{border:0;border-top:1px dashed}</style><body><h2>SortPi · Print test</h2><p>Paper: ${label}</p><hr><p>Sample item × 1</p><p>0123456789 · ABC abc</p><hr><p>Sample only</p></body></html>`;
    await printReceiptHtml(fitToPaper(sample, width), width, builtIn);
  } catch (e) {
    Alert.alert('Receipt not printed', printErrorText(e));
  }
}
