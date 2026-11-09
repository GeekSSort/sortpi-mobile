package com.sortpi.sunmi

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SunmiScannerModule : Module() {
  private var receiverContext: Context? = null
  private val action = "com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED"
  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action != action) return
      val code = intent.getStringExtra("data")?.trim() ?: return
      if (code.isNotEmpty() && code.length <= 4096) sendEvent("onBarcode", mapOf("code" to code))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("SortPiSunmiScanner")
    Events("onBarcode")
    OnStartObserving("onBarcode") {
      val context = appContext.reactContext?.applicationContext
      if (context != null && receiverContext == null) {
        // The scanner service runs in another application. Scan events are only used for product lookup.
        ContextCompat.registerReceiver(context, receiver, IntentFilter(action), ContextCompat.RECEIVER_EXPORTED)
        receiverContext = context
      }
    }
    OnStopObserving("onBarcode") { unregister() }
    OnDestroy { unregister() }
  }

  private fun unregister() {
    receiverContext?.unregisterReceiver(receiver)
    receiverContext = null
  }
}
