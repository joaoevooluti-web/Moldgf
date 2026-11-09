package com.study.eurorack

/**
 * Incremental MIDI 1.0 byte-stream decoder.
 *
 * MidiReceiver may split a message at any byte boundary. State is therefore retained across
 * feed() calls, channel running status is honoured, and real-time bytes can be interleaved
 * without disturbing a message currently being assembled.
 */
class MidiMessageDecoder(private val emit: (Int, Int, Int) -> Unit) {
    private var runningStatus = -1
    private var pendingStatus = -1
    private var expectedData = 0
    private var dataCount = 0
    private var firstData = 0
    private var inSysEx = false

    fun reset() {
        runningStatus = -1
        pendingStatus = -1
        expectedData = 0
        dataCount = 0
        firstData = 0
        inSysEx = false
    }

    fun feed(data: ByteArray, offset: Int = 0, count: Int = data.size - offset) {
        if (offset < 0 || count <= 0 || offset >= data.size) return
        val end = (offset.toLong() + count.toLong())
            .coerceIn(offset.toLong(), data.size.toLong()).toInt()
        var index = offset
        while (index < end) {
            val value = data[index].toInt() and 0xFF
            index++

            // Real-time statuses (including System Reset) may occur anywhere in the stream.
            if (value >= 0xF8) {
                emit(value, 0, 0)
                continue
            }

            if ((value and 0x80) != 0) {
                beginStatus(value)
                continue
            }

            if (inSysEx) continue

            if (pendingStatus < 0) {
                if (runningStatus < 0) continue
                pendingStatus = runningStatus
                expectedData = channelDataLength(runningStatus)
                dataCount = 0
            }

            if (dataCount == 0) firstData = value
            dataCount++

            if (dataCount >= expectedData) {
                val status = pendingStatus
                val secondData = if (expectedData == 2) value else 0
                emit(status, firstData, secondData)
                dataCount = 0
                firstData = 0

                if (status in 0x80..0xEF) {
                    pendingStatus = runningStatus
                    expectedData = channelDataLength(runningStatus)
                } else {
                    pendingStatus = -1
                    expectedData = 0
                    runningStatus = -1
                }
            }
        }
    }

    private fun beginStatus(status: Int) {
        dataCount = 0
        firstData = 0
        inSysEx = false

        when (status) {
            in 0x80..0xEF -> {
                runningStatus = status
                pendingStatus = status
                expectedData = channelDataLength(status)
            }
            0xF0 -> {
                runningStatus = -1
                pendingStatus = -1
                expectedData = 0
                inSysEx = true
            }
            0xF7 -> {
                runningStatus = -1
                pendingStatus = -1
                expectedData = 0
            }
            0xF1, 0xF3 -> {
                runningStatus = -1
                pendingStatus = status
                expectedData = 1
            }
            0xF2 -> {
                runningStatus = -1
                pendingStatus = status
                expectedData = 2
            }
            0xF6 -> {
                runningStatus = -1
                pendingStatus = -1
                expectedData = 0
                emit(status, 0, 0)
            }
            else -> {
                // Undefined system-common statuses cancel running status and are ignored.
                runningStatus = -1
                pendingStatus = -1
                expectedData = 0
            }
        }
    }

    private fun channelDataLength(status: Int): Int {
        return when (status and 0xF0) {
            0xC0, 0xD0 -> 1
            else -> 2
        }
    }
}
