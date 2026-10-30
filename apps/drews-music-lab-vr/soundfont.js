// GeneralUser GS 1.471, S. Christian Collins. See samples/soundfont/CREDITS.txt.
// Native Web Audio sample voices also work in OfflineAudioContext (WAV export).
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seconds=tc=>tc<=-32768?0:2**(clamp(tc,-12000,8000)/1200);
const defaults={8:13500,9:0,17:0,33:-12000,34:-12000,35:-12000,36:-12000,37:0,38:-12000,39:0,40:0,48:0,51:0,52:0,54:0,56:100,57:0};
export const FONT_INSTRUMENTS={piano:{program:0,gate:2.8},xylophone:{program:13,gate:1.4},metallophone:{program:11,gate:3.7},glockenspiel:{program:9,gate:3.2},cowbell:{program:0,bank:128,note:56,gate:1},maracas:{program:0,bank:128,note:70,gate:.6},tambourine:{program:0,bank:128,note:54,gate:1.5,gain:6},kick:{program:0,bank:128,note:36,gate:1},snare:{program:0,bank:128,note:38,gate:1},hat:{program:0,bank:128,note:42,gate:.4},clap:{program:0,bank:128,note:39,gate:1}};
export const WAVE_PROGRAMS={sine:80,triangle:98,sawtooth:81,square:80};
export const BASS_PROGRAMS={triangle:33,sawtooth:38,square:39};
let loading;
export function preloadSoundfont(){
 if(!loading)loading=(async()=>{
  const chunks=await Promise.all([1,2,3,4].map(async n=>{const response=await fetch(new URL(`./samples/soundfont/generaluser-1.471.part0${n}.bin`,import.meta.url),{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('SoundFont could not load.');return new Uint8Array(await response.arrayBuffer());}));
  const data=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  if(data.length!==31281186)throw Error('Incomplete SoundFont download.');
  return new SoundFontBank(data.buffer);
 })().catch(error=>{loading=null;throw error;});return loading;
}
export class SoundFontBank{
 constructor(data){
  this.data=data;this.view=new DataView(data);this.buffers=new Map();this.presets=new Map();const v=this.view,tag=o=>String.fromCharCode(...new Uint8Array(data,o,4));
  if(tag(0)!=='RIFF'||tag(8)!=='sfbk')throw Error('Invalid SoundFont.');
  const chunks={};const scan=(from,end)=>{for(let o=from;o+8<=end;){const n=v.getUint32(o+4,true),next=o+8+n;if(next>end)throw Error('Truncated SoundFont.');if(tag(o)==='LIST')scan(o+12,next);else chunks[tag(o)]={offset:o+8,length:n};o=next+(n&1);}};scan(12,data.byteLength);
  for(const name of ['smpl','phdr','pbag','pgen','inst','ibag','igen','shdr'])if(!chunks[name])throw Error('Incomplete SoundFont.');
  this.pcm=chunks.smpl.offset;this.pcmLength=chunks.smpl.length/2;
  const records=(name,size,read)=>{const c=chunks[name];return Array.from({length:c.length/size},(_,i)=>read(c.offset+i*size));};
  const u=o=>v.getUint16(o,true),s=o=>v.getInt16(o,true),l=o=>v.getUint32(o,true),name=o=>new TextDecoder().decode(new Uint8Array(data,o,20)).replace(/\0.*$/s,'');
  const ph=records('phdr',38,o=>({name:name(o),program:u(o+20),bank:u(o+22),bag:u(o+24)})),ins=records('inst',22,o=>({bag:u(o+20)}));
  this.samples=records('shdr',46,o=>({name:name(o),start:l(o+20),end:l(o+24),loopStart:l(o+28),loopEnd:l(o+32),rate:l(o+36),root:v.getUint8(o+40),correction:v.getInt8(o+41),type:u(o+44)}));
  const pb=records('pbag',4,o=>u(o)),ib=records('ibag',4,o=>u(o)),pg=records('pgen',4,o=>[u(o),s(o+2),u(o+2)]),ig=records('igen',4,o=>[u(o),s(o+2),u(o+2)]);
  const zones=(heads,bags,gens,index,terminal)=>{let global={};const result=[];for(let b=heads[index].bag;b<heads[index+1].bag;b++){const zone={};for(let g=bags[b];g<bags[b+1];g++){const [id,signed,unsigned]=gens[g];zone[id]=[41,43,44,53].includes(id)?unsigned:signed;}if(zone[terminal]===undefined)global=zone;else result.push({...global,...zone});}return result;};
  const instruments=ins.slice(0,-1).map((_,i)=>zones(ins,ib,ig,i,53));
  const range=(a,b,key)=>{const x=a[key]??32512,y=b[key]??32512;return[Math.max(x&255,y&255),Math.min(x>>8,y>>8)];};
  ph.slice(0,-1).forEach((p,i)=>{const result=[];for(const preset of zones(ph,pb,pg,i,41))for(const instrument of instruments[preset[41]]||[]){const g={...defaults,...instrument};for(const [key,value]of Object.entries(preset))if(![41,43,44].includes(+key))g[key]=(g[key]??0)+value;result.push({g,key:range(preset,instrument,43),velocity:range(preset,instrument,44),sample:this.samples[instrument[53]]});}this.presets.set(p.bank+':'+p.program,{name:p.name,zones:result});});
 }
 zones(program,bank,midi,velocity){const preset=this.presets.get(bank+':'+program);if(!preset)throw Error('SoundFont preset is unavailable.');const v=Math.max(1,Math.round(clamp(velocity,0,1)*127));const eligible=preset.zones.filter(z=>v>=z.velocity[0]&&v<=z.velocity[1]),exact=eligible.filter(z=>midi>=z.key[0]&&midi<=z.key[1]);if(exact.length||bank===128||!eligible.length)return exact;const distance=z=>Math.max(z.key[0]-midi,0,midi-z.key[1]),nearest=Math.min(...eligible.map(distance));return eligible.filter(z=>distance(z)===nearest);}
 sampleBuffer(ctx,z){
  const {g,sample:s}=z,start=s.start+(g[0]||0)+(g[4]||0)*32768,end=s.end+(g[1]||0)+(g[12]||0)*32768,key=start+':'+end;
  if(start<0||end>this.pcmLength||end<=start)throw Error('Invalid SoundFont sample range.');
  if(!this.buffers.has(key)){const b=ctx.createBuffer(1,end-start,s.rate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=this.view.getInt16(this.pcm+(start+i)*2,true)/32768;this.buffers.set(key,b);}return{buffer:this.buffers.get(key),start,end};
 }
 createVoice(ctx,{program=0,bank=0,midi=60,velocity=.75,when=ctx.currentTime,output,envelope=true,detune=0,onended=()=>{}}){
  const at=Math.max(ctx.currentTime,when),zones=this.zones(program,bank,midi,velocity),sources=[],nodes=[],envelopes=[];let ended=0;
  const finish=()=>{if(++ended<sources.length)return;for(const n of nodes)n.disconnect();onended();};
  for(const z of zones){
   const {g,sample:s}=z,{buffer,start,end}=this.sampleBuffer(ctx,z),source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner(),filter=ctx.createBiquadFilter();
   source.buffer=buffer;const root=g[58]>=0?g[58]:s.root,note=g[46]>=0?g[46]:midi;source.playbackRate.value=2**(((note-root)*(g[56]??100)+100*(g[51]||0)+(g[52]||0)+s.correction)/1200);source.detune.value=detune;
   const ls=s.loopStart+(g[2]||0)+(g[45]||0)*32768,le=s.loopEnd+(g[3]||0)+(g[50]||0)*32768;
   source.loop=(g[54]&1)!==0&&ls>=start&&le<=end&&le>ls;source.loopStart=(ls-start)/s.rate;source.loopEnd=(le-start)/s.rate;
   // Linked stereo samples remain separate zones, with their authored pan.
   pan.pan.value=clamp((g[17]||0)/500,-1,1);filter.type='lowpass';filter.Q.value=clamp(10**((g[9]||0)/200),.1,12);
   filter.frequency.value=clamp(8.176*2**((g[8]??13500)/1200)*(.35+.65*velocity),40,ctx.sampleRate*.45);
   const peak=10**(-(g[48]||0)/500)*clamp(velocity,0,1)**1.5*.8;
   const delay=envelope?seconds(g[33]):0,attack=envelope?seconds(g[34]):.003,hold=envelope?seconds(g[35]+(g[39]||0)*(60-note)):0,decay=envelope?seconds(g[36]+(g[40]||0)*(60-note)):0,sustain=envelope?10**(-g[37]/200):1;
   const a=at+delay,b=a+attack,c=b+hold,d=c+decay;
   gain.gain.setValueAtTime(0,at);gain.gain.setValueAtTime(0,a);gain.gain.linearRampToValueAtTime(peak,b);gain.gain.setValueAtTime(peak,c);gain.gain.exponentialRampToValueAtTime(Math.max(.000001,peak*sustain),d);
   envelopes.push({gain,source,peak,a,b,c,d,sustain,release:clamp(seconds(g[38]),.02,6),mode:g[54]});
   source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(output);nodes.push(source,filter,gain,pan);sources.push(source);source.onended=finish;
  }
  let releaseAt=Infinity;
  const release=(when=ctx.currentTime,duration)=>{if(when>=releaseAt)return;releaseAt=when;for(const e of envelopes){const p=e.gain.gain,t=Math.max(at,when),level=t<e.a?0:t<e.b?e.peak*(t-e.a)/Math.max(.0001,e.b-e.a):t<e.c?e.peak:t<e.d?e.peak*Math.max(.000001,e.sustain)**((t-e.c)/Math.max(.0001,e.d-e.c)):e.peak*e.sustain;p.cancelScheduledValues(t);p.setValueAtTime(level,t);const end=t+(duration??e.release);p.linearRampToValueAtTime(0,end);try{e.source.stop(end+.02);}catch{}}};
  sources.forEach(s=>s.start(at));
  return{sources,release,stop:when=>release(when,.012),zones};
 }
}
export class SoundFontVoice{
 constructor(ctx,master,reverb,bank){this.ctx=ctx;this.master=master;this.reverb=reverb;this.bank=bank;this.voices=new Set();}
 play(type,midi,velocity,at,route){const p=FONT_INSTRUMENTS[type];if(!p||!this.bank||velocity<=0)return false;
  const gain=this.ctx.createGain(),send=this.ctx.createGain();gain.gain.value=(p.bank?.95:.85)*(p.gain||1);send.gain.value=p.bank?.08:.18;gain.connect(route?.master||this.master);gain.connect(send);send.connect(route?.reverb||this.reverb);
  if(this.ctx.state!=='suspended'&&this.voices.size>=64){const oldest=this.voices.values().next().value;oldest.stop(this.ctx.currentTime);this.voices.delete(oldest);}
  const voice=this.bank.createVoice(this.ctx,{...p,midi:p.note??midi,velocity,when:at,output:gain,onended:()=>{this.voices.delete(voice);gain.disconnect();send.disconnect();}});this.voices.add(voice);voice.release(at+p.gate);return true;
 }
}
