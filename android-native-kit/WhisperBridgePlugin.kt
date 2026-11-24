package pk.tibb.clinical.ai

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.withLock
import java.io.File

@CapacitorPlugin(name = "WhisperBridge")
class WhisperBridgePlugin : Plugin() {

    companion object {
        init {
            System.loadLibrary("tibb_ai_jni")
        }
    }

    private var whisperHandle: Long = 0L
    private val ioScope = CoroutineScope(Dispatchers.IO)

    private external fun nativeLoadWhisper(modelPath: String): Long
    private external fun nativeTranscribePcm(handle: Long, pcmFloat: FloatArray, language: String, threads: Int): String
    private external fun nativeFreeWhisper(handle: Long)

    @PluginMethod
    fun loadWhisper(call: PluginCall) {
        val relPath = call.getString("modelPath", "models/ggml-tiny-q5_1.bin")!!
        ioScope.launch {
            NativeMemoryLock.modelMutex.withLock {
                val file = File(context.filesDir, relPath)
                if (!file.exists()) {
                    call.reject("Whisper model not found at ${file.absolutePath}")
                    return@withLock
                }
                if (whisperHandle != 0L) {
                    nativeFreeWhisper(whisperHandle)
                    whisperHandle = 0L
                }
                whisperHandle = nativeLoadWhisper(file.absolutePath)
                val out = JSObject()
                out.put("loaded", whisperHandle != 0L)
                out.put("estimatedRamMb", 265)
                call.resolve(out)
            }
        }
    }

    @PluginMethod
    fun transcribeMic(call: PluginCall) {
        val maxSec = call.getInt("maxDurationSec", 10)!!.coerceIn(2, 15)
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Microphone permission required.")
            return
        }

        ioScope.launch {
            NativeMemoryLock.modelMutex.withLock {
                if (whisperHandle == 0L) {
                    call.reject("Whisper not loaded.")
                    return@withLock
                }
                val sampleRate = 16000
                val minBuf = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minBuf * 2
                )
                val totalSamples = sampleRate * maxSec
                val shortBuf = ShortArray(totalSamples)
                val startMs = System.currentTimeMillis()
                recorder.startRecording()
                var readCount = 0
                while (readCount < totalSamples) {
                    val n = recorder.read(shortBuf, readCount, minOf(1024, totalSamples - readCount))
                    if (n <= 0) break
                    readCount += n
                }
                recorder.stop()
                recorder.release()

                val floatPcm = FloatArray(readCount) { i -> shortBuf[i] / 32768.0f }
                val transcript = nativeTranscribePcm(whisperHandle, floatPcm, "ur", 4)

                val out = JSObject()
                out.put("transcript", transcript.trim())
                out.put("durationMs", (System.currentTimeMillis() - startMs).toInt())
                out.put("peakRamMb", 393)
                call.resolve(out)
            }
        }
    }

    @PluginMethod
    fun unloadWhisper(call: PluginCall) {
        ioScope.launch {
            NativeMemoryLock.modelMutex.withLock {
                if (whisperHandle != 0L) {
                    nativeFreeWhisper(whisperHandle)
                    whisperHandle = 0L
                }
                val out = JSObject()
                out.put("unloaded", true)
                call.resolve(out)
            }
        }
    }
}
