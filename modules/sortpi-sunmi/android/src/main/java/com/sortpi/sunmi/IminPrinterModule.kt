package com.sortpi.sunmi

import com.imin.printer.INeoPrinterCallback
import com.imin.printer.InitPrinterCallback
import com.imin.printer.PrinterHelper
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

class IminPrinterModule : Module() {
  private val serviceLock = Mutex() // PrinterHelper has a single connection per process.

  override fun definition() = ModuleDefinition {
    Name("SortPiIminPrinter")

    AsyncFunction("paperWidth") Coroutine { ->
      withPrinter { paperWidth(it) }
    }

    AsyncFunction("printPdf") Coroutine { uri: String, width: String ->
      withPrinter { printer ->
        check(paperWidth(printer) == width) { "The printer paper changed. Try again." }
        check(printer.printerStatus == 0) { "The built-in printer is not ready." }

        val result = CompletableDeferred<Unit>()
        val callback = object : INeoPrinterCallback() {
          override fun onRunResult(success: Boolean) {
            if (!success) result.completeExceptionally(IllegalStateException("Printer rejected the receipt."))
          }
          override fun onReturnString(value: String?) = Unit
          override fun onRaiseException(code: Int, message: String?) {
            result.completeExceptionally(IllegalStateException("Printer error $code"))
          }
          override fun onPrintResult(code: Int, message: String?) {
            if (code == 1) result.complete(Unit)
            else result.completeExceptionally(IllegalStateException("Printer error $code"))
          }
        }

        printer.enterPrinterBuffer(true)
        var submitted = false
        try {
          renderReceipt(uri, width) { printer.printBitmap(it, null) }
          printer.printAndFeedPaper(60)
          printer.exitPrinterBuffer(true, callback)
          submitted = true
          withTimeout(60_000) { result.await() }
        } finally {
          if (!submitted) runCatching { printer.exitPrinterBuffer(false) }
        }
        true
      } ?: error("The built-in printer is unavailable.")
    }
  }

  private fun paperWidth(printer: PrinterHelper): String? = when (printer.printerPaperType) {
    58 -> "58mm"
    80 -> "80mm"
    else -> null
  }

  private suspend fun <T> withPrinter(block: suspend (PrinterHelper) -> T): T? =
    serviceLock.withLock {
      withContext(Dispatchers.IO) {
        val context = appContext.reactContext?.applicationContext ?: return@withContext null
        val printer = PrinterHelper.getInstance()
        val connection = CompletableDeferred<Unit>()
        val callback = object : InitPrinterCallback {
          override fun onConnected() { connection.complete(Unit) }
          override fun onDisconnected() { connection.cancel() }
        }
        if (!printer.initPrinterService(context, callback)) return@withContext null
        try {
          withTimeoutOrNull(3_000) { connection.await() } ?: return@withContext null
          block(printer)
        } finally {
          runCatching { printer.deInitPrinterService(context) }
        }
      }
    }
}
