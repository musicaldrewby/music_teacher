import {AUDIO_BANDS,AUDIO_HZ,AUDIO_STRIDE,audioFingerprint,type AudioAnalysis} from './audio-reactive-schema';
export interface PCM {sampleRate:number;length:number;numberOfChannels:number;getChannelData:(channel:number)=>Float32Array}
const N=2048;
// Radix-2 FFT. Power from each channel is combined, preserving out-of-phase stereo.
function fft(real:Float64Array,imag:Float64Array){
 for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[real[i],real[j]]=[real[j],real[i]];}
 for(let size=2;size<=N;size*=2){const a=-2*Math.PI/size,wr=Math.cos(a),wi=Math.sin(a);for(let start=0;start<N;start+=size){let r=1,im=0;for(let j=0;j<size/2;j++){const k=start+j,l=k+size/2,tr=r*real[l]-im*imag[l],ti=r*imag[l]+im*real[l];real[l]=real[k]-tr;imag[l]=imag[k]-ti;real[k]+=tr;imag[k]+=ti;const nr=r*wr-im*wi;im=r*wi+im*wr;r=nr;}}}
}
export async function analyzePCM(pcm:PCM,data:string,yieldWork:()=>Promise<void>=async()=>{}):Promise<AudioAnalysis>{
 const duration=pcm.length/pcm.sampleRate;
 if(!Number.isFinite(duration)||duration<=0||duration>600)throw Error('Choose audio up to 10 minutes long.');
 const rate=pcm.sampleRate,channels=Array.from({length:Math.min(2,pcm.numberOfChannels)},(_,i)=>pcm.getChannelData(i));
 const count=Math.ceil(duration*AUDIO_HZ)+1,rows:number[][]=[],flux:number[]=[],prev=new Float64Array(AUDIO_BANDS),window=Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)));
 const ceiling=Math.min(20000,rate/2);
 const real=new Float64Array(N),imag=new Float64Array(N),power=new Float64Array(N/2);
 for(let f=0;f<count;f++){
  power.fill(0);let square=0,samples=0;
  for(const ch of channels){imag.fill(0);for(let i=0;i<N;i++){const p=((f/AUDIO_HZ)+(i-N/2)/rate)*pcm.sampleRate,lo=Math.floor(p),v=lo>=0&&lo+1<ch.length?ch[lo]+(ch[lo+1]-ch[lo])*(p-lo):0;real[i]=v*window[i];square+=v*v;samples++;}fft(real,imag);for(let k=1;k<N/2;k++)power[k]+=(real[k]*real[k]+imag[k]*imag[k])/(N*N*channels.length);}
  const bins=new Array<number>(AUDIO_BANDS).fill(0);let bass=0,mids=0,treble=0;
  for(let k=1;k<N/2;k++){const hz=k*rate/N;if(hz<30||hz>=ceiling)continue;if(hz<250)bass+=power[k];else if(hz<2000)mids+=power[k];else treble+=power[k];const b=Math.min(AUDIO_BANDS-1,Math.max(0,Math.floor(Math.log(hz/30)/Math.log(ceiling/30)*AUDIO_BANDS)));bins[b]+=power[k];}
  const spectrum=bins.map(v=>Math.sqrt(v));let onset=0;for(let b=0;b<AUDIO_BANDS;b++){onset+=Math.max(0,spectrum[b]-prev[b]);prev[b]=spectrum[b];}flux.push(onset);
  rows.push([Math.sqrt(square/Math.max(1,samples)),Math.sqrt(bass),Math.sqrt(mids),Math.sqrt(treble),0,...spectrum]);
  if(f%32===31)await yieldWork();
 }
 const peak=(values:number[])=>{const sorted=values.filter(v=>v>1e-6).sort((a,b)=>a-b);return Math.max(.008,sorted[Math.floor(sorted.length*.97)]||0);};
 const levelPeak=peak(rows.map(r=>r[0])),frequencyPeak=peak(rows.flatMap(r=>r.slice(5))),bandPeak=Math.max(peak(rows.map(r=>r[1])),peak(rows.map(r=>r[2])),peak(rows.map(r=>r[3])));
 const beats:number[]=[];let last=-1;
 for(let i=1;i<flux.length-1;i++){const start=Math.max(0,i-16);let mean=0;for(let j=start;j<i;j++)mean+=flux[j];mean/=Math.max(1,i-start);if(flux[i]>.012&&flux[i]>mean*1.55&&flux[i]>=flux[i-1]&&flux[i]>flux[i+1]&&i/AUDIO_HZ-last>=.25&&i/AUDIO_HZ<duration){last=i/AUDIO_HZ;beats.push(last);}}
 let bi=-1;const frames:number[]=[];
 rows.forEach((r,i)=>{while(bi+1<beats.length&&beats[bi+1]<=i/AUDIO_HZ)bi++;r[4]=bi>=0?Math.exp(-(i/AUDIO_HZ-beats[bi])/.14):0;for(let j=0;j<AUDIO_STRIDE;j++){const value=j===4?r[j]:Math.sqrt(Math.max(0,r[j]-(j===0?.001:.0002))/(j===0?levelPeak:j<4?bandPeak:frequencyPeak));frames.push(Math.round(Math.min(1,value)*255));}});
 const intervals=beats.slice(1).map((t,i)=>t-beats[i]).filter(t=>t>=.25&&t<=2).sort((a,b)=>a-b),median=intervals[Math.floor(intervals.length/2)],bpm=intervals.length>=4?Math.min(250,Math.round(60/median)):0;
 return {version:1,duration,hz:AUDIO_HZ,source:audioFingerprint(data),frames,beats,bpm};
}
export async function analyzeAudioData(data:string){const {decodeData}=await import('./models');const context=new AudioContext();try{return await analyzePCM(await context.decodeAudioData(decodeData(data)),data,()=>new Promise(resolve=>setTimeout(resolve,0)));}finally{await context.close();}}
export async function importReactiveAudio(file:File){
 if(file.size>4_000_000)throw Error('Choose audio smaller than 4 MB. MP3 works well for longer songs.');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const mime=file.type.startsWith('audio/')?file.type.split(';')[0]:/\.wav$/i.test(file.name)?'audio/wav':/\.ogg$/i.test(file.name)?'audio/ogg':/\.m4a$/i.test(file.name)?'audio/mp4':'audio/mpeg';
 const data=`data:${mime};base64,${btoa(binary)}`,analysis=await analyzeAudioData(data);return {name:file.name.slice(0,120),data,analysis};
}
export function demoBeatFile(){const rate=12000,seconds=12,n=rate*seconds,bytes=new ArrayBuffer(44+n*2),v=new DataView(bytes);const str=(p:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++){const t=i/rate,b=t%.5,h=t%.25,kick=Math.sin(2*Math.PI*(52*b+3*(1-Math.exp(-b*30))))*Math.exp(-b*16),hat=Math.sin(t*2*Math.PI*4000)*Math.exp(-h*80),note=[220,277.18,329.63,415.3][Math.floor(t/1.5)%4],pad=Math.sin(t*2*Math.PI*note)*.14*(1-Math.exp(-b*30));v.setInt16(44+i*2,Math.max(-1,Math.min(1,kick*.65+hat*.12+pad))*30000,true);}return new File([bytes],'Prism demo beat.wav',{type:'audio/wav'});}
