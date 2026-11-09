const test=require("node:test");
const assert=require("node:assert/strict");
const MIDIThing=require("../app/src/main/assets/midi_thing_v2_dsp.js");
const port=(mode,extra={})=>Object.assign({mode,channel:0,voice:1,cc:1,range:2},extra);
const params=(overrides={})=>Object.assign({midiChannel:0,voiceCount:8,priority:0,glideTime:0,glideMode:0,voltageRange:2,attack:0.01,decay:0.1,sustain:0.7,release:0.1,lfoRate:1,lfoWave:0,ports:Array.from({length:12},()=>port("OFF"))},overrides);
const event=(s,a=0,b=0,p)=>MIDIThing.handleMidi(s,s===undefined?0:s,a,b,p);
const send=(s,p,status,a=0,b=0)=>MIDIThing.handleMidi(s,status,a,b,p);
const tick=(p,s,n=1,sr=48000)=>{let out;for(let i=0;i<n;i++)out=MIDIThing.process(p,s,sr);return out};

test("creates twelve independent assignable outputs and fixed polyphonic voice state",()=>{
 const s=MIDIThing.createState(48000);
 assert.equal(s.outputs.length,12);assert.equal(s.voices.length,12);
 assert.notEqual(s.voices[0],s.voices[1]);assert.notEqual(s.voices[0].currentCV,s.voices[1].currentCV);
});
test("note CV follows one volt per octave with configurable unipolar and bipolar ranges",()=>{
 assert.equal(MIDIThing.noteVoltage(12,2),0);assert.equal(MIDIThing.noteVoltage(24,2),1);
 assert.equal(MIDIThing.noteVoltage(36,2),2);assert.equal(MIDIThing.noteVoltage(72,1),0);
 assert.equal(MIDIThing.noteVoltage(127,0),5);
});
test("note-on allocates a voice and maps pitch to the configured port",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("NOTE CV")]});
 send(s,p,0x90,72,100);const out=tick(p,s);
 assert.equal(out[0],5);assert.equal(s.activeVoices,1);assert.equal(s.voices[0].gate,1);
});
test("note-off releases the matching voice without releasing other notes",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("GATE",{voice:1}),port("GATE",{voice:2})]});
 send(s,p,0x90,60,100);send(s,p,0x90,67,90);tick(p,s);
 assert.equal(s.outputs[0],5);assert.equal(s.outputs[1],5);
 send(s,p,0x80,60,0);tick(p,s);
 assert.equal(s.outputs[0],0);assert.equal(s.outputs[1],5);
});
test("zero-velocity note-on is treated as note-off",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("GATE")]});
 send(s,p,0x90,60,100);send(s,p,0x90,60,0);tick(p,s);
 assert.equal(s.voices[0].gate,0);
});
test("velocity maps to the selected voltage range",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("VELOCITY",{range:2})]});
 send(s,p,0x90,60,127);assert.equal(tick(p,s)[0],10);
});
test("CC ports map the selected controller number and MIDI channel",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("CC",{cc:74,channel:2})]});
 send(s,p,0xB1,74,64);assert.ok(Math.abs(tick(p,s)[0]-64/127*10)<1e-6);
});
test("pitch bend is centered at zero in bipolar mode",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("PITCH BEND",{range:1})]});
 send(s,p,0xE0,0,64);assert.ok(Math.abs(tick(p,s)[0])<.001);
 send(s,p,0xE0,127,127);assert.ok(tick(p,s)[0]>4.9);
});
test("channel pressure and program change are independently mapped",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("CHANNEL PRESSURE"),port("PROGRAM CHANGE")]});
 send(s,p,0xD0,127,0);send(s,p,0xC0,127,0);tick(p,s);
 assert.equal(s.outputs[0],10);assert.equal(s.outputs[1],10);
});
test("MIDI channel filter blocks events from other channels",()=>{
 const s=MIDIThing.createState(),p=params({midiChannel:2,ports:[port("GATE")]});
 send(s,p,0x90,60,100);assert.equal(tick(p,s)[0],0);
 send(s,p,0x91,60,100);assert.equal(tick(p,s)[0],5);
});
test("per-port channel selection filters voice and controller outputs",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("GATE",{channel:2}),port("CC",{channel:1,cc:1})]});
 send(s,p,0x90,60,100);send(s,p,0xB0,1,127);tick(p,s);
 assert.equal(s.outputs[0],0);assert.equal(s.outputs[1],10);
});
test("voice allocation is bounded by configured polyphony",()=>{
 const s=MIDIThing.createState(),p=params({voiceCount:2,ports:[port("GATE",{voice:1}),port("GATE",{voice:2})]});
 send(s,p,0x90,60,100);send(s,p,0x90,64,100);send(s,p,0x90,67,100);
 assert.equal(s.droppedNotes,0);assert.equal(s.activeVoices,2);assert.equal(s.voices.filter(v=>v.active).length,2);
});
test("no-steal priority rejects new notes when all voices are occupied",()=>{
 const s=MIDIThing.createState(),p=params({voiceCount:1,priority:3});
 send(s,p,0x90,60,100);send(s,p,0x90,67,100);
 assert.equal(s.voices[0].note,60);assert.equal(s.droppedNotes,1);
});
test("low-note priority keeps lower incoming notes and steals a higher note",()=>{
 const s=MIDIThing.createState(),p=params({voiceCount:1,priority:1});
 send(s,p,0x90,72,100);send(s,p,0x90,48,100);
 assert.equal(s.voices[0].note,48);
});
test("high-note priority keeps higher incoming notes and steals a lower note",()=>{
 const s=MIDIThing.createState(),p=params({voiceCount:1,priority:2});
 send(s,p,0x90,48,100);send(s,p,0x90,72,100);
 assert.equal(s.voices[0].note,72);
});
test("sustain pedal defers note release until pedal-up",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("GATE")]});
 send(s,p,0xB0,64,127);send(s,p,0x90,60,100);send(s,p,0x80,60,0);tick(p,s);
 assert.equal(s.voices[0].gate,1);send(s,p,0xB0,64,0);tick(p,s);assert.equal(s.voices[0].gate,0);
});
test("ADSR rises, decays to sustain, and releases to zero",()=>{
 const s=MIDIThing.createState(),p=params({attack:0.001,decay:0.002,sustain:0.5,release:0.002,ports:[port("ADSR")]});
 send(s,p,0x90,60,100);tick(p,s,100);assert.ok(s.outputs[0]>4.8);
 tick(p,s,500);assert.ok(Math.abs(s.outputs[0]-5)<.2);
 send(s,p,0x80,60,0);tick(p,s,1000);assert.ok(s.outputs[0]<.01);
});
test("clock messages create a bounded 10 ms gate pulse",()=>{
 const s=MIDIThing.createState(48000),p=params({ports:[port("CLOCK")]});
 send(s,p,0xF8,0,0);assert.equal(tick(p,s,1,48000)[0],5);
 tick(p,s,600,48000);assert.equal(s.outputs[0],0);assert.equal(s.clockCount,1);
});
test("start, continue and stop map to the transport gate",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("START/STOP")]});
 send(s,p,0xFA);assert.equal(tick(p,s)[0],5);send(s,p,0xFC);assert.equal(tick(p,s)[0],0);
});
test("RPN and NRPN data entry map 14-bit parameter values",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("RPN"),port("NRPN")]});
 send(s,p,0xB0,101,0);send(s,p,0xB0,100,1);send(s,p,0xB0,6,64);
 send(s,p,0xB0,99,2);send(s,p,0xB0,98,3);send(s,p,0xB0,6,127);tick(p,s);
 assert.ok(s.outputs[0]>0);assert.ok(s.outputs[1]>0);
});
test("LFO is bounded, rate-controlled and deterministic",()=>{
 const a=MIDIThing.createState(),b=MIDIThing.createState(),p=params({lfoRate:2,ports:[port("LFO")]});
 const x=tick(p,a,100),y=tick(p,b,100);assert.deepEqual([...x],[...y]);assert.ok(x[0]>=0&&x[0]<=10);
});
test("oscillator output follows note pitch and envelope",()=>{
 const s=MIDIThing.createState(),p=params({attack:0,ports:[port("OSCILLATOR")]});
 send(s,p,0x90,69,127);tick(p,s,1);const phase=s.voices[0].phase;
 tick(p,s,100);assert.ok(s.voices[0].phase>phase);assert.ok(Number.isFinite(s.outputs[0]));
});
test("all notes off releases every active voice without changing transport",()=>{
 const s=MIDIThing.createState(),p=params({ports:[port("GATE")]});
 send(s,p,0x90,60,100);send(s,p,0x90,64,100);send(s,p,0xFA);MIDIThing.allNotesOff(s);tick(p,s);
 assert.ok(s.voices.every(v=>v.gate===0));assert.equal(s.running,1);
});
test("invalid messages and non-finite settings never produce non-finite outputs",()=>{
 const s=MIDIThing.createState(),p=params({attack:NaN,decay:NaN,sustain:NaN,release:NaN,lfoRate:NaN,ports:[port("LFO")]});
 assert.equal(send(s,p,0xF1,1,2),false);send(s,p,0x90,60,127);const out=tick(p,s,100);
 assert.ok([...out].every(Number.isFinite));
});
test("processing reuses the output buffer and keeps all twelve values bounded",()=>{
 const s=MIDIThing.createState(),p=params({ports:Array.from({length:12},(_,i)=>port(i%2?"LFO":"CC",{cc:i}))});
 const a=tick(p,s),b=tick(p,s);assert.equal(a,b);assert.equal(a.length,12);assert.ok([...a].every(v=>v>=-10&&v<=10));
});
