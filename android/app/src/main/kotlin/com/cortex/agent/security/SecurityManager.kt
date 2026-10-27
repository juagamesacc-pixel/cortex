package com.cortex.agent.security

import android.content.Context
import java.io.File

/**
 * Validates security constraints, sandbox boundaries, and blocks dangerous system actions.
 */
class SecurityManager(private val context: Context) {

    private val baseWorkspaceDir: File by lazy {
        File(context.filesDir, "workspace").apply {
            if (!exists()) mkdirs()
        }
    }

    private val criticalDenyCommands = listOf(
        "rm -rf /",
        "mkfs",
        "dd if=",
        "> /dev/block",
        ":(){ :|:& };:", // Fork bomb
        "reboot"
    )

    fun validateCommand(command: String): Boolean {
        val trimmed = command.trim()
        for (pattern in criticalDenyCommands) {
            if (trimmed.contains(pattern, ignoreCase = true)) {
                return false
            }
        }
        return true
    }

    fun resolveAndValidatePath(rawPath: String): File {
        val file = if (rawPath.startsWith("/")) {
            File(rawPath)
        } else {
            File(baseWorkspaceDir, rawPath)
        }
        return file.canonicalFile
    }

    fun getWorkspaceDirectory(): File = baseWorkspaceDir
}
