export const METRONOME_SOUNDS=[
 ['click','Bright click'],['wood','Wood block'],['rim','Rim tap'],['beep','Digital beep']
];

// Short, dry voices rendered once at the device sample rate. The same buffers
// serve previews, count-ins and playback; no instrument channel is borrowed.
function clickBuffer(tone,accent,rate){
 const duration={click:.055,wood:.095,rim:.065,beep:.085}[tone],samples=new Float32Array(Math.ceil(duration*rate));
 const pitch=accent?1.35:1;let peak=0,seed=16457;
 for(let i=0;i<samples.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
  const sine=hz=>Math.sin(2*Math.PI*hz*pitch*t);
  let value;
  if(tone==='wood')value=(sine(720)+.45*sine(1190)+.16*sine(2050))*Math.exp(-t*65);
  else if(tone==='rim')value=(.68*noise*Math.exp(-t*170)+.55*sine(1750)*Math.exp(-t*95));
  else if(tone==='beep')value=(sine(1050)+.15*sine(2100))*Math.exp(-t*32);
  else value=(sine(1800)+.42*sine(3600)+.22*noise)*Math.exp(-t*105);
  value*=Math.min(1,t/.0005)*Math.min(1,(duration-t)/.008);
  samples[i]=value;peak=Math.max(peak,Math.abs(value));
 }
 const gain=(accent?.48:.36)/(peak||1);for(let i=0;i<samples.length;i++)samples[i]*=gain;
 return samples;
}

export class MetronomeRenderer{
 constructor(rate){
  this.rate=rate;this.voices=[];this.tone='click';this.accent=true;this.volume=.65;
  this.buffers=new Map(METRONOME_SOUNDS.map(([tone])=>[tone,[clickBuffer(tone,false,rate),clickBuffer(tone,true,rate)]]));
 }
 configure(settings){
  if(this.buffers.has(settings.clickTone))this.tone=settings.clickTone;
  if(typeof settings.clickAccent==='boolean')this.accent=settings.clickAccent;
  if(Number.isFinite(settings.clickVolume))this.volume=Math.max(0,Math.min(1,settings.clickVolume));
 }
 schedule(time,accent,preview=false){this.voices.push({time,accent,preview,samples:null,gain:0})}
 clear(previewOnly=false){this.voices=previewOnly?this.voices.filter(v=>!v.preview):[]}
 mix(out,time){
  if(!out?.length)return;const frames=out[0].length;
  this.voices=this.voices.filter(voice=>{
   const offset=Math.round((time-voice.time)*this.rate);if(offset+frames<=0)return true;
   if(!voice.samples){voice.samples=this.buffers.get(this.tone)[Number(voice.accent&&this.accent)];voice.gain=this.volume}
   const end=Math.min(frames,voice.samples.length-offset);
   for(let i=Math.max(0,-offset);i<end;i++){const value=voice.samples[offset+i]*voice.gain;for(const channel of out)channel[i]+=value}
   return offset+frames<voice.samples.length;
  });
 }
}
