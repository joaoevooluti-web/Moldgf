package com.study.eurorack

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MidiMessageDecoderTest {
    private data class Message(val status: Int, val data1: Int, val data2: Int)

    private fun bytes(vararg values: Int) = ByteArray(values.size) { values[it].toByte() }

    @Test
    fun decodesChannelVoiceMessagesIncludingOneDataByteStatuses() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x90, 60, 100, 0x80, 60, 0, 0xC1, 10, 0xD2, 55))

        assertEquals(
            listOf(
                Message(0x90, 60, 100),
                Message(0x80, 60, 0),
                Message(0xC1, 10, 0),
                Message(0xD2, 55, 0)
            ),
            received
        )
    }

    @Test
    fun keepsPartialMessagesAcrossReceiverCallbacks() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x90, 60))
        assertTrue(received.isEmpty())
        decoder.feed(bytes(100, 0x90, 61, 110))

        assertEquals(
            listOf(Message(0x90, 60, 100), Message(0x90, 61, 110)),
            received
        )
    }

    @Test
    fun honorsOffsetAndCountWithoutReadingAdjacentBytes() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x55, 0x90, 64, 127, 0x55), offset = 1, count = 3)
        decoder.feed(bytes(0x80, 64, 0), offset = 0, count = 2)
        assertEquals(listOf(Message(0x90, 64, 127)), received)
        decoder.feed(bytes(0x80, 64, 0))
        assertEquals(listOf(Message(0x90, 64, 127), Message(0x80, 64, 0)), received)
    }

    @Test
    fun supportsChannelRunningStatusAcrossMessagesAndCallbacks() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x91, 60, 90))
        decoder.feed(bytes(61, 91, 62, 92))

        assertEquals(
            listOf(
                Message(0x91, 60, 90),
                Message(0x91, 61, 91),
                Message(0x91, 62, 92)
            ),
            received
        )
    }

    @Test
    fun realTimeBytesDoNotInterruptAnIncompleteChannelMessage() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x90, 60, 0xF8, 100, 0xFA, 0xFC))

        assertEquals(
            listOf(
                Message(0xF8, 0, 0),
                Message(0x90, 60, 100),
                Message(0xFA, 0, 0),
                Message(0xFC, 0, 0)
            ),
            received
        )
    }

    @Test
    fun systemCommonMessagesConsumeTheirDataAndCancelRunningStatus() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x90, 60, 100, 0xF2, 1, 2, 61, 110, 0xF6))

        assertEquals(
            listOf(
                Message(0x90, 60, 100),
                Message(0xF2, 1, 2),
                Message(0xF6, 0, 0)
            ),
            received
        )
    }

    @Test
    fun ignoresSysExPayloadButStillEmitsInterleavedRealTimeMessages() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0xF0, 1, 2, 0xF8, 3, 4, 0xF7, 0x90, 60, 0))

        assertEquals(
            listOf(Message(0xF8, 0, 0), Message(0x90, 60, 0)),
            received
        )
    }

    @Test
    fun resetClearsRunningStatusAndPartialMessages() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }

        decoder.feed(bytes(0x90, 60))
        decoder.reset()
        decoder.feed(bytes(100, 61, 110))

        assertTrue(received.isEmpty())
    }

    @Test
    fun malformedRangesAndEmptyChunksAreSafe() {
        val received = mutableListOf<Message>()
        val decoder = MidiMessageDecoder { s, a, b -> received += Message(s, a, b) }
        val data = bytes(0x90, 60, 100)

        decoder.feed(data, offset = -1, count = 3)
        decoder.feed(data, offset = 0, count = 0)
        decoder.feed(data, offset = 0, count = Int.MAX_VALUE)
        decoder.feed(data, offset = data.size, count = 1)
        decoder.feed(data, offset = 99, count = 1)

        assertEquals(listOf(Message(0x90, 60, 100)), received)
    }
}
