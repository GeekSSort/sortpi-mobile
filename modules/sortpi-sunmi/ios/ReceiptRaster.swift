import CoreGraphics
import Foundation

/// Turns the receipt PDF into the rows of dots a thermal printer prints. Same idea as the Android `ReceiptRaster.kt`:
/// scale the page to the printer's width, drop the blank paper below the last line, keep the blank space between pages.
enum ReceiptRaster {
  /// 0 is black, 255 is white. Higher prints bolder. Thin receipt text shrinks to light grey on a 58 mm roll.
  static let darknessCutoff: UInt8 = 200

  /// Dots across the print head: 384 for a 58 mm roll, 576 for 80 mm.
  static func headDots(for width: String) -> Int { width == "58mm" ? 384 : 576 }

  /// One entry per row of dots, each `headDots / 8` bytes, with `sideMargin` blank dots on the left and the right.
  static func rows(uri: String, width: String, sideMargin: Int) throws -> [[UInt8]] {
    guard let url = URL(string: uri), let document = CGPDFDocument(url as CFURL), document.numberOfPages > 0 else {
      throw BluetoothPrintException("The receipt file could not be read.")
    }
    let head = headDots(for: width)
    let content = head - 2 * sideMargin
    let rowBytes = head / 8
    var result: [[UInt8]] = []
    var pendingBlankRows = 0

    for index in 1...document.numberOfPages {
      guard let page = document.page(at: index) else { continue }
      let box = page.getBoxRect(.mediaBox)
      guard box.width > 0, box.height > 0 else { continue }
      NSLog("[SortPiBLE] pdf page %d: %.1f x %.1f points", index, box.width, box.height) // TEMPORARY
      let scale = CGFloat(content) / box.width
      let height = Int((box.height * scale).rounded(.up))
      guard let context = CGContext(
        data: nil, width: content, height: height, bitsPerComponent: 8, bytesPerRow: content,
        space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue
      ) else { throw BluetoothPrintException("The receipt could not be drawn.") }
      context.setFillColor(gray: 1, alpha: 1)
      context.fill(CGRect(x: 0, y: 0, width: content, height: height))
      context.concatenate(page.getDrawingTransform(.mediaBox, rect: CGRect(x: 0, y: 0, width: content, height: height), rotate: 0, preserveAspectRatio: true))
      context.drawPDFPage(page)
      guard let data = context.data else { continue }
      let pixels = data.bindMemory(to: UInt8.self, capacity: content * height)

      // Row 0 is the top of the page. Find the last row with ink.
      var used = height
      while used > 0 {
        let start = (used - 1) * content
        var blank = true
        for x in 0..<content where pixels[start + x] < 250 { blank = false; break }
        if !blank { break }
        used -= 1
      }
      if used > 0 {
        result.append(contentsOf: [[UInt8]](repeating: [UInt8](repeating: 0, count: rowBytes), count: pendingBlankRows))
        pendingBlankRows = 0
        for y in 0..<used {
          var row = [UInt8](repeating: 0, count: rowBytes)
          let start = y * content
          for x in 0..<content where pixels[start + x] < darknessCutoff {
            let dot = sideMargin + x
            row[dot >> 3] |= UInt8(0x80 >> (dot & 7))
          }
          result.append(row)
        }
      }
      pendingBlankRows += height - used
    }
    return result
  }
}
