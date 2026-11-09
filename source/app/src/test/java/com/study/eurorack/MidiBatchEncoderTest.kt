package com.study.eurorack

import org.junit.Assert.assertArrayEquals
import org.junit.Test

class MidiBatchEncoderTest {
    @Test
    fun encodesChannelVoiceMessagesWithCorrectDataLengths() {
        assertArrayEquals(
            byteArrayOf(0xB0.toByte(), 74, 100, 0xC0.toByte(), 12, 0xD1.toByte(), 55),
            encodeMidiBatch("176,74,100;192,12,0;209,55,0")
        )
    }

    @Test
    fun realtimeClockAndTransportStatusesAreSingleByteMessages() {
        assertArrayEquals(
            byteArrayOf(0xF8.toByte(), 0xFA.toByte(), 0xFC.toByte()),
            encodeMidiBatch("248,0,0;250,0,0;252,0,0")
        )
    }

    @Test
    fun realtimeMessagesCanBeInterleavedWithChannelVoiceMessages() {
        assertArrayEquals(
            byteArrayOf(0x90.toByte(), 60, 100, 0xF8.toByte(), 0x80.toByte(), 60, 0),
            encodeMidiBatch("144,60,100;248,0,0;128,60,0")
        )
    }

    @Test
    fun malformedAndOutOfRangeTuplesAreIgnored() {
        assertArrayEquals(
            byteArrayOf(0xB0.toByte(), 1, 127),
            encodeMidiBatch("oops;176,1,127;176,128,1;256,1,1;176,1")
        )
    }
}
