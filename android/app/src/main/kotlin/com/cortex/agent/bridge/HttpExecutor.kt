package com.cortex.agent.bridge

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

@Serializable
data class HttpBridgeRequest(
    val url: String,
    val method: String = "GET",
    val headers: Map<String, String>? = null,
    val body: String? = null,
    val timeoutMs: Long = 15000L
)

@Serializable
data class HttpBridgeResponse(
    val statusCode: Int,
    val headers: Map<String, String>,
    val body: String,
    val durationMs: Long
)

class HttpExecutor {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun execute(request: HttpBridgeRequest): HttpBridgeResponse = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()

        val reqBuilder = Request.Builder().url(request.url)

        request.headers?.forEach { (k, v) ->
            reqBuilder.addHeader(k, v)
        }

        when (request.method.uppercase()) {
            "GET" -> reqBuilder.get()
            "DELETE" -> reqBuilder.delete()
            "POST" -> {
                val mediaType = request.headers?.get("Content-Type")?.toMediaTypeOrNull()
                    ?: "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = (request.body ?: "").toRequestBody(mediaType)
                reqBuilder.post(body)
            }
            "PUT" -> {
                val mediaType = request.headers?.get("Content-Type")?.toMediaTypeOrNull()
                    ?: "application/json; charset=utf-8".toMediaTypeOrNull()
                val body = (request.body ?: "").toRequestBody(mediaType)
                reqBuilder.put(body)
            }
            else -> reqBuilder.get()
        }

        client.newCall(reqBuilder.build()).execute().use { response ->
            val headersMap = mutableMapOf<String, String>()
            for (i in 0 until response.headers.size) {
                headersMap[response.headers.name(i)] = response.headers.value(i)
            }

            val bodyText = response.body?.string() ?: ""
            val duration = System.currentTimeMillis() - startTime

            HttpBridgeResponse(
                statusCode = response.code,
                headers = headersMap,
                body = bodyText,
                durationMs = duration
            )
        }
    }
}
