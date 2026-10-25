// Kokoro 1.0 neural speech: real 24 kHz PCM, rendered locally in a module worker.
import {ort,phonemize} from './vendor/neural/runtime.mjs';
const ROOT=new URL('../assets/neural-v1/',import.meta.url),RATE=24000;
const VOICES=new Set(['af_heart','af_bella','af_sky','am_michael','am_puck','bm_fable']);
async function cachedBytes(name,expected){
 const url=new URL(name,ROOT).href;let cache,response;
 try{cache=await globalThis.caches?.open('felt-neural-v1');response=await cache?.match(url)}catch{}
 if(!response){response=await fetch(url);if(!response.ok)throw Error('The natural voice pack could not download. Check your connection and retry.');if(cache)try{await cache.put(url,response.clone())}catch{}}
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(expected?.bytes&&bytes.length!==expected.bytes){await cache?.delete(url);throw Error('A voice download was incomplete. Please retry.')}
 if(expected?.sha256&&globalThis.crypto?.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==expected.sha256){await cache?.delete(url);throw Error('A voice download was incomplete. Please retry.')}}
 return bytes;
}
export function splitSpeechText(text,max=220){
 const out=[];for(const sentence of text.match(/[^.!?\n]+(?:[.!?]+["”']?|$)|\S+/g)||[]){let pending=sentence.trim();while(pending.length>max){let at=pending.lastIndexOf(' ',max);if(at<max/3)at=max;out.push(pending.slice(0,at).trim());pending=pending.slice(at).trim()}if(pending)out.push(pending)}return out;
}
export async function createNeuralEngine({readBytes=cachedBytes,progress=()=>{}}={}){
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=new URL('./vendor/neural/',import.meta.url).href;
 progress('Loading natural voices…',0);
 const manifest=JSON.parse(new TextDecoder().decode(await readBytes('manifest.json'))),total=manifest.parts.reduce((n,p)=>n+p.bytes,0),model=new Uint8Array(manifest.parts.reduce((n,p)=>n+(p.rawBytes||p.bytes),0));let offset=0,loaded=0;
 for(const part of manifest.parts){const bytes=await readBytes(part.file,part);let raw=bytes;if(part.encoding==='gzip'){if(typeof DecompressionStream==='undefined')throw Error('Natural voices need a current browser. Update your browser or choose Classic robot.');raw=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())}if(raw.length!==(part.rawBytes||part.bytes))throw Error('A voice download was incomplete. Please retry.');model.set(raw,offset);offset+=raw.length;loaded+=part.bytes;progress('Downloading natural voice pack',loaded/total*.8)}
 const tokenizer=JSON.parse(new TextDecoder().decode(await readBytes('tokenizer.json',manifest.files['tokenizer.json']))),vocab=tokenizer.model.vocab;
 progress('Preparing natural voices…',.85);const session=await ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'});const voices=new Map();
 progress('Natural voices ready',1);
 async function synthesize(text,{speaker='af_heart',speed=1,delivery='normal'}={}){
  if(typeof text!=='string'||!text.trim()||text.length>600)throw Error('Enter 1–600 characters per line.');
  if(!VOICES.has(speaker)||!Number.isFinite(speed)||speed<.6||speed>1.6)throw Error('Invalid natural voice settings.');
  let clean=text.normalize('NFKC').replace(/[<>\x00-\x1f]/g,' ').replace(/[—–]/g,', ').trim();
  if(['cheerful','excited'].includes(delivery))clean=clean.replace(/\.(?=\s|$)/g,'!');
  const file='voices/'+speaker+'.bin';if(!voices.has(speaker)){const bytes=await readBytes(file,manifest.files[file]);voices.set(speaker,new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)))}
  const voice=voices.get(speaker),chunks=splitSpeechText(clean),audio=[];let length=0;
  for(const [index,chunk]of chunks.entries()){
   progress('Speaking sentence '+(index+1)+' of '+chunks.length,index/chunks.length);
   const phones=await phonemize(chunk,speaker[0]==='b'?'b':'a'),tokens=Array.from(phones).map(p=>vocab[p]).filter(x=>x!==undefined);
   if(!tokens.length)throw Error('No speech could be made from this text. Try a short English line.');if(tokens.length>510)throw Error('Please add punctuation or shorten this sentence.');
   const ids=BigInt64Array.from([0,...tokens,0],n=>BigInt(n)),style=voice.slice(Math.min(tokens.length,509)*256,Math.min(tokens.length,509)*256+256);
   const inputs={input_ids:new ort.Tensor('int64',ids,[1,ids.length]),style:new ort.Tensor('float32',style,[1,256]),speed:new ort.Tensor('float32',Float32Array.of(speed),[1])};
   const outputs=await session.run(inputs),wave=outputs.waveform||outputs[Object.keys(outputs)[0]],samples=new Float32Array(wave.data);
   for(const tensor of Object.values(inputs))tensor.dispose();for(const tensor of Object.values(outputs))tensor.dispose();
   if(!samples.length||samples.some(v=>!Number.isFinite(v)))throw Error('The voice engine returned invalid audio. Please retry.');
   // A tiny edge fade suppresses clicks without resampling or changing the voice's pitch.
   const edge=Math.min(120,Math.floor(samples.length/4));for(let j=0;j<edge;j++){samples[j]*=j/edge;samples[samples.length-1-j]*=j/edge}
   audio.push(samples);length+=samples.length;if(index<chunks.length-1){const silence=new Float32Array(Math.round(RATE*(delivery==='sleepy'?.26:.10)));audio.push(silence);length+=silence.length}
  }
  const samples=new Float32Array(length);let at=0;for(const chunk of audio){samples.set(chunk,at);at+=chunk.length}return{samples,sampleRate:RATE,engine:'kokoro-1.0-q8-music-v3'};
 }
 return{synthesize,dispose:()=>session.release()};
}
