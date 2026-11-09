package com.sortpi.sunmi

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.InnerResultCallback
import com.sunmi.peripheral.printer.SunmiPrinterService
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import kotlin.math.ceil

class SunmiPrinterModule : Module() {
  private val printLock = Mutex()

  override fun definition() = ModuleDefinition {
    Name("SortPiSunmiPrinter")

    AsyncFunction("paperWidth") Coroutine { ->
      withPrinter { paperWidth(it) }
    }

    AsyncFunction("printPdf") Coroutine { uri: String, width: String ->
      printLock.withLock {
        withPrinter { printer ->
          check(paperWidth(printer) == width) { "The printer paper changed. Try again." }
          printPdf(printer, uri, width)
          true
        } ?: error("The built-in printer is unavailable.")
      }
    }
  }

  private suspend fun <T> withPrinter(block: suspend (SunmiPrinterService) -> T): T? =
    withContext(Dispatchers.IO) {
      val context = appContext.reactContext?.applicationContext ?: return@withContext null
      val manager = InnerPrinterManager.getInstance()
      val connection = CompletableDeferred<SunmiPrinterService>()
      val callback = object : InnerPrinterCallback() {
        override fun onConnected(service: SunmiPrinterService) { connection.complete(service) }
        override fun onDisconnected() { connection.cancel() }
      }
      if (!manager.bindService(context, callback)) return@withContext null
      try {
        val printer = withTimeoutOrNull(3_000) { connection.await() } ?: return@withContext null
        if (manager.hasPrinter(printer)) block(printer) else null
      } finally {
        runCatching { manager.unBindService(context, callback) }
      }
    }

  private fun paperWidth(printer: SunmiPrinterService): String? = when (printer.printerPaper) {
    0 -> "80mm"
    1 -> "58mm"
    else -> null
  }

  private suspend fun printPdf(printer: SunmiPrinterService, uri: String, width: String) {
    val path = requireNotNull(Uri.parse(uri).path)
    val dots = if (width == "58mm") 384 else 576
    val result = CompletableDeferred<Unit>()
    val callback = object : InnerResultCallback() {
      override fun onRunResult(success: Boolean) {
        if (!success) result.completeExceptionally(IllegalStateException("Printer rejected the receipt."))
      }
      override fun onReturnString(value: String?) = Unit
      override fun onRaiseException(code: Int, message: String?) {
        result.completeExceptionally(IllegalStateException("Printer error $code"))
      }
      override fun onPrintResult(code: Int, message: String?) {
        if (code == 0) result.complete(Unit)
        else result.completeExceptionally(IllegalStateException("Printer error $code"))
      }
    }

    check(printer.updatePrinterState() == 1) { "The built-in printer is not ready." }
    val descriptor = ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
    descriptor.use {
      PdfRenderer(descriptor).use { pdf ->
        printer.enterPrinterBuffer(true)
        var submitted = false
        try {
          printer.setAlignment(1, callback)
          for (index in 0 until pdf.pageCount) {
            pdf.openPage(index).use { page -> printPage(printer, page, dots, callback) }
          }
          printer.lineWrap(3, callback)
          if (width == "80mm" && runCatching { printer.cutPaperTimes >= 0 }.getOrDefault(false)) {
            printer.cutPaper(callback)
          }
          if (result.isCompleted) result.await()
          printer.exitPrinterBufferWithCallback(true, callback)
          submitted = true
          withTimeout(60_000) { result.await() }
        } finally {
          if (!submitted) runCatching { printer.exitPrinterBuffer(false) }
        }
      }
    }
  }

  private fun printPage(
    printer: SunmiPrinterService,
    page: PdfRenderer.Page,
    dots: Int,
    callback: InnerResultCallback
  ) {
    val scale = dots.toFloat() / page.width
    val height = ceil(page.height * scale).toInt()
    val stripeHeight = 192 // Keep bitmap binder payloads under the service's 1 MB limit.
    val scanline = IntArray(dots)
    var pendingBlankRows = 0
    for (top in 0 until height step stripeHeight) {
      val rows = minOf(stripeHeight, height - top)
      val bitmap = Bitmap.createBitmap(dots, rows, Bitmap.Config.ARGB_8888)
      try {
        bitmap.eraseColor(Color.WHITE)
        val transform = Matrix().apply {
          setScale(scale, scale)
          postTranslate(0f, -top.toFloat())
        }
        page.render(bitmap, null, transform, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
        var usedRows = rows
        while (usedRows > 0) {
          bitmap.getPixels(scanline, 0, dots, 0, usedRows - 1, dots, 1)
          if (scanline.any { it != Color.WHITE }) break
          usedRows--
        }
        if (usedRows > 0) {
          // Preserve interior whitespace while dropping unused paper below the last row.
          while (pendingBlankRows > 0) {
            val blankRows = minOf(pendingBlankRows, stripeHeight)
            val blank = Bitmap.createBitmap(dots, blankRows, Bitmap.Config.ARGB_8888)
            try {
              blank.eraseColor(Color.WHITE)
              printer.printBitmap(blank, callback)
            } finally {
              blank.recycle()
            }
            pendingBlankRows -= blankRows
          }
          val content = Bitmap.createBitmap(bitmap, 0, 0, dots, usedRows)
          try {
            printer.printBitmap(content, callback)
          } finally {
            if (content !== bitmap) content.recycle()
          }
        }
        pendingBlankRows += rows - usedRows
      } finally {
        bitmap.recycle()
      }
    }
  }
}
