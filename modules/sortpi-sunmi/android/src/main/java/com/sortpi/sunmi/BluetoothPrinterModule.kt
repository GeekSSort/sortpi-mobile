package com.sortpi.sunmi

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

/**
 * Prints a receipt to a paired Bluetooth receipt printer (ESC/POS over the serial profile), without Android's print dialog.
 * The receipt arrives as the same PDF the built-in printers use, so Bangla text, the logo and custom blocks print as the shop designed them.
 */
class BluetoothPrinterModule : Module() {
  private val printerLock = Mutex()

  override fun definition() = ModuleDefinition {
    Name("SortPiBluetoothPrinter")

    // Paired devices, receipt printers first. Needs the Bluetooth permission on Android 12 and later.
    AsyncFunction("pairedPrinters") {
      val adapter = requireAdapter()
      @SuppressLint("MissingPermission")
      val devices = adapter.bondedDevices.orEmpty().map { device ->
        mapOf(
          "name" to (device.name ?: device.address),
          "address" to device.address,
          "printer" to (device.bluetoothClass?.majorDeviceClass == BluetoothClass.Device.Major.IMAGING),
        )
      }
      devices.sortedWith(compareByDescending<Map<String, Any>> { it["printer"] as Boolean }.thenBy { it["name"] as String })
    }

    AsyncFunction("printPdf") Coroutine { uri: String, width: String, address: String ->
      printerLock.withLock {
        withContext(Dispatchers.IO) {
         try {
          val adapter = requireAdapter()
          require(BluetoothAdapter.checkBluetoothAddress(address)) { "That is not a Bluetooth address." }
          @SuppressLint("MissingPermission")
          val device = adapter.getRemoteDevice(address)
          // No cancelDiscovery(): it needs the separate scan permission on Android 12+, and SortPi only uses paired devices, never scans.
          val socket = connect(device)
          try {
            val out = socket.outputStream
            out.write(byteArrayOf(0x1B, 0x40)) // ESC @: reset the printer
            out.write(byteArrayOf(0x1B, 0x4A, TOP_MARGIN_DOTS.toByte())) // ESC J n: a little blank paper above the header
            var rows = 0
            var stripes = 0
            val headDots = if (width == "58mm") 384 else 576
            renderReceipt(uri, width, SIDE_MARGIN_DOTS) { bitmap ->
              sendStripe(out, bitmap, headDots)
              rows += bitmap.height
              stripes++
            }
            check(rows > 0) { "The receipt was empty." }
            // The receipt's own bottom margin is trimmed, so feed enough paper (ESC J n: n dots, ~12 mm) for the last line to clear the tear bar.
            out.write(byteArrayOf(0x1B, 0x4A, FEED_DOTS.toByte()))
            Log.i(TAG, "Sent $rows rows in $stripes stripes")
            out.flush()
            Thread.sleep(2000) // Closing at once can drop the last bytes still in the printer's buffer.
          } finally {
            runCatching { socket.close() }
          }
          true
         } catch (error: CodedException) {
          Log.e(TAG, "Bluetooth print failed: ${error.code}", error)
          throw error
         } catch (error: Throwable) {
          Log.e(TAG, "Bluetooth print failed", error)
          throw CodedException("ERR_BLUETOOTH_PRINT", "${error.javaClass.simpleName}: ${error.message}", error)
         }
        }
      }
    }
  }

  private fun requireAdapter(): BluetoothAdapter {
    val context = requireNotNull(appContext.reactContext) { "The app is not ready." }
    val needed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Manifest.permission.BLUETOOTH_CONNECT else Manifest.permission.BLUETOOTH
    if (ContextCompat.checkSelfPermission(context, needed) != PackageManager.PERMISSION_GRANTED) {
      throw CodedException("ERR_BLUETOOTH_PERMISSION", "Bluetooth permission is needed to find the printer.", null)
    }
    val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      ?: throw CodedException("ERR_BLUETOOTH_UNAVAILABLE", "This device has no Bluetooth.", null)
    if (!adapter.isEnabled) throw CodedException("ERR_BLUETOOTH_OFF", "Bluetooth is turned off.", null)
    return adapter
  }

  @SuppressLint("MissingPermission")
  private fun connect(device: android.bluetooth.BluetoothDevice): BluetoothSocket {
    return try {
      device.createRfcommSocketToServiceRecord(SERIAL_PORT).also { it.connect() }
    } catch (_: IOException) {
      try {
        device.createInsecureRfcommSocketToServiceRecord(SERIAL_PORT).also { it.connect() }
      } catch (cause: IOException) {
        throw CodedException("ERR_BLUETOOTH_CONNECT", "Could not connect to the printer. Check it is on and close to the phone.", cause)
      }
    }
  }

  // Cheap printers have a small buffer and give no "slow down" signal. Sending the image as many small commands means a hiccup
  // can only spoil one block, and pausing for roughly the time each block takes to print keeps the buffer from overflowing.
  private fun sendStripe(out: OutputStream, bitmap: Bitmap, headDots: Int) {
    var top = 0
    while (top < bitmap.height) {
      val rows = minOf(BLOCK_ROWS, bitmap.height - top)
      out.write(raster(bitmap, top, rows, headDots))
      out.flush()
      Thread.sleep(rows * ROW_MS)
      top += rows
    }
  }

  /** GS v 0: a few rows of the receipt as a 1-bit raster image, dark pixels printed. */
  private fun raster(bitmap: Bitmap, top: Int, height: Int, headDots: Int): ByteArray {
    val width = bitmap.width
    val offset = (headDots - width) / 2 // the same blank margin on the left and the right, so the receipt sits in the middle of the roll
    val rowBytes = (headDots + 7) / 8
    val out = ByteArrayOutputStream(8 + rowBytes * height)
    out.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00, (rowBytes and 0xFF).toByte(), (rowBytes shr 8).toByte(), (height and 0xFF).toByte(), (height shr 8).toByte()))
    val row = IntArray(width)
    for (y in top until top + height) {
      bitmap.getPixels(row, 0, width, 0, y, width, 1)
      for (byteIndex in 0 until rowBytes) {
        var value = 0
        for (bit in 0 until 8) {
          val x = byteIndex * 8 + bit - offset
          if (x in 0 until width) {
            val pixel = row[x]
            val luminance = 0.299 * Color.red(pixel) + 0.587 * Color.green(pixel) + 0.114 * Color.blue(pixel)
            // Thin receipt text shrinks to light grey on a 58 mm roll, so anything under pale grey is printed dark.
            if (Color.alpha(pixel) > 127 && luminance < DARKNESS_CUTOFF) value = value or (0x80 shr bit)
          }
        }
        out.write(value)
      }
    }
    return out.toByteArray()
  }

  private companion object {
    val SERIAL_PORT: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    const val BLOCK_ROWS = 24
    const val SIDE_MARGIN_DOTS = 16 // about 2 mm each side on a 203 dpi head
    const val TOP_MARGIN_DOTS = 48 // about 6 mm
    const val FEED_DOTS = 100 // about 12 mm on a 203 dpi head
    const val ROW_MS = 4L // about 250 rows a second, slower than a small thermal head prints
    const val DARKNESS_CUTOFF = 200 // 0 is black, 255 is white. Higher prints bolder.
    const val TAG = "SortPiBluetooth"
  }
}
