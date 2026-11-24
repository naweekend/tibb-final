package pk.tibb.clinical.ai

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

data class ModelAssetSpec(
    val fileName: String,
    val httpsUrl: String,
    val expectedSha256: String
)

object ModelDownloadManager {

    // Replace expectedSha256 with the verified release hash from your HuggingFace mirror before shipping
    val QWEN_0_8B = ModelAssetSpec(
        fileName = "models/Qwen3.5-0.8B-Q4_K_M.gguf",
        httpsUrl = "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf",
        expectedSha256 = "REPLACE_WITH_VERIFIED_QWEN_SHA256"
    )

    val WHISPER_TINY = ModelAssetSpec(
        fileName = "models/ggml-tiny-q5_1.bin",
        httpsUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin",
        expectedSha256 = "REPLACE_WITH_VERIFIED_WHISPER_SHA256"
    )

    fun downloadAndVerify(context: Context, spec: ModelAssetSpec, onProgress: (Int) -> Unit): File {
        val target = File(context.filesDir, spec.fileName)
        target.parentFile?.mkdirs()

        val temp = File(context.filesDir, "${spec.fileName}.part")
        val conn = (URL(spec.httpsUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 30_000
            requestMethod = "GET"
        }
        val totalBytes = conn.contentLengthLong.coerceAtLeast(1L)
        var downloaded = 0L

        conn.inputStream.use { input ->
            FileOutputStream(temp).use { output ->
                val buf = ByteArray(16 * 1024)
                while (true) {
                    val read = input.read(buf)
                    if (read <= 0) break
                    output.write(buf, 0, read)
                    downloaded += read
                    onProgress(((downloaded * 100) / totalBytes).toInt().coerceIn(0, 100))
                }
            }
        }

        if (spec.expectedSha256 != "REPLACE_WITH_VERIFIED_QWEN_SHA256" &&
            spec.expectedSha256 != "REPLACE_WITH_VERIFIED_WHISPER_SHA256"
        ) {
            val digest = sha256File(temp)
            if (!digest.equals(spec.expectedSha256, ignoreCase = true)) {
                temp.delete()
                throw SecurityException("SHA-256 verification failed for ${spec.fileName}")
            }
        }

        if (target.exists()) target.delete()
        temp.renameTo(target)
        return target
    }

    private fun sha256File(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(16 * 1024)
            while (true) {
                val n = input.read(buf)
                if (n <= 0) break
                md.update(buf, 0, n)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }
}
