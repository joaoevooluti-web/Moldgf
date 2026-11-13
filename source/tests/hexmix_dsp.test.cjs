const test=require("node:test");
const assert=require("node:assert/strict");
const Hexmix=require("../app/src/main/assets/hexmix_dsp.js");
const params=(overrides={})=>Object.assign({volume:Array(6).fill(1),low:Array(6).fill(0),mid:Array(6).fill(0),high:Array(6).fill(0),pan:Array(6).fill(0),mute:Array(6).fill(0),masterVolume:1,masterLow:0,masterMid:0,masterHigh:0,outputLevel:0},overrides);
test("Hexmix creates six independent channel strips and stereo master filters",()=>{const s=Hexmix.createState(48000);assert.equal(s.channels.length,6);assert.notEqual(s.channels[0],s.channels[1]);assert.equal(s.master.length,2)});
test("six input channels are mixed to stereo with constant-power center pan",()=>{const s=Hexmix.createState(48000),r=Hexmix.process(params(),{inputs:[1,0,0,0,0,0]},s,48000);assert.ok(Math.abs(r.left-r.right)<1e-6);assert.ok(Math.abs(r.left-Math.SQRT1_2)<.02)});
test("hard left and right pan isolate the corresponding master channel",()=>{const a=Hexmix.createState(48000),b=Hexmix.createState(48000),p=params({pan:[-1,0,0,0,0,0]});const l=Hexmix.process(p,{inputs:[1,0,0,0,0,0]},a,48000);const q=Hexmix.process(params({pan:[1,0,0,0,0,0]}),{inputs:[1,0,0,0,0,0]},b,48000);assert.ok(Math.abs(l.left)>Math.abs(l.right)*100);assert.ok(Math.abs(q.right)>Math.abs(q.left)*100)});
test("channel volume scales the post-EQ signal",()=>{const a=Hexmix.createState(48000),b=Hexmix.createState(48000),x={inputs:[.5,0,0,0,0,0]};const full=Hexmix.process(params(),x,a,48000),half=Hexmix.process(params({volume:[.5,1,1,1,1,1]}),x,b,48000);assert.ok(Math.abs(half.left)<Math.abs(full.left))});
test("latched mute smoothly closes a channel without a hard discontinuity",()=>{const s=Hexmix.createState(48000),p=params({mute:[1,0,0,0,0,0]});const r=Hexmix.process(p,{inputs:[1,0,0,0,0,0]},s,48000);assert.ok(r.left>0);for(let n=0;n<2000;n++)Hexmix.process(p,{inputs:[1,0,0,0,0,0]},s,48000);assert.ok(s.channels[0].muteGain<.4)});
test("momentary mute switch produces a short unmute pulse then closes",()=>{const s=Hexmix.createState(48000),p=params({mute:[2,0,0,0,0,0]});Hexmix.process(p,{inputs:[1,0,0,0,0,0]},s,48000);assert.ok(s.channels[0].momentaryCount>0);for(let n=0;n<8000;n++)Hexmix.process(p,{inputs:[1,0,0,0,0,0]},s,48000);assert.equal(s.channels[0].momentaryCount,0)});
test("momentary switch only triggers on its state transition",()=>{const s=Hexmix.createState(48000),p=params({mute:[2,0,0,0,0,0]});Hexmix.process(p,{inputs:[1,0,0,0,0,0]},s,48000);const count=s.channels[0].momentaryCount;Hexmix.process(p,{inputs:[1,0,0,0,0,0]},s,48000);assert.equal(s.channels[0].momentaryCount,count-1)});
test("channel EQ gain changes the low, mid and high filter responses",()=>{const a=Hexmix.createState(48000),b=Hexmix.createState(48000),p=params({low:[12,0,0,0,0,0],mid:[0,12,0,0,0,0],high:[0,0,12,0,0,0]});let x,y;for(let n=0;n<1024;n++){const v=Math.sin(n*.1);x=Hexmix.process(params(),{inputs:[v,v,v,0,0,0]},a,48000);y=Hexmix.process(p,{inputs:[v,v,v,0,0,0]},b,48000)}assert.ok(Number.isFinite(x.left)&&Number.isFinite(y.left));assert.notEqual(x.left,y.left)});
test("master EQ affects the stereo sum after channel pan",()=>{const a=Hexmix.createState(48000),b=Hexmix.createState(48000);let x,y;for(let n=0;n<512;n++){const v=Math.sin(n*.1);x=Hexmix.process(params(),{inputs:[v,0,0,0,0,0]},a,48000);y=Hexmix.process(params({masterLow:6}),{inputs:[v,0,0,0,0,0]},b,48000)}assert.notEqual(x.left,y.left)});
test("master volume scales the complete mix",()=>{const a=Hexmix.createState(48000),b=Hexmix.createState(48000),input={inputs:[1,1,1,1,1,1]};const full=Hexmix.process(params(),input,a,48000),half=Hexmix.process(params({masterVolume:.5}),input,b,48000);assert.ok(Math.abs(half.left)<Math.abs(full.left))});
test("line-level output switch attenuates modular-level master output",()=>{const a=Hexmix.createState(48000),b=Hexmix.createState(48000),input={inputs:[1,0,0,0,0,0]};const modular=Hexmix.process(params(),input,a,48000),line=Hexmix.process(params({outputLevel:1}),input,b,48000);assert.ok(Math.abs(line.left)<Math.abs(modular.left)*.3)});
test("VCA expander output normalizes into each unpatched channel input",()=>{const s=Hexmix.createState(48000),r=Hexmix.process(params(),{hostInputs:[1,2,3,4,5,6]},s,48000);assert.deepEqual([...r.post], [1,2,3,4,5,6])});
test("direct channel input overrides the normalized VCA expander signal",()=>{const s=Hexmix.createState(48000),r=Hexmix.process(params(),{inputs:[null,.25,null,null,null,null],hostInputs:[1,2,3,4,5,6]},s,48000);assert.equal(r.pre[1],.25);assert.equal(r.pre[0],1)});
test("pre-EQ, post-EQ and post-fader expansion taps are available",()=>{const s=Hexmix.createState(48000),r=Hexmix.process(params({low:[12,0,0,0,0,0],volume:[.5,1,1,1,1,1]}),{inputs:[1,0,0,0,0,0]},s,48000);assert.equal(r.pre[0],1);assert.notEqual(r.postEq[0],r.pre[0]);assert.ok(Math.abs(r.post[0])<Math.abs(r.postEq[0]))});
test("channel meters and master clipping indicator follow signal level",()=>{const s=Hexmix.createState(48000),r=Hexmix.process(params({volume:Array(6).fill(2)}),{inputs:[2,2,2,2,2,2]},s,48000);assert.ok(r.meters[0]>0);assert.ok(r.peak>0);assert.equal(r.clipping,r.peak>1)});
test("sample-rate changes rebuild all six channel and master filters",()=>{const s=Hexmix.createState(48000);Hexmix.process(params(),{inputs:[.2,0,0,0,0,0]},s,48000);Hexmix.process(params(),{inputs:[.2,0,0,0,0,0]},s,44100);assert.equal(s.sampleRate,44100);assert.ok(s.channels.every(c=>Number.isFinite(c.low.coeff.b0)))});
test("invalid controls and inputs remain finite",()=>{const s=Hexmix.createState(48000),r=Hexmix.process({volume:[NaN],low:[NaN],mid:[NaN],high:[NaN],pan:[NaN],mute:[NaN],masterVolume:NaN,outputLevel:NaN},{inputs:[NaN]},s,48000);assert.ok(Number.isFinite(r.left)&&Number.isFinite(r.right))});
test("Hexmix reuses its result object and expansion buffers",()=>{const s=Hexmix.createState(48000),a=Hexmix.process(params(),{inputs:[.2,0,0,0,0,0]},s,48000),b=Hexmix.process(params(),{inputs:[.3,0,0,0,0,0]},s,48000);assert.equal(a,b);assert.equal(a.pre,s.pre);assert.equal(a.post,s.post)});


test("STMix rear expansion is summed into the Hexmix master section before master level",()=>{
 const s=Hexmix.createState(48000);
 const r=Hexmix.process(params({masterVolume:.5}),{
  inputs:[0,0,0,0,0,0],expansionLeft:.5,expansionRight:-.25
 },s,48000);
 assert.ok(Math.abs(r.left-.25)<1e-9);
 assert.ok(Math.abs(r.right+.125)<1e-9);
});

test("master EQ also processes the modeled STMix expansion bus",()=>{
 const flat=Hexmix.createState(48000),eq=Hexmix.createState(48000);
 let a=0,b=0;
 for(let n=0;n<1024;n++){
  const v=Math.sin(n*.11);
  a=Hexmix.process(params(),{expansionLeft:v,expansionRight:v},flat,48000).left;
  b=Hexmix.process(params({masterLow:6}),{expansionLeft:v,expansionRight:v},eq,48000).left;
 }
 assert.notEqual(a,b);
});

test("non-finite STMix expansion values are treated as silence",()=>{
 const s=Hexmix.createState(48000);
 const r=Hexmix.process(params(),{expansionLeft:NaN,expansionRight:Infinity},s,48000);
 assert.equal(r.left,0);
 assert.equal(r.right,0);
});
