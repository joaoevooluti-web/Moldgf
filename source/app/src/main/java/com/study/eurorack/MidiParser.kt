package com.study.eurorack

import android.media.midi.MidiReceiver

/** Ponto de entrega do MIDI recebido (de dispositivos e da porta virtual) para o JS. */
object MidiBus {
    @Volatile var onIn: ((Int, Int, Int) -> Unit)? = null
}

/** Decodifica o fluxo MIDI 1.0 e chama [emit](status, d1, d2). */
class MidiParser(private val emit: (Int, Int, Int) -> Unit) : MidiReceiver() {
    private val decoder = MidiMessageDecoder(emit)

    override fun onSend(d: ByteArray, off: Int, count: Int, ts: Long) {
        decoder.feed(d, off, count)
    }
}
