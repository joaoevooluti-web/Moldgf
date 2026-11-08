package com.study.eurorack

import android.media.midi.MidiDeviceService
import android.media.midi.MidiReceiver

/**
 * Dispositivo MIDI virtual do app. Outros apps (DAWs, sintetizadores) o listam como "Rack MIDI":
 * - porta de saída: o que o rack envia (note, gate e CC do módulo CV→MIDI);
 * - porta de entrada: MIDI enviado por outros apps para o rack (vai para o módulo MIDI→CV).
 */
class EurorackMidiService : MidiDeviceService() {
    override fun onCreate() {
        super.onCreate()
        inst = this
    }

    override fun onDestroy() {
        if (inst === this) inst = null
        super.onDestroy()
    }

    override fun onGetInputPortReceivers(): Array<MidiReceiver> =
        arrayOf(MidiParser { s, a, b -> MidiBus.onIn?.invoke(s, a, b) })

    /** Envia bytes MIDI aos apps conectados à porta de saída (se algum estiver conectado). */
    fun emit(bytes: ByteArray) {
        val r = outputPortReceivers
        if (r != null && r.isNotEmpty()) {
            try { r[0].send(bytes, 0, bytes.size) } catch (e: Exception) { }
        }
    }

    companion object {
        @Volatile var inst: EurorackMidiService? = null
    }
}
