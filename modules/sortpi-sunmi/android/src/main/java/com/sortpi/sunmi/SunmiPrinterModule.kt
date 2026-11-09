package com.sortpi.sunmi

import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.InnerResultCallback
import com.sunmi.peripheral.printer.SunmiPrinterService
import expo.modules.kotlin.exception.CodedException
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

class SunmiPrinterModule : Module() {
  private val printLock = Mutex()

  override fun definition() = ModuleDefinition {
    Name("SortPiSunmiPrinter")

    AsyncFunction("paperWidth") Coroutine { ->
      withPrinter { paperWidth(it) }
    }

    AsyncFunction("printerInfo") Coroutine { ->
      withPrinter { printer ->
        mapOf(
          "model" to runCatching { printer.printerModal }.getOrNull(),
          "width" to runCatching { paperWidth(printer) }.getOrNull(),
          "status" to printer.updatePrinterState()
        )
      }
    }

    AsyncFunction("setSegmentTotal") Coroutine { total: String? ->
      withPrinter { printer ->
        printer.sendLCDCommand(2) // Wake before updating or clearing the LCD.
        if (total == null) {
          printer.sendLCDCommand(4)
        } else {
          require(total.count { it != '.' } <= 7 && total.matches(Regex("[0-9]+(\\.[0-9]+)?")))
          printer.sendLCDDigital(total, null)
        }
      }
    }

    AsyncFunction("printPdf") Coroutine { uri: String, width: String ->
      printLock.withLock {
        withPrinter { printer ->
          check(paperWidth(printer) == width) { "The printer paper changed. Try again." }
          printPdf(printer, uri, width)
          true
        } ?: throw CodedException("ERR_SUNMI_PRINTER_505", "Built-in printer unavailable.", null)
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

    val status = printer.updatePrinterState()
    if (status != 1 && status != 8) {
      throw CodedException("ERR_SUNMI_PRINTER_$status", "Built-in printer status $status", null)
    }
    printer.enterPrinterBuffer(true)
    var submitted = false
    try {
      printer.setAlignment(1, callback)
      renderReceipt(uri, width) { printer.printBitmap(it, callback) }
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
