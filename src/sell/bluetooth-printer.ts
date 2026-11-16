// Pure Bluetooth-printer facts, kept apart from the native calls so they can be tested without the app's modules.

export type BluetoothPrinter = { name: string; address: string };
export type PairedDevice = BluetoothPrinter & { printer: boolean };

// Android gives a MAC address (AA:BB:CC:DD:EE:FF). iOS gives the printer's identifier, a UUID.
const ADDRESS = /^([0-9A-F]{2}(:[0-9A-F]{2}){5}|[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12})$/i;

/** The printer the shop chose, as stored. Anything unreadable counts as "none chosen" so printing falls back to Android. */
export function parseSavedPrinter(raw: string | null | undefined): BluetoothPrinter | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<BluetoothPrinter> | null;
    if (!value || typeof value.address !== 'string' || !ADDRESS.test(value.address)) return null;
    return { name: typeof value.name === 'string' && value.name.trim() ? value.name : value.address, address: value.address.toUpperCase() };
  } catch {
    return null;
  }
}

export function serializePrinter(printer: BluetoothPrinter): string {
  return JSON.stringify({ name: printer.name, address: printer.address.toUpperCase() });
}

/** Receipt printers first, then the other paired devices, each group by name. */
export function sortPaired(devices: PairedDevice[]): PairedDevice[] {
  return [...devices].sort((a, b) => Number(b.printer) - Number(a.printer) || a.name.localeCompare(b.name));
}

/** What a shopkeeper should read when a Bluetooth print fails, by the native error code. */
export function bluetoothErrorText(code: string | undefined): string {
  switch (code) {
    case 'ERR_BLUETOOTH_PERMISSION': return 'Allow Bluetooth for SortPi in your phone settings, then try again.';
    case 'ERR_BLUETOOTH_OFF': return 'Turn Bluetooth on, then try again.';
    case 'ERR_BLUETOOTH_UNAVAILABLE': return 'This device cannot print over Bluetooth.';
    case 'ERR_BLUETOOTH_CONNECT': return 'Could not reach the printer. Switch it on, keep it close to the phone, then try again.';
    default: return 'The receipt could not be sent to the Bluetooth printer. Check it and try again.';
  }
}

/**
 * iOS lays an HTML page out as if the screen were 980 px wide unless the page asks for its own width, then shrinks it to fit the roll,
 * so a page with no viewport tag prints tiny. The receipt built from the shop's design has the tag; the print-test sample and the
 * server's fallback receipt do not. Add it when it is missing.
 */
export function withViewport(html: string): string {
  if (/name\s*=\s*["']viewport["']/i.test(html)) return html;
  return `<meta name="viewport" content="width=device-width, initial-scale=1">${html}`;
}
