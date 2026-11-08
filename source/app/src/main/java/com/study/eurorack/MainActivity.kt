package com.study.eurorack

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiInputPort
import android.media.midi.MidiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.ConcurrentHashMap

/**
 * WebView com o rack (assets/index.html) + pontes nativas:
 *  - MIDI de entrada (USB, Bluetooth, portas virtuais de outros apps) e de saída (note/gate/CC do módulo CV→MIDI);
 *  - armazenamento persistente (SharedPreferences) para presets, bancos e patch automático;
 *  - exportar/importar arquivos .json pelo seletor de arquivos do Android (sem permissões extras).
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private val opened = mutableSetOf<Int>()
    private val outs = ConcurrentHashMap<Int, MidiInputPort>()
    private val prefs by lazy { getSharedPreferences("eurorack", Context.MODE_PRIVATE) }
    @Volatile private var pendingExport: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "$userAgentString EurorackApp"
        }
        web.addJavascriptInterface(Bridge(), "Native")
        MidiBus.onIn = { s, a, b -> js("midiIn($s,$a,$b)") }
        // Origem https segura (appassets.androidplatform.net): em file:// o AudioWorklet falha e o motor
        // cairia no modo compatível (thread principal), com glitches constantes.
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? =
                request?.let { loader.shouldInterceptRequest(it.url) }

            override fun onPageFinished(view: WebView?, url: String?) = startMidi()
        }
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onPause() {
        // grava o patch atual antes de ir para segundo plano
        web.evaluateJavascript("window.saveAuto&&window.saveAuto()", null)
        super.onPause()
    }

    override fun onDestroy() {
        MidiBus.onIn = null
        outs.values.forEach { try { it.close() } catch (e: Exception) { } }
        outs.clear()
        super.onDestroy()
    }

    private fun js(code: String) = runOnUiThread { web.evaluateJavascript(code, null) }

    // ---------------------------------------------------------------- MIDI
    @Suppress("DEPRECATION")
    private fun startMidi() {
        val mm = getSystemService(Context.MIDI_SERVICE) as? MidiManager ?: return
        val h = Handler(Looper.getMainLooper())
        mm.registerDeviceCallback(object : MidiManager.DeviceCallback() {
            override fun onDeviceAdded(info: MidiDeviceInfo) = attach(mm, info, h)
            override fun onDeviceRemoved(info: MidiDeviceInfo) {
                opened.remove(info.id)
                outs.remove(info.id)?.let { try { it.close() } catch (e: Exception) { } }
            }
        }, h)
        mm.devices.forEach { attach(mm, it, h) }
    }

    /** O próprio dispositivo virtual do app não pode ser aberto (senão o que enviamos voltaria como entrada). */
    @Suppress("DEPRECATION")
    private fun isOwn(info: MidiDeviceInfo): Boolean {
        val p = info.properties
        val si = try { p.getParcelable<ServiceInfo>("service_info") } catch (e: Exception) { null }
        if (si != null && si.packageName == packageName) return true
        return info.type == MidiDeviceInfo.TYPE_VIRTUAL &&
            p.getString(MidiDeviceInfo.PROPERTY_MANUFACTURER) == "Eurorack Study"
    }

    private fun attach(mm: MidiManager, info: MidiDeviceInfo, h: Handler) {
        if (isOwn(info) || !opened.add(info.id)) return
        val name = (info.properties.getString(MidiDeviceInfo.PROPERTY_NAME) ?: "MIDI").replace("'", "")
        mm.openDevice(info, { dev ->
            if (dev != null) {
                if (info.outputPortCount > 0) {
                    dev.openOutputPort(0)?.connect(MidiParser { s, a, b -> js("midiIn($s,$a,$b)") })
                }
                if (info.inputPortCount > 0) {
                    dev.openInputPort(0)?.let { outs[info.id] = it }
                }
                js("midiDev('$name')")
            }
        }, h)
    }

    /** Envia para a porta virtual do app e para todos os dispositivos/apps com porta de entrada aberta. */
    private fun sendMidi(b: ByteArray) {
        if (b.isEmpty()) return
        EurorackMidiService.inst?.emit(b)
        for (p in outs.values) {
            try { p.send(b, 0, b.size) } catch (e: Exception) { }
        }
    }

    // ---------------------------------------------------------------- ponte JS
    inner class Bridge {
        /** "status,d1,d2;status,d1,d2;..." */
        @JavascriptInterface
        fun midiOutBatch(s: String) {
            val out = ByteArrayOutputStream()
            for (part in s.split(';')) {
                val p = part.split(',')
                if (p.size < 3) continue
                val st = p[0].toIntOrNull() ?: continue
                val a = p[1].toIntOrNull() ?: continue
                val b = p[2].toIntOrNull() ?: continue
                out.write(st and 255)
                out.write(a and 127)
                val hi = st and 0xF0
                if (hi != 0xC0 && hi != 0xD0) out.write(b and 127)
            }
            sendMidi(out.toByteArray())
        }

        @JavascriptInterface fun midiOutCount(): Int = outs.size + (if (EurorackMidiService.inst != null) 1 else 0)

        @JavascriptInterface fun kvGet(k: String): String? = prefs.getString(k, null)

        @JavascriptInterface fun kvSet(k: String, v: String) { prefs.edit().putString(k, v).commit() }

        @JavascriptInterface fun kvDel(k: String) { prefs.edit().remove(k).commit() }

        @JavascriptInterface fun kvKeys(): String = prefs.all.keys.joinToString("\n")

        @JavascriptInterface
        fun exportFile(name: String, mime: String, content: String) {
            pendingExport = content
            runOnUiThread {
                val i = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = mime
                    putExtra(Intent.EXTRA_TITLE, name)
                }
                startActivityForResult(i, REQ_EXPORT)
            }
        }

        @JavascriptInterface
        fun importFile() {
            runOnUiThread {
                val i = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                startActivityForResult(i, REQ_IMPORT)
            }
        }
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) { pendingExport = null; return }
        try {
            if (requestCode == REQ_EXPORT) {
                val text = pendingExport ?: return
                contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                pendingExport = null
                js("toast('Arquivo exportado')")
            } else if (requestCode == REQ_IMPORT) {
                val text = contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                js("nativeImport(${JSONObject.quote(text)})")
            }
        } catch (e: Exception) {
            js("toast('Falha ao acessar o arquivo')")
        }
    }

    companion object {
        private const val REQ_EXPORT = 7101
        private const val REQ_IMPORT = 7102
    }
}
