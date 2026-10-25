import {projectTempoMap} from './tempo-map.js';
import {compileScore,barBeats,songBeats,trackAudible,patternProject} from './sequencer-model.js';
const text=s=>new TextEncoder().encode(s);
const be=(n,count)=>Array.from({length:count},(_,i)=>(n>>>((count-i-1)*8))&255);
function variable(n){let out=[n&127];while((n>>>=7))out.unshift((n&127)|128);return out}
function meta(type,data){return [255,type,...variable(data.length),...data]}
function midiTrack(events,end){let previous=0,bytes=[];events.sort((a,b)=>a.at-b.at||a.order-b.order);for(const e of events){bytes.push(...variable(e.at-previous),...e.data);previous=e.at}bytes.push(...variable(Math.max(0,end-previous)),255,47,0);return new Uint8Array([...text('MTrk'),...be(bytes.length,4),...bytes])}
function gs(address,value){const body=[65,16,66,18,64,...address,value];return [240,...variable(body.length+2),...body,(128-(64+address[0]+address[1]+value)%128)%128,247]}
export function exportMIDI(p){
 if(p.version===2)p=patternProject(p);
 const ppq=960,tick=b=>Math.round(b*ppq),end=tick(songBeats(p)),parts=[];
 const conductor=[{at:0,order:0,data:meta(3,text(p.name))},{at:0,order:2,data:meta(88,[p.meter[0],Math.log2(p.meter[1]),24,8])}];
 for(const change of projectTempoMap(p).points)conductor.push({at:tick(change.beat),order:1,data:meta(81,be(Math.round(60000000/change.tempo),3))});
 for(const s of p.sections||[])conductor.push({at:tick((s.from-1)*barBeats(p)),order:3,data:meta(6,text(s.name))});parts.push(midiTrack(conductor,end));
 const score=compileScore({...p,loop:false,metronome:'off'},false);
 p.tracks.forEach((t,i)=>{
  const ch=i===7?9:i,part=ch===9?0:ch<9?ch+1:ch,events=[],add=(order,data)=>events.push({at:0,order,data});
  add(-9,meta(3,text(t.name)));add(-8,gs([16+part,21],t.patch.isGMGSDrum?1:0));
  for(const [cc,value] of [[0,t.patch.bankMSB],[32,t.patch.bankLSB]])add(-7,[176+ch,cc,value]);add(-6,[192+ch,t.patch.program]);
  for(const [cc,value] of [[7,trackAudible(p,i)?t.volume:0],[10,t.pan],[91,t.reverb],[94,t.delay],[73,t.shape.attack],[72,t.shape.release],[74,t.shape.brightness],[101,0],[100,0],[6,2],[38,0]])add(-5,[176+ch,cc,value]);
  const fine=Math.round(8192+t.shape.tune/100*8191);for(const [cc,value] of [[101,0],[100,1],[6,fine>>7],[38,fine&127],[101,127],[100,127]])add(-4,[176+ch,cc,value]);
  for(const e of score.events)if(e.message&&(e.message[0]&15)===i+8)events.push({at:tick(e.beat),order:e.order,data:[(e.message[0]&240)|ch,...e.message.slice(1)]});
  parts.push(midiTrack(events,end));
 });
 const length=14+parts.reduce((s,x)=>s+x.length,0),out=new Uint8Array(length);out.set([...text('MThd'),0,0,0,6,0,1,...be(parts.length,2),...be(ppq,2)]);let at=14;for(const part of parts){out.set(part,at);at+=part.length}return out;
}
export function wavBuffer(frames,rate){
 const out=new ArrayBuffer(44+frames*4),v=new DataView(out),put=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};
 put(0,'RIFF');v.setUint32(4,out.byteLength-8,true);put(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,frames*4,true);return out;
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0}
export function zipFiles(files){
 const size=22+files.reduce((sum,f)=>sum+76+text(f.name).length*2+f.data.byteLength,0),buffer=new ArrayBuffer(size),v=new DataView(buffer),out=new Uint8Array(buffer);let at=0;const central=[];
 for(const f of files){const name=text(f.name),data=new Uint8Array(f.data),checksum=crc(data),offset=at;v.setUint32(at,0x04034b50,true);v.setUint16(at+4,20,true);v.setUint16(at+6,0x800,true);v.setUint32(at+14,checksum,true);v.setUint32(at+18,data.length,true);v.setUint32(at+22,data.length,true);v.setUint16(at+26,name.length,true);out.set(name,at+30);out.set(data,at+30+name.length);at+=30+name.length+data.length;central.push({name,data,checksum,offset});}
 const start=at;for(const f of central){v.setUint32(at,0x02014b50,true);v.setUint16(at+4,20,true);v.setUint16(at+6,20,true);v.setUint16(at+8,0x800,true);v.setUint32(at+16,f.checksum,true);v.setUint32(at+20,f.data.length,true);v.setUint32(at+24,f.data.length,true);v.setUint16(at+28,f.name.length,true);v.setUint32(at+42,f.offset,true);out.set(f.name,at+46);at+=46+f.name.length}
 v.setUint32(at,0x06054b50,true);v.setUint16(at+8,files.length,true);v.setUint16(at+10,files.length,true);v.setUint32(at+12,at-start,true);v.setUint32(at+16,start,true);return buffer;
}
export const safeFilename=s=>String(s).replace(/[^a-z0-9_-]+/gi,'_').slice(0,80)||'Soundroom';
