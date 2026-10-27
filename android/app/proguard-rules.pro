# ProGuard Rules for Cortex Agent
# WebView JavaScript Interface — keep all @JavascriptInterface annotated methods
-keepclassmembers class com.cortex.agent.bridge.CortexBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep all bridge data classes used with kotlinx.serialization
-keep @kotlinx.serialization.Serializable class ** { *; }
-keepclassmembers class ** {
    @kotlinx.serialization.SerialName *;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# AndroidX WebKit
-keep class androidx.webkit.** { *; }
-keep interface androidx.webkit.** { *; }
