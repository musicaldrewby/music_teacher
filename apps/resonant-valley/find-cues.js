// Discovery sounds share the device's audio context and effects slider. They
// have their own output so a record can keep playing while a case opens.
const file={gliss:'find-harp-gliss',plucks:'find-harp-plucks'};
export class FindCues {
 constructor(){this.buffers=new Map();this.serial=0;this.lastGliss=-Infinity;this.lastPluck=-Infinity;}
 buffer(ctx,kind){
  if(!this.buffers.has(kind)){
   const result=fetch(new URL('./assets/'+file[kind]+'.mp3',import.meta.url))
    .then(response=>{if(!response.ok)throw Error('Missing discovery cue');return response.arrayBuffer();})
    .then(bytes=>ctx.decodeAudioData(bytes)).catch(()=>{this.buffers.delete(kind);return null;});
   this.buffers.set(kind,result);
  }
  return this.buffers.get(kind);
 }
 warm(ctx){for(const kind of Object.keys(file))this.buffer(ctx,kind);}
 setLevel(value){
  if(!this.output||this.level===value)return;
  this.level=value;this.output.gain.setTargetAtTime(value,this.ctx.currentTime,.015);
 }
 stop(){
  this.serial++;
  if(this.voice){
   const {source,fade}=this.voice,t=this.ctx.currentTime;
   fade.gain.setTargetAtTime(0,t,.008);source.stop(t+.045);this.voice=null;
  }
 }
 async play(ctx,kind,level){
  if(!ctx||ctx.state!=='running'||!level)return;
  const now=ctx.currentTime;
  if(kind==='plucks'&&(now-this.lastGliss<2.25||now-this.lastPluck<.85))return;
  if(kind==='gliss')this.lastGliss=now;else this.lastPluck=now;
  this.stop();
  if(!this.output){this.ctx=ctx;this.output=ctx.createGain();this.output.gain.value=level;this.level=level;this.output.connect(ctx.destination);}
  this.setLevel(level);
  const serial=this.serial,buffer=await this.buffer(ctx,kind);
  if(!buffer||serial!==this.serial||!this.level||ctx.state!=='running'||ctx.currentTime-now>2)return;
  const source=ctx.createBufferSource(),fade=ctx.createGain();source.buffer=buffer;
  source.connect(fade).connect(this.output);this.voice={source,fade};
  source.onended=()=>{source.disconnect();fade.disconnect();if(this.voice?.source===source)this.voice=null;};
  source.start();
 }
}
