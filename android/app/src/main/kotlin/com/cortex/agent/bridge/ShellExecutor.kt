package com.cortex.agent.bridge

import com.cortex.agent.security.SecurityManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

@Serializable
data class ShellRequest(
    val command: String,
    val workingDir: String? = null,
    val env: Map<String, String>? = null,
    val timeoutMs: Long = 30000L,
    val mergeStderr: Boolean = false
)

@Serializable
data class ShellResponse(
    val exitCode: Int,
    val stdout: String,
    val stderr: String,
    val timedOut: Boolean,
    val durationMs: Long
)

class ShellExecutor(private val securityManager: SecurityManager) {

    suspend fun execute(request: ShellRequest): ShellResponse = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()

        if (!securityManager.validateCommand(request.command)) {
            return@withContext ShellResponse(
                exitCode = -1,
                stdout = "",
                stderr = "Security Exception: Prohibited command pattern detected.",
                timedOut = false,
                durationMs = System.currentTimeMillis() - startTime
            )
        }

        val workDir = request.workingDir?.let { File(it) } ?: securityManager.getWorkspaceDirectory()
        if (!workDir.exists()) workDir.mkdirs()

        // Locate available shell binary (/system/bin/sh or Termux bash)
        val shellBinary = when {
            File("/data/data/com.termux/files/usr/bin/bash").exists() -> "/data/data/com.termux/files/usr/bin/bash"
            File("/system/bin/sh").exists() -> "/system/bin/sh"
            else -> "sh"
        }

        val pb = ProcessBuilder(shellBinary, "-c", request.command).apply {
            directory(workDir)
            redirectErrorStream(request.mergeStderr)
            request.env?.let { environment().putAll(it) }
        }

        val process = pb.start()

        val stdoutBuilder = StringBuilder()
        val stderrBuilder = StringBuilder()

        val stdoutReader = BufferedReader(InputStreamReader(process.inputStream))
        val stderrReader = BufferedReader(InputStreamReader(process.errorStream))

        val completed = process.waitFor(request.timeoutMs, TimeUnit.MILLISECONDS)
        val duration = System.currentTimeMillis() - startTime

        if (!completed) {
            process.destroyForcibly()
            return@withContext ShellResponse(
                exitCode = -1,
                stdout = stdoutBuilder.toString(),
                stderr = "Process timed out after ${request.timeoutMs}ms",
                timedOut = true,
                durationMs = duration
            )
        }

        stdoutBuilder.append(stdoutReader.readText())
        stderrBuilder.append(stderrReader.readText())

        return@withContext ShellResponse(
            exitCode = process.exitValue(),
            stdout = stdoutBuilder.toString(),
            stderr = stderrBuilder.toString(),
            timedOut = false,
            durationMs = duration
        )
    }

    suspend fun executeStreaming(
        request: ShellRequest,
        onChunk: suspend (chunk: String) -> Unit
    ): ShellResponse = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()

        if (!securityManager.validateCommand(request.command)) {
            val err = "Security Exception: Prohibited command pattern."
            onChunk(err)
            return@withContext ShellResponse(-1, "", err, false, 0)
        }

        val workDir = request.workingDir?.let { File(it) } ?: securityManager.getWorkspaceDirectory()
        if (!workDir.exists()) workDir.mkdirs()

        val shellBinary = when {
            File("/data/data/com.termux/files/usr/bin/bash").exists() -> "/data/data/com.termux/files/usr/bin/bash"
            File("/system/bin/sh").exists() -> "/system/bin/sh"
            else -> "sh"
        }

        val pb = ProcessBuilder(shellBinary, "-c", request.command).apply {
            directory(workDir)
            redirectErrorStream(true) // Merge streams for streaming console view
            request.env?.let { environment().putAll(it) }
        }

        val process = pb.start()
        val stdoutAccumulator = StringBuilder()
        val reader = BufferedReader(InputStreamReader(process.inputStream))

        var line: String?
        while (reader.readLine().also { line = it } != null) {
            stdoutAccumulator.append(line).append("\n")
            onChunk(line + "\n")
        }

        val completed = process.waitFor(request.timeoutMs, TimeUnit.MILLISECONDS)
        val duration = System.currentTimeMillis() - startTime

        if (!completed) {
            process.destroyForcibly()
            val timeoutMsg = "[Process timed out after ${request.timeoutMs}ms]\n"
            onChunk(timeoutMsg)
            return@withContext ShellResponse(
                exitCode = -1,
                stdout = stdoutAccumulator.toString(),
                stderr = timeoutMsg,
                timedOut = true,
                durationMs = duration
            )
        }

        return@withContext ShellResponse(
            exitCode = process.exitValue(),
            stdout = stdoutAccumulator.toString(),
            stderr = "",
            timedOut = false,
            durationMs = duration
        )
    }

    fun commandExists(binary: String): Boolean {
        val paths = System.getenv("PATH")?.split(":") ?: listOf("/system/bin", "/system/xbin", "/vendor/bin")
        for (p in paths) {
            if (File(p, binary).canExecute()) return true
        }
        return false
    }
}
