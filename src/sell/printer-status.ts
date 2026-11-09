import type { ReceiptWidth } from './paper.ts';

export function receiptPrinterRoute(
  width: ReceiptWidth,
  builtIn: ReceiptWidth | null,
  options: { native: boolean; sunmi: boolean; useSystem: boolean },
) {
  if (width === 'a4' || !options.native || options.useSystem) return 'android';
  if (width === builtIn) return 'built-in';
  return builtIn === null && options.sunmi ? 'check-sunmi' : 'android';
}

export function sunmiPrinterStatus(status?: number | null): string {
  switch (status) {
    case 1:
    case 8: return 'Ready';
    case 2: return 'Warming up';
    case 4: return 'Out of paper';
    case 5: return 'Overheated';
    case 6: return 'Cover open';
    case 7: return 'Cutter error';
    case 3:
    case 505:
    case null:
    case undefined: return 'Unavailable';
    default: return 'Needs attention';
  }
}

export function sunmiPrintRecovery(status?: number | null): string | undefined {
  switch (status) {
    case 1:
    case 8: return undefined;
    case 2: return 'Wait for the built-in printer to warm up, then try again.';
    case 4: return 'Load a receipt roll in the built-in printer, then try again.';
    case 5: return 'Let the built-in printer cool down, then try again.';
    case 6: return 'Close the built-in printer cover, then try again.';
    case 7: return 'Check the built-in printer cutter, then try again.';
    default: return 'The built-in printer is unavailable. For an external printer, turn on Android printing in Settings.';
  }
}
