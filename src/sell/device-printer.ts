import { requireOptionalNativeModule } from 'expo';
import * as Device from 'expo-device';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import { PermissionsAndroid, Platform } from 'react-native';

import { bluetoothErrorText, parseSavedPrinter, serializePrinter, sortPaired, withViewport, type BluetoothPrinter, type PairedDevice } from './bluetooth-printer';
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

// A Bluetooth receipt printer, printed to directly (no system print dialog). Android: a printer paired in Android settings (Bluetooth Classic).
// iOS: a Bluetooth Low Energy printer found by scanning, since iOS apps cannot use Bluetooth Classic.
const bluetooth = Platform.OS === 'android' || Platform.OS === 'ios'
  ? requireOptionalNativeModule<{
      pairedPrinters(): Promise<PairedDevice[]>;
      printPdf(uri: string, width: Roll, address: string): Promise<boolean>;
    }>('SortPiBluetoothPrinter')
  : null;
const BLUETOOTH_KEY = 'sortpi.bluetooth.printer';

export const hasBluetoothPrinting = bluetooth !== null;
export const loadBluetoothPrinter = async () => parseSavedPrinter(await SecureStore.getItemAsync(BLUETOOTH_KEY));
export const setBluetoothPrinter = (printer: BluetoothPrinter | null) =>
  printer ? SecureStore.setItemAsync(BLUETOOTH_KEY, serializePrinter(printer)) : SecureStore.deleteItemAsync(BLUETOOTH_KEY);

/** Android 12 and later ask for "nearby devices" at run time. Earlier versions grant Bluetooth at install. */
export async function allowBluetooth(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function listPairedPrinters(): Promise<PairedDevice[]> {
  if (!bluetooth) return [];
  if (!(await allowBluetooth())) throw new BuiltInPrintError(bluetoothErrorText('ERR_BLUETOOTH_PERMISSION'));
  try {
    return sortPaired(await bluetooth.pairedPrinters());
  } catch (cause) {
    throw new BuiltInPrintError(bluetoothErrorText((cause as { code?: string } | null)?.code), { cause });
  }
}

/**
 * The receipt page as expo-print wants it. Android reads 165 as points of a 96 dpi page (about 220 CSS px, which fits the 214 px the slip is
 * designed for). iOS reads the same number as CSS px, so the slip is squeezed into a narrower page and prints about a third too big.
 * Scaling by 96/72 on iOS makes both phones lay the slip out at the same width.
 */
const cssPxPerPoint = Platform.OS === 'ios' ? 96 / 72 : 1;
const rollPage = (width: ReceiptWidth) => ({
  width: Math.round((width === '58mm' ? 165 : 227) * cssPxPerPoint),
  height: Math.round(720 * cssPxPerPoint),
});

async function printOverBluetooth(html: string, width: Roll, printer: BluetoothPrinter): Promise<void> {
  if (!bluetooth) throw new BuiltInPrintError(bluetoothErrorText('ERR_BLUETOOTH_UNAVAILABLE'));
  if (!(await allowBluetooth())) throw new BuiltInPrintError(bluetoothErrorText('ERR_BLUETOOTH_PERMISSION'));
  // The same page the built-in printers get, drawn to a PDF at the roll's width and printed as an image so Bangla and logos come out right.
  const page = Platform.OS === 'ios' ? withViewport(html) : html;
  const { uri } = await Print.printToFileAsync({ html: page, ...rollPage(width), textZoom: 100 });
  try {
    await bluetooth.printPdf(uri, width, printer.address);
  } catch (cause) {
    throw new BuiltInPrintError(bluetoothErrorText((cause as { code?: string } | null)?.code), { cause });
  } finally {
    try {
      new File(uri).delete();
    } catch {
      // The cached PDF can be removed later by the OS.
    }
  }
}

export async function printReceiptHtml(html: string, width: ReceiptWidth, builtIn: Roll | null): Promise<void> {
  // A Bluetooth printer the shop chose wins for roll paper. A4 still goes through Android printing.
  if (bluetooth && width !== 'a4') {
    const chosen = await loadBluetoothPrinter().catch(() => null);
    if (chosen) return printOverBluetooth(html, width, chosen);
  }
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
  const { uri } = await Print.printToFileAsync({ html, ...rollPage(width), textZoom: 100 });
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
