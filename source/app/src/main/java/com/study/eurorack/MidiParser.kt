package com.study.eurorack

import android.media.midi.MidiReceiver

/** Ponto de entrega do MIDI recebido (de dispositivos e da porta virtual) para o JS. */
object MidiBus {
    @Volatile var onIn: ((Int, Int, Int) -> Unit)? = null
}

/** Decodifica bytes MIDI (mensagens de canal e tempo real) e chama [emit](status, d1, d2). */
class MidiParser(private val emit: (Int, Int, Int) -> Unit) : MidiReceiver() {
    override fun onSend(d: ByteArray, off: Int, count: Int, ts: Long) {
        var k = off
        val end = off + count
        while (k < end) {
            val s = d[k].toInt() and 255
            when {
                s >= 0xF8 -> { emit(s, 0, 0); k++ }
                s >= 0xF0 -> k++
                s >= 0x80 -> {
                    val n = if ((s and 0xF0) == 0xC0 || (s and 0xF0) == 0xD0) 1 else 2
                    if (k + n >= end) break
                    val a = d[k + 1].toInt() and 127
                    val b = if (n == 2) d[k + 2].toInt() and 127 else 0
                    emit(s, a, b)
                    k += 1 + n
                }
                else -> k++
            }
        }
    }
}
