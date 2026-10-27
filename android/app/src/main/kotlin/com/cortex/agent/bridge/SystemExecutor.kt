package com.cortex.agent.bridge

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import androidx.core.app.NotificationCompat
import kotlinx.serialization.Serializable
import java.io.File

@Serializable
data class DeviceInfoResponse(
    val manufacturer: String,
    val model: String,
    val androidVersion: String,
    val sdkInt: Int,
    val availableMemoryBytes: Long,
    val batteryLevelPercent: Int,
    val isCharging: Boolean,
    val networkType: String,
    val availableRuntimes: List<String>
)

class SystemExecutor(private val context: Context) {

    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val clipboardManager =
        context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "cortex_agent_channel",
                "Cortex Agent Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun getDeviceInfo(): DeviceInfoResponse {
        val actManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        actManager.getMemoryInfo(memInfo)

        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
            context.registerReceiver(null, filter)
        }

        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100

        val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        val runtimes = detectAvailableRuntimes()

        return DeviceInfoResponse(
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL,
            androidVersion = Build.VERSION.RELEASE,
            sdkInt = Build.VERSION.SDK_INT,
            availableMemoryBytes = memInfo.availMem,
            batteryLevelPercent = batteryPct,
            isCharging = isCharging,
            networkType = "WIFI",
            availableRuntimes = runtimes
        )
    }

    fun showNotification(title: String, body: String): Boolean {
        val notif = NotificationCompat.Builder(context, "cortex_agent_channel")
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notif)
        return true
    }

    fun getClipboard(): String {
        val clip = clipboardManager.primaryClip
        if (clip != null && clip.itemCount > 0) {
            return clip.getItemAt(0).text?.toString() ?: ""
        }
        return ""
    }

    fun setClipboard(text: String): Boolean {
        val clip = ClipData.newPlainText("cortex", text)
        clipboardManager.setPrimaryClip(clip)
        return true
    }

    fun detectAvailableRuntimes(): List<String> {
        val runtimes = mutableListOf("sh")
        val candidates = listOf(
            "bash" to listOf("/system/bin/bash", "/data/data/com.termux/files/usr/bin/bash"),
            "python3" to listOf("/system/bin/python3", "/data/data/com.termux/files/usr/bin/python3"),
            "node" to listOf("/system/bin/node", "/data/data/com.termux/files/usr/bin/node"),
            "git" to listOf("/system/bin/git", "/data/data/com.termux/files/usr/bin/git"),
            "curl" to listOf("/system/bin/curl", "/data/data/com.termux/files/usr/bin/curl")
        )

        for ((name, paths) in candidates) {
            if (paths.any { File(it).canExecute() }) {
                runtimes.add(name)
            }
        }
        return runtimes
    }
}
