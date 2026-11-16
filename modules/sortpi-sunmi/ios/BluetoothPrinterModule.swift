import ExpoModulesCore

// Error codes come from these class names: ERR_BLUETOOTH_OFF, ERR_BLUETOOTH_PERMISSION, ... (the JS side turns them into plain words).
internal final class BluetoothOffException: Exception {
  override var reason: String { "Bluetooth is turned off." }
}

internal final class BluetoothPermissionException: Exception {
  override var reason: String { "Bluetooth permission is needed to find the printer." }
}

internal final class BluetoothUnavailableException: Exception {
  override var reason: String { "This device cannot use Bluetooth." }
}

internal final class BluetoothConnectException: Exception {
  override var reason: String { "Could not connect to the printer. Check it is on and close to the phone." }
}

internal final class BluetoothPrintException: GenericException<String> {
  override var reason: String { param }
}

/// Prints a receipt to a Bluetooth Low Energy receipt printer (ESC/POS), without the system print dialog.
/// Same two calls as the Android module, so the JavaScript is shared. On iOS `address` is the printer's identifier (a UUID).
public class BluetoothPrinterModule: Module {
  /// Blank dots kept on each side so the receipt sits in the middle of the roll and away from the head's edges.
  private let sideMargin = 16
  /// A little blank paper above the header, and enough feed after the footer to clear the tear bar (ESC J n: n dots).
  private let topMarginDots: UInt8 = 48
  private let feedDots: UInt8 = 100
  /// Rows per raster command. Small commands mean a hiccup spoils only a few millimetres.
  private let blockRows = 24
  /// Pause per row after each block: about 250 rows a second, slower than a small thermal head prints.
  private let rowPauseNanos: UInt64 = 4_000_000

  public func definition() -> ModuleDefinition {
    Name("SortPiBluetoothPrinter")

    // Printers within reach, receipt printers first. BLE has no "paired" list for apps, so this scans for several seconds.
    AsyncFunction("pairedPrinters") { () async throws -> [[String: Any]] in
      let link = BlePrinterLink()
      try await link.ensurePoweredOn()
      let found = await link.scan(seconds: 8)
      let sorted = found.sorted { a, b in
        a.isPrinter != b.isPrinter ? a.isPrinter : a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
      }
      return sorted.map { ["name": $0.name, "address": $0.id.uuidString, "printer": $0.isPrinter] }
    }

    AsyncFunction("printPdf") { (uri: String, width: String, address: String) async throws -> Bool in
      guard let id = UUID(uuidString: address) else { throw BluetoothConnectException() }

      // Draw the receipt first: if the file is bad, fail before touching the printer.
      let rows = try ReceiptRaster.rows(uri: uri, width: width, sideMargin: self.sideMargin)
      NSLog("[SortPiBLE] print: %d rows drawn for %@", rows.count, address)
      // TEMPORARY: save the exact picture sent to the printer so it can be looked at (1 byte per dot, PGM).
      do {
        let headDots = ReceiptRaster.headDots(for: width)
        var pgm = Data("P5\n\(headDots) \(rows.count)\n255\n".utf8)
        for row in rows { for x in 0..<headDots { pgm.append((row[x >> 3] & UInt8(0x80 >> (x & 7))) != 0 ? 0 : 255) } }
        let file = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("last-receipt.pgm")
        try pgm.write(to: file)
        NSLog("[SortPiBLE] saved picture %dx%d to %@", headDots, rows.count, file.path)
      } catch { NSLog("[SortPiBLE] could not save picture: %@", error.localizedDescription) }
      guard !rows.isEmpty else { throw BluetoothPrintException("The receipt was empty.") }
      let rowBytes = ReceiptRaster.headDots(for: width) / 8

      let link = BlePrinterLink()
      try await link.ensurePoweredOn()
      try await link.connect(id: id)
      NSLog("[SortPiBLE] print: connected and ready, sending")
      defer { link.disconnect() }

      try await link.send(Data([0x1B, 0x40]))                  // ESC @: reset the printer
      try await link.send(Data([0x1B, 0x4A, self.topMarginDots]))
      var top = 0
      while top < rows.count {
        let count = min(self.blockRows, rows.count - top)
        var block = Data([0x1D, 0x76, 0x30, 0x00, UInt8(rowBytes & 0xFF), UInt8(rowBytes >> 8), UInt8(count & 0xFF), UInt8(count >> 8)])
        for row in rows[top..<(top + count)] { block.append(contentsOf: row) }
        try await link.send(block)
        try await Task.sleep(nanoseconds: UInt64(count) * self.rowPauseNanos)
        top += count
      }
      try await link.send(Data([0x1B, 0x4A, self.feedDots]))
      try await Task.sleep(nanoseconds: 2_000_000_000)         // closing at once can drop the last bytes still in the printer's buffer
      return true
    }
  }
}
