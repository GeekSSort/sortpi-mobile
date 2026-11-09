import { requireOptionalNativeModule } from 'expo';
import * as Device from 'expo-device';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ReceiptWidth } from './paper';

type Roll = Exclude<ReceiptWidth, 'a4'>;
export const isSunmiAndroid = Platform.OS === 'android' && [Device.manufacturer, Device.brand]
  .some((name) => name?.trim().toLowerCase() === 'sunmi');

const printer = isSunmiAndroid
  ? requireOptionalNativeModule<{
      paperWidth(): Promise<Roll | null>;
      printPdf(uri: string, width: Roll): Promise<boolean>;
    }>('SortPiSunmiPrinter')
  : null;

const PRINTER_KEY = 'sortpi.sunmi.system-printing';

export const hasSunmiPrinterSupport = printer !== null;
export const loadSystemPrinting = async () => (await SecureStore.getItemAsync(PRINTER_KEY)) === 'true';
export const setSystemPrinting = (enabled: boolean) => SecureStore.setItemAsync(PRINTER_KEY, String(enabled));

export async function sunmiPaperWidth(): Promise<Roll | null> {
  return printer?.paperWidth().catch(() => null) ?? null;
}

export class SunmiPrintError extends Error {}

export async function printReceiptHtml(html: string, width: ReceiptWidth, builtIn: Roll | null): Promise<void> {
  if (!printer || width !== builtIn || await loadSystemPrinting().catch(() => false)) {
    await Print.printAsync({ html });
    return;
  }

  // Render the same receipt as Android printing, including custom blocks and non-Latin text.
  const { uri } = await Print.printToFileAsync({ html, width: width === '58mm' ? 165 : 227, height: 720, textZoom: 100 });
  try {
    await printer.printPdf(uri, width);
  } catch (cause) {
    throw new SunmiPrintError('Check the built-in printer and see whether the receipt came out before trying again.', { cause });
  } finally {
    try {
      new File(uri).delete();
    } catch {
      // The cached PDF can be removed later by the OS.
    }
  }
}
