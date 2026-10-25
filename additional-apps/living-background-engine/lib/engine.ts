import {bounds,pathPoint,phase,seeded,type Scene,type Layer,type Point} from './model';
import {WaterRenderer,drawRain} from './water';
import {drawLights} from './lights';
import {CandleRenderer} from './candle';
import {drawLeaves} from './leaves';
import {FireRenderer} from './fire';
import {SwayRenderer} from './sway';
import {AtmosphereRenderer} from './atmosphere';
const TAU=Math.PI*2;
const mod=(n:number)=>((n%1)+1)%1;
const rgba=(hex:string,a:number)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${Math.max(0,Math.min(1,a))})`;
export async function loadImage(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Could not load the background image. Reimport the image or select another scene.'));i.src=src;});}
function polygon(c:CanvasRenderingContext2D,points:Point[],w:number,h:number){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();}
function bloom(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha:number){if(r<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.3,rgba(color,alpha*.35));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export class LivingEngine{
 image:HTMLImageElement; background:HTMLCanvasElement; width:number; height:number; fire?:FireRenderer; sway?:SwayRenderer; water?:WaterRenderer; candles?:CandleRenderer; atmosphere?:AtmosphereRenderer;
 constructor(image:HTMLImageElement,width=1280,height=720){this.image=image;this.width=width;this.height=height;this.background=document.createElement('canvas');this.background.width=width;this.background.height=height;const c=this.background.getContext('2d')!;const scale=Math.max(width/image.width,height/image.height);c.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);}
 draw(canvas:HTMLCanvasElement,scene:Scene,time:number,overlays?:{selected?:string;draft?:Point[]}){const c=canvas.getContext('2d')!;const w=canvas.width,h=canvas.height;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(this.background,0,0,w,h);const p=phase(time,scene.duration);for(const l of scene.layers){if(!l.enabled||!l.opacity)continue;c.save();polygon(c,l.region,w,h);c.clip();for(const region of l.exclude??[]){c.beginPath();c.rect(0,0,w,h);region.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();c.clip('evenodd');}c.globalAlpha=l.opacity;this.effect(c,l,scene,p,w,h);c.restore();}if(overlays){const l=scene.layers.find(x=>x.id===overlays.selected);if(l){c.save();polygon(c,l.region,w,h);c.fillStyle='#86edbe15';c.fill();c.strokeStyle='#9cebc7';c.lineWidth=1.5;c.setLineDash([6,4]);c.stroke();if(l.path){c.beginPath();l.path.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.strokeStyle='#ffca76';c.stroke();c.setLineDash([]);for(let i=1;i<l.path.length;i++){const a=l.path[i-1],b=l.path[i],mx=(a[0]+b[0])*.5*w,my=(a[1]+b[1])*.5*h,angle=Math.atan2((b[1]-a[1])*h,(b[0]-a[0])*w);c.beginPath();c.moveTo(mx-7*Math.cos(angle-.5),my-7*Math.sin(angle-.5));c.lineTo(mx,my);c.lineTo(mx-7*Math.cos(angle+.5),my-7*Math.sin(angle+.5));c.stroke();}}c.restore();}if(overlays.draft?.length){c.beginPath();overlays.draft.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.strokeStyle='#fff';c.lineWidth=2;c.stroke();for(const [x,y]of overlays.draft){c.beginPath();c.arc(x*w,y*h,4,0,TAU);c.fillStyle='#9cebc7';c.fill();}}}}
 effect(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){const b=bounds(l.region),x=b.x*w,y=b.y*h,bw=b.w*w,bh=b.h*h;if(bw<1||bh<1)return;const random=seeded(l.seed),speed=Math.max(1,Math.round(l.speed*3)),angle=l.direction*Math.PI/180;
 if(l.type==='aurora'){this.atmosphere??=new AtmosphereRenderer();this.atmosphere.drawAurora(c,l,s,p,w,h);return;}
 if(l.type==='caustics'){this.atmosphere??=new AtmosphereRenderer();this.atmosphere.drawCaustics(c,l,s,p,w,h);return;}
 if(l.type==='leaves'){drawLeaves(c,l,s,p,w,h);return;}
 if(l.type==='candle'){this.candles??=new CandleRenderer();this.candles.draw(c,l,p,w,h);return;}
 if(l.type==='steam'){
 // Narrow, coherent strands expand and dissolve as they rise from a cup rim.
 // The traveling waves use whole cycles so the loop closes without a reset.
 const clock=p*TAU*Math.max(1,Math.round(l.speed*3));
 const sources=l.points?.length?l.points:[[b.x+b.w*.5,b.y+b.h]];
 for(const [sx,sy] of sources)for(let strand=0;strand<3;strand++){
 const offset=random()*TAU,spread=(strand-1)*bw*.09;
 for(let j=0;j<64;j++){
 const u=j/63,up=u*bh;
 const curl=Math.sin(u*8-clock+offset)*(.018+u*.1)+Math.sin(u*15-clock*2+offset)*u*.025;
 const px=sx*w+spread+bw*curl,py=sy*h-up;
 const radius=bw*(.022+u*.047)*l.scale;
 const envelope=Math.min(1,u*14)*Math.pow(1-u,1.8);
 const pulse=.55+.45*Math.sin(u*10-clock+offset)**2;
 c.save();c.translate(px,py);c.scale(1,1.65);
 bloom(c,0,0,radius,l.color,envelope*pulse*.42);c.restore();
 }
 }
 return;
 }
 if(l.type==='rain'){drawRain(c,l,s,p,w,h);return;}
 if(l.type==='ocean'){this.water??=new WaterRenderer(this.background);this.water.drawOcean(c,l,s,p,w,h);return;}
 if(l.type==='rain_impacts'){this.water??=new WaterRenderer(this.background);this.water.drawImpacts(c,l,s,p,w,h);return;}
 if(l.type==='window_drops'){this.water??=new WaterRenderer(this.background);this.water.drawDrops(c,l,s,p,w,h);return;}
 if(l.type==='snow'||l.type==='embers'){const snow=l.type==='snow',count=snow?95:45;for(let i=0;i<count;i++){const a=random(),z=random(),r=random(),q=mod(z+p*speed),edge=Math.sin(Math.PI*q)**.6;const px=x+mod(a+Math.sin(q*TAU)*s.wind*.08+q*(s.wind*.18+Math.sin(angle)*.18))*bw,py=y+(snow?q:1-q)*bh,radius=(snow?1.3:1.1)*(r+.3)*l.scale*w/1280;c.globalAlpha=l.opacity*edge*(.25+r*.65)*Math.min(1,Math.max(0,(px-x)/bw)*30,Math.max(0,(x+bw-px)/bw)*30);if(snow){c.fillStyle=l.color;c.beginPath();c.ellipse(px+Math.sin(q*TAU+a*TAU)*9*l.scale,py,radius,radius,0,0,TAU);c.fill();}else{c.globalCompositeOperation='screen';bloom(c,px,py,radius*4,l.color,.45);c.fillStyle=l.color;c.fillRect(px,py,Math.max(.8,radius),Math.max(.8,radius));}}return;}
 if(['fog','smoke','clouds'].includes(l.type)){const rising=l.type==='smoke';const count=l.type==='clouds'?22:32;for(let i=0;i<count;i++){const a=random(),z=random(),r=random(),q=mod(z+p*Math.max(1,Math.round(l.speed)));let px=x+(-.2+q*1.4)*bw,py=y+(r*.7+.15)*bh;if(rising){px=x+bw*(.5+Math.sin(q*TAU+a*TAU)*(.04+q*.12)+s.wind*q*.18);py=y+bh*(1-q);}const radius=(rising?bw*(.1+q*.28):bw*(.13+r*.2))*l.scale;const alpha=Math.sin(Math.PI*q)**2*(rising?.22:.11);c.save();c.translate(px,py);c.scale(1,rising?1.1:.3);bloom(c,0,0,radius,l.color,alpha);c.restore();}return;}
 if(l.type==='fire'){this.fire??=new FireRenderer();this.fire.draw(c,l,s,p,w,h);return;}
 if(l.type==='glow'){c.globalCompositeOperation='screen';const pulse=.75+Math.sin(p*TAU*5)*.1+Math.sin(p*TAU*11)*.06;bloom(c,x+bw*.5,y+bh*.6,Math.max(bw,bh)*.65,l.color,pulse*.55);return;}
 if(l.type==='lights'){drawLights(c,l,p,w,h);return;}
 if(l.type==='rays'){c.globalCompositeOperation='screen';for(let i=0;i<6;i++){const rx=x+bw*(.05+i*.13),top=y-bh*.1,drift=(Math.sin(angle)+.35)*bh;const alpha=.15+.06*Math.sin(p*TAU+i);const g=c.createLinearGradient(rx,top,rx+drift,y+bh);g.addColorStop(0,rgba(l.color,alpha));g.addColorStop(1,rgba(l.color,0));c.fillStyle=g;c.beginPath();c.moveTo(rx,top);c.lineTo(rx+bw*.016,top);c.lineTo(rx+drift+bw*.16,y+bh);c.lineTo(rx+drift-bw*.02,y+bh);c.closePath();c.fill();}return;}
 if(l.type==='ripples'){for(let i=0;i<15;i++){const px=x+random()*bw,py=y+random()*bh,q=mod(random()+p*speed);c.strokeStyle=rgba(l.color,(1-q)*.4);c.lineWidth=1;c.beginPath();c.ellipse(px,py,q*30*l.scale,q*8*l.scale,0,0,TAU);c.stroke();}return;}
 if(l.type==='sway'){this.sway??=new SwayRenderer(this.background);this.sway.draw(c,l,s,p,w,h);return;}
 if(l.type==='flow'){this.water??=new WaterRenderer(this.background);this.water.drawFlow(c,l,s,p,w,h);return;}
 }
}
export async function png(engine:LivingEngine,scene:Scene,time:number){const canvas=document.createElement('canvas');canvas.width=engine.width;canvas.height=engine.height;engine.draw(canvas,scene,time);return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG export failed')),'image/png'));}
export async function renderMP4(engine:LivingEngine,scene:Scene,progress:(n:number)=>void,signal:AbortSignal){if(!('VideoEncoder' in window))throw Error('This browser does not support frame-by-frame MP4. Open the studio in Chrome or Edge, or export a PNG.');const {Muxer,ArrayBufferTarget}=await import('mp4-muxer');const fps=30,width=engine.width,height=engine.height;const config:VideoEncoderConfig={codec:'avc1.420028',width,height,bitrate:width>1280?12000000:6500000,framerate:fps,latencyMode:'quality',avc:{format:'avc'}};const support=await VideoEncoder.isConfigSupported(config);if(!support.supported)throw Error('H.264 encoding is unavailable in this browser. Try Chrome or Edge with hardware acceleration enabled.');const target=new ArrayBufferTarget();const muxer=new Muxer({target,video:{codec:'avc',width,height},fastStart:'in-memory'});let failure:Error|undefined;const encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{failure=e;}});const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;encoder.configure(config);try{const count=scene.duration*fps;for(let i=0;i<count;i++){if(signal.aborted)throw Error('Render cancelled');if(failure)throw failure;engine.draw(canvas,scene,i/fps);const frame=new VideoFrame(canvas,{timestamp:Math.round(i/fps*1e6),duration:Math.round(1e6/fps)});encoder.encode(frame,{keyFrame:i%60===0});frame.close();if(i%8===0||encoder.encodeQueueSize>8){await encoder.flush();progress(Math.round((i+1)/count*98));await new Promise(r=>setTimeout(r,0));}}await encoder.flush();if(failure)throw failure;muxer.finalize();progress(100);return new Blob([target.buffer],{type:'video/mp4'});}finally{if(encoder.state!=='closed')encoder.close();}}
