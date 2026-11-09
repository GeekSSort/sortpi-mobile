package com.sortpi.sunmi

import android.graphics.Bitmap
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

class UrovoPrinterModule : Module() {
  private val printerLock = Mutex()

  override fun definition() = ModuleDefinition {
    Name("SortPiUrovoPrinter")

    AsyncFunction("paperWidth") {
      if (printerClass() == null) null else "58mm" // Urovo i9100 uses a fixed 58 mm roll.
    }

    AsyncFunction("printPdf") Coroutine { uri: String, width: String ->
      printerLock.withLock {
        withContext(Dispatchers.IO) {
          require(width == "58mm")
          val type = requireNotNull(printerClass())
          val printer = type.getConstructor().newInstance()
          check(type.getMethod("open").invoke(printer) == 0) { "Could not open the built-in printer." }
          try {
            check(type.getMethod("getStatus").invoke(printer) == 0) { "The built-in printer is not ready." }
            val int = Int::class.javaPrimitiveType
            val setup = type.getMethod("setupPage", int, int)
            val draw = type.getMethod("drawBitmap", Bitmap::class.java, int, int)
            var offset = 0
            check(setup.invoke(printer, 384, -1) == 0) { "Could not prepare the receipt." }
            renderReceipt(uri, width) { bitmap ->
              check((draw.invoke(printer, bitmap, 0, offset) as Int) >= 0) { "Could not prepare the receipt." }
              offset += bitmap.height
            }
            check(offset > 0 && type.getMethod("printPage", int).invoke(printer, 0) == 0) { "Could not print the receipt." }
            type.getMethod("paperFeed", int).invoke(printer, 16)
          } finally {
            runCatching { type.getMethod("close").invoke(printer) }
          }
          true
        }
      }
    }
  }

  // PrinterManager is part of Urovo's device firmware. AOSP devices do not contain it.
  private fun printerClass(): Class<*>? = try {
    Class.forName("android.device.PrinterManager")
  } catch (_: ClassNotFoundException) {
    null
  }
}
