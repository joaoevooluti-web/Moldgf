const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"noisePlethora",ports:[
 ...["programCVA","xCVA","yCVA","cutoffCVA","programCVB","xCVB","yCVB","cutoffCVB","cutoffCVC","gritCV"].map(id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 ...["outA","outB","white","gritty","filtered"].map(id=>({id,direction:"output",signal:"audio",channels:1}))
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"cv",direction:"output",signal:"cv",channels:1},{id:"audio",direction:"output",signal:"audio",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Noise Plethora exposes ten CV inputs and five independent audio outputs",()=>{
 const d=registry().get("noisePlethora");assert.equal(d.ports.filter(p=>p.direction==="input").length,10);assert.equal(d.ports.filter(p=>p.direction==="output").length,5);
});
test("program, X/Y and cutoff CV sources connect to the correct ports",()=>{
 const r=registry(),src={id:"s",type:"source"},n={id:"n",type:"noisePlethora"};
 for(const port of ["programCVA","xCVA","yCVB","cutoffCVC","gritCV"])assert.equal(Graph.canConnect(r,src,"cv",n,port).ok,true,port);
});
test("all five Noise Plethora outputs connect to downstream audio inputs",()=>{
 const r=registry(),n={id:"n",type:"noisePlethora"},sink={id:"s",type:"sink"};
 for(const port of ["outA","outB","white","gritty","filtered"])assert.equal(Graph.canConnect(r,n,port,sink,"audio").ok,true,port);
});
test("Noise Plethora rejects audio outputs on CV-only destinations",()=>{
 const r=registry(),n={id:"n",type:"noisePlethora"},sink={id:"s",type:"sink"};
 assert.equal(Graph.canConnect(r,n,"outA",sink,"cv").ok,false);
});
test("Noise Plethora CV modulation and multiple audio outs validate as a graph",()=>{
 const r=registry(),mods=[{id:"cv",type:"source"},{id:"noise",type:"noisePlethora"},{id:"out",type:"sink"}];
 const g=Graph.validateGraph(r,mods,[{from:{module:"cv",port:"cv"},to:{module:"noise",port:"xCVA"}},{from:{module:"noise",port:"outA"},to:{module:"out",port:"audio"}}]);
 assert.equal(g.valid,true);assert.deepEqual(g.order,["cv","noise","out"]);
});
