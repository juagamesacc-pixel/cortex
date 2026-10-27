package com.cortex.agent.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.cortex.agent.security.SecurityManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class CortexBridge(
    private val context: Context,
    private val webViewProvider: () -> WebView?
) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val securityManager = SecurityManager(context)
    private val shellExecutor = ShellExecutor(securityManager)
    private val fileSystemExecutor = FileSystemExecutor(securityManager)
    private val httpExecutor = HttpExecutor()
    private val systemExecutor = SystemExecutor(context)
    private val scope = CoroutineScope(Dispatchers.Main)

    @JavascriptInterface
    fun executeCommand(requestJson: String): String {
        return try {
            val req = json.decodeFromString<ShellRequest>(requestJson)
            val result = kotlinx.coroutines.runBlocking { shellExecutor.execute(req) }
            """{"id":"sync","success":true,"data":${json.encodeToString(result)},"durationMs":${result.durationMs}}"""
        } catch (e: Exception) {
            """{"id":"sync","success":false,"error":{"code":"SHELL_ERROR","message":"${e.message?.replace("\"", "\\\"")}"},"durationMs":0}"""
        }
    }

    @JavascriptInterface
    fun executeCommandAsync(requestId: String, requestJson: String) {
        scope.launch(Dispatchers.IO) {
            try {
                val req = json.decodeFromString<ShellRequest>(requestJson)
                val result = shellExecutor.executeStreaming(req) { chunk ->
                    val chunkEscaped = chunk.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "")
                    val chunkJson = """{"id":"$requestId","type":"stdout","data":"$chunkEscaped","timestamp":${System.currentTimeMillis()}}"""
                    launch(Dispatchers.Main) {
                        webViewProvider()?.evaluateJavascript(
                            "window.__cortexBridge && window.__cortexBridge.onStreamChunk('$requestId', '$chunkJson');",
                            null
                        )
                    }
                }

                launch(Dispatchers.Main) {
                    val resultJson = json.encodeToString(result)
                    webViewProvider()?.evaluateJavascript(
                        "window.__cortexBridge && window.__cortexBridge.onStreamComplete('$requestId', '$resultJson');",
                        null
                    )
                }
            } catch (e: Exception) {
                val errMsg = e.message?.replace("\"", "\\\"") ?: "Execution error"
                launch(Dispatchers.Main) {
                    val errorResult = """{"exitCode":-1,"stdout":"","stderr":"$errMsg","timedOut":false,"durationMs":0}"""
                    webViewProvider()?.evaluateJavascript(
                        "window.__cortexBridge && window.__cortexBridge.onStreamComplete('$requestId', '$errorResult');",
                        null
                    )
                }
            }
        }
    }

    @JavascriptInterface
    fun readFile(path: String): String {
        return try {
            val content = kotlinx.coroutines.runBlocking { fileSystemExecutor.readFile(path) }
            """{"success":true,"data":${json.encodeToString(content)}}"""
        } catch (e: Exception) {
            """{"success":false,"error":{"code":"READ_ERROR","message":"${e.message}"}}"""
        }
    }

    @JavascriptInterface
    fun writeFile(path: String, content: String, append: Boolean): String {
        return try {
            val ok = kotlinx.coroutines.runBlocking { fileSystemExecutor.writeFile(path, content, append) }
            """{"success":$ok}"""
        } catch (e: Exception) {
            """{"success":false,"error":{"code":"WRITE_ERROR","message":"${e.message}"}}"""
        }
    }

    @JavascriptInterface
    fun listDirectory(path: String): String {
        return try {
            val entries = kotlinx.coroutines.runBlocking { fileSystemExecutor.listDirectory(path) }
            """{"success":true,"data":${json.encodeToString(entries)}}"""
        } catch (e: Exception) {
            """{"success":false,"error":{"code":"LIST_ERROR","message":"${e.message}"}}"""
        }
    }

    @JavascriptInterface
    fun deleteFile(path: String): String {
        return try {
            val ok = kotlinx.coroutines.runBlocking { fileSystemExecutor.deleteFile(path) }
            """{"success":$ok}"""
        } catch (e: Exception) {
            """{"success":false,"error":{"code":"DELETE_ERROR","message":"${e.message}"}}"""
        }
    }

    @JavascriptInterface
    fun httpRequest(requestJson: String): String {
        return try {
            val req = json.decodeFromString<HttpBridgeRequest>(requestJson)
            val res = kotlinx.coroutines.runBlocking { httpExecutor.execute(req) }
            """{"success":true,"data":${json.encodeToString(res)}}"""
        } catch (e: Exception) {
            """{"success":false,"error":{"code":"HTTP_ERROR","message":"${e.message}"}}"""
        }
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val info = systemExecutor.getDeviceInfo()
        return """{"success":true,"data":${json.encodeToString(info)}}"""
    }

    @JavascriptInterface
    fun showNotification(title: String, body: String): String {
        val ok = systemExecutor.showNotification(title, body)
        return """{"success":$ok}"""
    }

    @JavascriptInterface
    fun getClipboard(): String {
        val text = systemExecutor.getClipboard()
        return """{"success":true,"data":${json.encodeToString(text)}}"""
    }

    @JavascriptInterface
    fun setClipboard(text: String): String {
        val ok = systemExecutor.setClipboard(text)
        return """{"success":$ok}"""
    }

    @JavascriptInterface
    fun getAvailableRuntimes(): String {
        val runtimes = systemExecutor.detectAvailableRuntimes()
        return """{"success":true,"data":${json.encodeToString(runtimes)}}"""
    }
}
