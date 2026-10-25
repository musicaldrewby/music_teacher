import {soundingTracks} from './phrases.js';
import {OrbitLights,paletteFor,blendPalette} from './visuals.js';
import {drawWorld,worldFor,cameraPose} from './show-worlds.js';
export const clock=s=>{s=Math.max(0,Math.floor(s));return `${Math.floor(s/3600)?Math.floor(s/3600)+':':''}${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
export class ShowVisuals {
 constructor(makeCanvas){this.frames=[makeCanvas(1280,720),makeCanvas(1280,720)];this.layer=makeCanvas(800,800);this.lights=[new OrbitLights(),new OrbitLights()];}
 scene(g,w,h,s,index){
  const {visual,state}=s,palette=paletteFor(state.name,visual.look);
  if(worldFor(state,visual.world)!=='Orbit Rings'){drawWorld(g,w,h,{...s,palette});return}
  g.fillStyle='#04070e';g.fillRect(0,0,w,h);
  const atmosphere=g.createRadialGradient(w*.5,h*.48,0,w*.5,h*.5,w*.6);atmosphere.addColorStop(0,`hsl(${palette.hues[0]} 42% 15% / .8)`);atmosphere.addColorStop(.55,`hsl(${palette.hues[1]} 40% 8% / .7)`);atmosphere.addColorStop(1,'#04070e');g.fillStyle=atmosphere;g.fillRect(0,0,w,h);
  const side=Math.round(Math.min(w*.9,h*.88)),size=Math.ceil(side*Math.max(1,visual.zoom??1)*1.03);
  if(this.layer.width!==size||this.layer.height!==size){this.layer.width=size;this.layer.height=size}
  const light=this.lights[index];light.hits=s.hits;
  const layerContext=this.layer.getContext('2d');layerContext.save();layerContext.scale(size/800,size/800);light.draw(layerContext,800,800,{beat:s.beat,running:!s.done,tracks:soundingTracks(state,s.beat),bars:state.bars,selected:-1,palette,level:visual.speed===0?0:s.level,dim:visual.glow/100,calm:visual.speed===0,now:s.seconds*1000});layerContext.restore();
  const pose=cameraPose(s.seconds,visual,s.motionTime);g.save();g.translate(w*(.5+pose.x),h*(.5+pose.y));g.rotate(pose.rotation);g.drawImage(this.layer,-side*pose.zoom/2,-side*pose.zoom/2,side*pose.zoom,side*pose.zoom);g.restore();
 }
 draw(g,w,h,s){
  const time=s.seconds,visual=s.visual,palette=paletteFor(s.state.name,visual.look),previous=s.previous?paletteFor(s.previous.state.name,s.previous.visual.look):palette;
  // Audio gains are equal-power. Their squares give a luminance-preserving dissolve.
  const mix=s.previous?Math.max(0,Math.min(1,(s.blend??1)**2)):1,colors=blendPalette(previous,palette,mix),unit=h/720;
  g.save();g.clearRect(0,0,w,h);
  const layers=s.previous?[{...s,...s.previous,index:0,opacity:1},{...s,index:1,opacity:mix}]:[{...s,index:1,opacity:1}];
  for(const l of layers){const frame=this.frames[l.index];if(frame.width!==w||frame.height!==h){frame.width=w;frame.height=h}const ctx=frame.getContext('2d');ctx.clearRect(0,0,w,h);ctx.save();this.scene(ctx,w,h,l,l.index);ctx.restore();g.globalAlpha=l.opacity;g.drawImage(frame,0,0)}g.globalAlpha=1;
  // Cinema removes every overlay from both the live canvas and exported film.
  if(!s.cinema&&visual.titles){
   if(worldFor(s.state,visual.world)==='Orbit Rings'){
    g.textAlign='center';g.fillStyle='#dceeff';g.font=`300 ${21*unit}px sans-serif`;const active=s.state.tracks.filter(t=>!t.mute&&(!s.state.tracks.some(x=>x.solo)||t.solo));g.fillText(active.slice(0,2).map(t=>t.steps).join(' : '),w*.5,h*.5+5*unit);
    g.fillStyle='#7f9fc4';g.font=`${7*unit}px sans-serif`;g.fillText('I N   O R B I T',w*.5,h*.5+24*unit);
   }
   g.textAlign='left';g.fillStyle='#8ba8c8';g.font=`${9*unit}px sans-serif`;g.fillText('O R B I T   /   P E R F O R M A N C E',42*unit,40*unit);
   g.fillStyle='#d2e4fc';g.font=`300 ${23*unit}px sans-serif`;g.fillText(s.showTitle,42*unit,73*unit,w-84*unit);
   g.fillStyle='#94afd0';g.font=`${11*unit}px sans-serif`;g.fillText(`${String(s.index+1).padStart(2,'0')}  /  ${s.title}`,42*unit,h-53*unit,w*.7);
   g.fillStyle='#6987aa';g.font=`${9*unit}px sans-serif`;g.fillText(`Created by ${s.artist}`,42*unit,h-31*unit);
   g.textAlign='right';g.fillStyle='#8ca9c9';g.font=`${10*unit}px monospace`;g.fillText(`${clock(time)}  /  ${clock(s.total)}`,w-42*unit,h-35*unit);
   g.fillStyle='#1b2c45';g.fillRect(42*unit,h-16*unit,w-84*unit,unit);g.fillStyle=colors.accent;g.globalAlpha=.55;g.fillRect(42*unit,h-16*unit,(w-84*unit)*Math.min(1,time/s.total),unit);
  }g.restore();
 }
}
