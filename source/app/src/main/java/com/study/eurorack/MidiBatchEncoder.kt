package com.study.eurorack

import java.io.ByteArrayOutputStream

/**
 * Decodes the rack's fixed status,d1,d2 tuple transport into MIDI 1.0 bytes.
 * Channel Program Change/Channel Pressure use one data byte; real-time messages
 * (F8..FF) are single-byte messages and must not acquire zero-valued data bytes.
 */
internal fun encodeMidiBatch(batch: String): ByteArray {
    val out = ByteArrayOutputStream()
    for (part in batch.split(';')) {
        val fields = part.split(',')
        if (fields.size < 3) continue
        val status = fields[0].toIntOrNull() ?: continue
        val data1 = fields[1].toIntOrNull() ?: continue
        val data2 = fields[2].toIntOrNull() ?: continue
        if (status !in 0..255 || data1 !in 0..127 || data2 !in 0..127) continue
        out.write(status)
        if (status >= 0xF8) continue
        out.write(data1)
        val command = status and 0xF0
        if (command != 0xC0 && command != 0xD0) out.write(data2)
    }
    return out.toByteArray()
}
