// SVOX Pico returns PCM, so saved speech uses the normal sound/export pipeline.
import createPico from './vendor/pico/pico.mjs';
export async function createSpeechEngine(readFile) {
 const base=new URL('./vendor/pico/',import.meta.url);
 const read=readFile|| (async name=>{const r=await fetch(new URL(name,base));if(!r.ok)throw Error('Could not load the speech voice. Please retry.');return new Uint8Array(await r.arrayBuffer())});
 const [wasm,ta,sg]=await Promise.all(['svoxpico.wasm','en-US_ta.bin','en-US_lh0_sg.bin'].map(read));
 const m=await createPico({wasmBinary:wasm,locateFile:name=>new URL(name,base).href,print(){},printErr(){}});
 const check=(code,task)=>{if(code!==0)throw Error(task+' failed ('+code+').')};
 const memory=m._malloc(8*1024*1024),slot=m._malloc(4),resource=m._malloc(4),name=m._malloc(256),voice=m._malloc(16);
 const str=(text)=>{const b=new TextEncoder().encode(text+'\0'),p=m._malloc(b.length);m.HEAPU8.set(b,p);return p};
 check(m._pico_initialize(memory,8*1024*1024,slot),'Speech initialization');const system=m.getValue(slot,'i32');
 m.HEAPU8.set(new TextEncoder().encode('felt-en\0'),voice);check(m._pico_createVoiceDefinition(system,voice),'Voice setup');
 for(const [filename,bytes]of [['voice-ta.bin',ta],['voice-sg.bin',sg]]){m.FS.writeFile('/'+filename,bytes);const p=str('/'+filename);try{check(m._pico_loadResource(system,p,resource),'Voice loading');check(m._pico_getResourceName(system,m.getValue(resource,'i32'),name),'Voice resource');check(m._pico_addResourceToVoiceDefinition(system,voice,name),'Voice mapping')}finally{m._free(p)}}
 check(m._pico_newEngine(system,voice,slot),'Speech engine');const engine=m.getValue(slot,'i32');
 const output=m._malloc(8192),written=m._malloc(2),received=m._malloc(2),kind=m._malloc(2);
 function synthesize(text,{pitch=1,speed=1}={}){
  if(typeof text!=='string'||!text.trim()||text.length>600)throw Error('Enter 1–600 characters per line.');
  if(!Number.isFinite(pitch)||pitch<.65||pitch>1.8||!Number.isFinite(speed)||speed<.6||speed>1.6)throw Error('Invalid voice settings.');
  const clean=text.normalize('NFKC').replace(/[<>\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[—–]/g,', ').replace(/…/g,'...');
  const xml='<pitch level="'+Math.round(pitch*100)+'"><speed level="'+Math.round(speed*100)+'">'+clean+'</speed></pitch>\0';
  const bytes=new TextEncoder().encode(xml),input=m._malloc(bytes.length);m.HEAPU8.set(bytes,input);const chunks=[];let total=0,offset=0,steps=0;
  check(m._pico_resetEngine(engine,0x10),'Speech reset');
  try{while(offset<bytes.length){check(m._pico_putTextUtf8(engine,input+offset,Math.min(2000,bytes.length-offset),written),'Speech input');const used=m.getValue(written,'i16');offset+=used;let result;
    do{result=m._pico_getData(engine,output,8192,received,kind);if(result!==200&&result!==201)throw Error('Speech synthesis failed ('+result+').');const n=m.getValue(received,'i16');if(n){if(m.getValue(kind,'i16')!==1)throw Error('Unsupported speech audio.');const chunk=m.HEAP16.slice(output>>1,(output+n)>>1);chunks.push(chunk);total+=chunk.length;}if(++steps>250000||total>16000*180)throw Error('This line is too long to synthesize.');}while(result===201);
    if(!used&&offset<bytes.length)throw Error('Speech input stalled.');
   }
  }finally{m._free(input)}
  if(total<160)throw Error('No speech was produced. Try a short English sentence.');
  const samples=new Float32Array(total);let at=0;for(const chunk of chunks){for(let i=0;i<chunk.length;i++)samples[at+i]=chunk[i]/32768;at+=chunk.length;}
  return{samples,sampleRate:16000};
 }
 return{synthesize};
}
