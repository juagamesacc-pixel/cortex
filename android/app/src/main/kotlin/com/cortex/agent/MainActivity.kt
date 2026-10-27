package com.cortex.agent

import android.os.Bundle
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.cortex.agent.service.ExecutionService

class MainActivity : AppCompatActivity() {

    private lateinit var webView: CortexWebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = CortexWebView(this)
        val container = findViewById<FrameLayout>(R.id.webViewContainer)
        container.addView(webView)

        // Start foreground service for reliable continuous execution
        ExecutionService.start(this)

        // Load the React agent interface
        webView.loadApp()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        ExecutionService.stop(this)
    }
}
