import { requireOptionalNativeModule } from 'expo';
import * as Device from 'expo-device';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ReceiptWidth } from './paper';
import { posDevice } from './pos-device';
import { receiptPrinterRoute, sunmiPrintRecovery } from './printer-status';

type PrinterInfo = { model: string | null; width: Roll | null; status: number };
type Roll = Exclude<ReceiptWidth, 'a4'>;
export const androidPosDevice = posDevice(Platform.OS === 'android', Device.manufacturer, Device.brand, Device.modelName);

const nativeModule = androidPosDevice?.name === 'SUNMI' ? 'SortPiSunmiPrinter'
  : androidPosDevice?.name === 'iMin' ? 'SortPiIminPrinter'
  : androidPosDevice?.name === 'Urovo' && androidPosDevice.suggestedPaper ? 'SortPiUrovoPrinter'
  : undefined;
const printer = nativeModule
  ? requireOptionalNativeModule<{
      paperWidth(): Promise<Roll | null>;
      printerInfo?(): Promise<PrinterInfo | null>;
      printPdf(uri: string, width: Roll): Promise<boolean>;
    }>(nativeModule)
  : null;

const PRINTER_KEY = 'sortpi.sunmi.system-printing';

export const hasBuiltInPrinterSupport = printer !== null;
export const loadSystemPrinting = async () => (await SecureStore.getItemAsync(PRINTER_KEY)) === 'true';
export const setSystemPrinting = (enabled: boolean) => SecureStore.setItemAsync(PRINTER_KEY, String(enabled));

export async function builtInPaperWidth(): Promise<Roll | null> {
  return printer?.paperWidth().catch(() => null) ?? null;
}

export const hasSunmiDiagnostics = !!printer?.printerInfo && androidPosDevice?.name === 'SUNMI';
export async function loadSunmiPrinterInfo(): Promise<PrinterInfo | null> {
  return printer?.printerInfo?.().catch(() => null) ?? null;
}

export class BuiltInPrintError extends Error {}

export async function printReceiptHtml(html: string, width: ReceiptWidth, builtIn: Roll | null): Promise<void> {
  const route = receiptPrinterRoute(width, builtIn, {
    native: !!printer,
    sunmi: hasSunmiDiagnostics,
    useSystem: !!printer && width !== 'a4' && await loadSystemPrinting().catch(() => false),
  });
  if (route === 'check-sunmi') {
    const info = await loadSunmiPrinterInfo();
    const message = sunmiPrintRecovery(info?.status);
    if (message) throw new BuiltInPrintError(message);
  }
  if (!printer || !builtIn || route !== 'built-in') {
    await Print.printAsync({ html });
    return;
  }

  // Render the same receipt as Android printing, including custom blocks and non-Latin text.
  const { uri } = await Print.printToFileAsync({ html, width: width === '58mm' ? 165 : 227, height: 720, textZoom: 100 });
  try {
    await printer.printPdf(uri, builtIn);
  } catch (cause) {
    const code = (cause as { code?: string } | null)?.code;
    const status = /^ERR_SUNMI_PRINTER_(\d+)$/.exec(code ?? '')?.[1];
    const recovery = status ? sunmiPrintRecovery(Number(status)) : undefined;
    throw new BuiltInPrintError(recovery ?? 'Check the built-in printer and see whether the receipt came out before trying again.', { cause });
  } finally {
    try {
      new File(uri).delete();
    } catch {
      // The cached PDF can be removed later by the OS.
    }
  }
}
