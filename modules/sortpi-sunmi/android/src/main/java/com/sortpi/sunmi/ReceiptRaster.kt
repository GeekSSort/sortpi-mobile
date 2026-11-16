package com.sortpi.sunmi

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
import kotlin.math.ceil

internal fun renderReceipt(uri: String, width: String, sideMargin: Int = 0, emit: (Bitmap) -> Unit) {
  val path = requireNotNull(Uri.parse(uri).path)
  val dots = (if (width == "58mm") 384 else 576) - 2 * sideMargin
  val descriptor = ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
  descriptor.use {
    PdfRenderer(descriptor).use { pdf ->
      for (index in 0 until pdf.pageCount) {
        pdf.openPage(index).use { page -> renderPage(page, dots, emit) }
      }
    }
  }
}

private fun renderPage(page: PdfRenderer.Page, dots: Int, emit: (Bitmap) -> Unit) {
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
            emit(blank)
          } finally {
            blank.recycle()
          }
          pendingBlankRows -= blankRows
        }
        val content = Bitmap.createBitmap(bitmap, 0, 0, dots, usedRows)
        try {
          emit(content)
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
