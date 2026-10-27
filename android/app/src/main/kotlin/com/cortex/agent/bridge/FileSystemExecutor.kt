package com.cortex.agent.bridge

import com.cortex.agent.security.SecurityManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import java.io.File
import java.io.FileOutputStream

@Serializable
data class FileEntry(
    val name: String,
    val path: String,
    val isDirectory: Boolean,
    val sizeBytes: Long,
    val modifiedTimestamp: Long
)

class FileSystemExecutor(private val securityManager: SecurityManager) {

    suspend fun readFile(path: String): String = withContext(Dispatchers.IO) {
        val target = securityManager.resolveAndValidatePath(path)
        if (!target.exists()) throw NoSuchFileException(target)
        target.readText(Charsets.UTF_8)
    }

    suspend fun writeFile(path: String, content: String, append: Boolean): Boolean = withContext(Dispatchers.IO) {
        val target = securityManager.resolveAndValidatePath(path)
        target.parentFile?.mkdirs()
        FileOutputStream(target, append).use { fos ->
            fos.write(content.toByteArray(Charsets.UTF_8))
        }
        true
    }

    suspend fun listDirectory(path: String): List<FileEntry> = withContext(Dispatchers.IO) {
        val target = securityManager.resolveAndValidatePath(path)
        if (!target.exists() || !target.isDirectory) return@withContext emptyList()

        target.listFiles()?.map { f ->
            FileEntry(
                name = f.name,
                path = f.absolutePath,
                isDirectory = f.isDirectory,
                sizeBytes = if (f.isFile) f.length() else 0L,
                modifiedTimestamp = f.lastModified()
            )
        } ?: emptyList()
    }

    suspend fun deleteFile(path: String): Boolean = withContext(Dispatchers.IO) {
        val target = securityManager.resolveAndValidatePath(path)
        if (!target.exists()) return@withContext false
        if (target.isDirectory) target.deleteRecursively() else target.delete()
    }
}
