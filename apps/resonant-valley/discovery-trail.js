import {discoveryKey,firstCaseHint} from './discovery-sites.js';
const directions=['N','NE','E','SE','S','SW','W','NW'];
export function discoveryTrail(world){
 const p=world.camera.position;let nearest=null,distance=Infinity;
 // Only metadata already delivered with loaded chunks is searched. Clues never
 // generate terrain, reveal an exact coordinate, or grant an instrument.
 for(const chunk of world.stream.loaded.values())if(chunk.ready)for(const site of chunk.discoveries||[]){
  if(world.discoveryClaims?.has(discoveryKey(world.generator,site)))continue;
  const horizontal=Math.hypot(site.x+.5-p.x,site.z+.5-p.z),vertical=site.y+1-p.y;
  if(horizontal>(site.starter?36:24)||Math.abs(vertical)>32)continue;
  const d=Math.hypot(horizontal,vertical*.6);if(d<distance){nearest={site,horizontal,vertical};distance=d;}
 }
 if(!nearest)return null;
 const {site,horizontal,vertical}=nearest,dx=site.x+.5-p.x,dz=site.z+.5-p.z;
 const bearing=(Math.atan2(dx,-dz)*180/Math.PI+360)%360,side=directions[Math.round(bearing/45)%8];
 const strength=Math.max(.12,1-distance/38),height=vertical< -4?' · below':vertical>4?' · above':'';
 return {id:site.id,level:strength,pan:Math.max(-.85,Math.min(.85,(dx*Math.cos(world.camera.rotation.y)-dz*Math.sin(world.camera.rotation.y))/Math.max(1,horizontal))),text:site.starter?firstCaseHint(world.generator):`${strength>.7?'Clear':'Faint'} notes · ${side}${height}${site.destination?' · old music site':''}`};
}
export class TrailChimes {
 constructor(buffer){this.buffer=buffer;this.next=0;this.serial=0;}
 stop(){this.serial++;if(this.voice){try{this.voice.source.stop();}catch{}this.voice=null;}}
 async update(ctx,clue,level,now){
  if(!ctx||ctx.state!=='running'||!clue||!level){this.stop();return;}
  if(this.voice){this.voice.gain.gain.setTargetAtTime(level*clue.level*.38,ctx.currentTime,.1);this.voice.pan?.pan.setTargetAtTime(clue.pan,ctx.currentTime,.2);return;}
  if(now<this.next)return;this.next=now+15;const serial=++this.serial;
  const buffer=await this.buffer(ctx);if(!buffer||serial!==this.serial||ctx.state!=='running')return;
  const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.();source.buffer=buffer;gain.gain.value=level*clue.level*.38;
  source.connect(gain);if(pan){pan.pan.value=clue.pan;gain.connect(pan).connect(ctx.destination);}else gain.connect(ctx.destination);
  const voice={source,gain,pan};this.voice=voice;source.onended=()=>{source.disconnect();gain.disconnect();pan?.disconnect();if(this.voice===voice)this.voice=null;};source.start();
 }
}
