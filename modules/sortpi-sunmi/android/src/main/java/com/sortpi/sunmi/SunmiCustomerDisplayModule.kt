package com.sortpi.sunmi

import android.app.Presentation
import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Display
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SunmiCustomerDisplayModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var manager: DisplayManager? = null
  private var presentation: BasketPresentation? = null
  private var basket: Basket? = null

  private val displays = object : DisplayManager.DisplayListener {
    override fun onDisplayAdded(displayId: Int) { refresh() }
    override fun onDisplayChanged(displayId: Int) { refresh() }
    override fun onDisplayRemoved(displayId: Int) { refresh() }
  }

  override fun definition() = ModuleDefinition {
    Name("SortPiSunmiCustomerDisplay")
    AsyncFunction("showBasket") { title: String, lines: List<String>, totalLabel: String, total: String ->
      basket = Basket(title, lines, totalLabel, total)
      if (manager == null) {
        manager = appContext.currentActivity?.getSystemService(DisplayManager::class.java)
        manager?.registerDisplayListener(displays, main)
      }
      refresh()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("hideBasket") { clear() }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { main.post { clear() } }
    OnActivityDestroys { main.post { clear() } }
    OnDestroy { main.post { clear() } }
  }

  private fun clear() {
    basket = null
    manager?.unregisterDisplayListener(displays)
    manager = null
    presentation?.dismiss()
    presentation = null
  }

  private fun refresh() {
    val data = basket ?: return
    val activity = appContext.currentActivity ?: return
    // SUNMI documents these flags for the physical secondary screen. Ignore mirrored displays.
    val flags = Display.FLAG_SECURE or Display.FLAG_SUPPORTS_PROTECTED_BUFFERS or Display.FLAG_PRESENTATION
    val display = manager?.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)
      ?.firstOrNull { it.isValid && it.flags and flags == flags }
    if (presentation?.display?.displayId != display?.displayId || presentation?.isShowing != true) {
      presentation?.dismiss()
      presentation = if (display == null || activity.isFinishing || activity.isDestroyed) null else {
        try {
          BasketPresentation(activity, display).apply { show() }
        } catch (_: WindowManager.InvalidDisplayException) {
          null // The display was removed between enumeration and show().
        }
      }
    }
    presentation?.update(data)
  }

  private data class Basket(val title: String, val lines: List<String>, val totalLabel: String, val total: String)

  private class BasketPresentation(context: Context, display: Display) : Presentation(context, display) {
    private lateinit var title: TextView
    private lateinit var items: LinearLayout
    private lateinit var total: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
      super.onCreate(savedInstanceState)
      val padding = (16 * resources.displayMetrics.density).toInt()
      val layout = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(padding, padding, padding, padding)
        setBackgroundColor(0xFF101828.toInt())
      }
      title = text(20f)
      items = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
      total = text(26f).apply { gravity = Gravity.END }
      layout.addView(title)
      layout.addView(ScrollView(context).apply { addView(items) }, LinearLayout.LayoutParams(-1, 0, 1f))
      layout.addView(total)
      setContentView(layout)
      window?.setLayout(-1, -1)
    }

    fun update(basket: Basket) {
      title.text = basket.title
      items.removeAllViews()
      basket.lines.forEach { line -> items.addView(text(17f).apply { text = line }) }
      total.text = "${basket.totalLabel}  ${basket.total}"
    }

    private fun text(size: Float) = TextView(context).apply {
      textSize = size
      setTextColor(0xFFF8FAFC.toInt())
      setPadding(0, 6, 0, 6)
    }
  }
}
