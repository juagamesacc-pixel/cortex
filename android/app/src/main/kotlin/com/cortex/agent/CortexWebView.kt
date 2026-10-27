package com.cortex.agent

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import com.cortex.agent.bridge.CortexBridge

@SuppressLint("SetJavaScriptEnabled")
class CortexWebView(context: Context) : WebView(context) {

    private val bridge: CortexBridge
    private val assetLoader: WebViewAssetLoader

    init {
        // High-performance hardware acceleration
        setLayerType(View.LAYER_TYPE_HARDWARE, null)

        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // IndexedDB & localStorage
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportMultipleWindows(false)

            useWideViewPort = true
            loadWithOverviewMode = true
        }

        bridge = CortexBridge(context) { this }
        addJavascriptInterface(bridge, "CortexNative")

        // WebViewAssetLoader enables secure, CORS-compliant loading of assets via https:// domain
        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()

        webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                return assetLoader.shouldInterceptRequest(url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Bridge handshake confirmation
                view?.evaluateJavascript(
                    "console.info('[CortexHost] Native WebView bridge ready on ' + window.location.href);",
                    null
                )
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                // Fallback to direct file scheme if asset loader fails on older devices
                if (failingUrl?.startsWith("https://appassets.androidplatform.net") == true) {
                    view?.loadUrl("file:///android_asset/cortex/index.html")
                }
            }
        }
    }

    fun loadApp() {
        // Load via secure WebViewAssetLoader domain, which gives standard web origin capabilities (fetch, storage, indexedDB)
        loadUrl("https://appassets.androidplatform.net/assets/cortex/index.html")
    }
}
