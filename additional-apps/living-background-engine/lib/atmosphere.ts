import {bounds,type Layer,type Scene} from './model';
const TAU=Math.PI*2,clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Emissive sky curtains and refracted illumination; the underlying landscape stays sharp. */
export class AtmosphereRenderer{
 surfaces=new Map<string,HTMLCanvasElement>();
 surface(key:string,width:number,height:number){let c=this.surfaces.get(key);if(!c){c=document.createElement('canvas');this.surfaces.set(key,c);}if(c.width!==width||c.height!==height){c.width=width;c.height=height;}return c;}
 drawAurora(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const b=bounds(l.region),sw=480,sh=240,surface=this.surface('aurora',sw,sh),ctx=surface.getContext('2d')!,pixels=ctx.createImageData(sw,sh);
  const t=p*TAU*Math.max(1,Math.round(l.speed*s.duration/12)),seed=l.seed*.017;
  const rgb=[1,3,5].map(i=>parseInt(l.color.slice(i,i+2),16));
  for(let x=0;x<sw;x++){
   const u=x/(sw-1),edge=Math.sin(Math.PI*u)**.7;
   const arcs=[.64+.12*Math.sin(u*7+t+seed)+.045*Math.sin(u*18-t*2)+.014*Math.sin(u*73+Math.sin(u*19+t)*2-t),.42+.11*Math.sin(u*9-t+seed+.8)+.018*Math.sin(u*57+t)];
   for(let y=0;y<sh;y++){
    const v=y/(sh-1);let alpha=0,purple=0;
    for(let band=0;band<2;band++){
     const height=(.31+.10*Math.sin(u*17+Math.sin(u*6-t)+t+band))*l.scale;
     const z=(arcs[band]-v)/height;if(z<-.05||z>1)continue;
     const folds=.45+.28*Math.sin(u*93+Math.sin(u*14-t)*3+t+band)**2+.27*Math.sin(u*331-t*2+band)**2;
     const a=clamp((z+.05)*18)*Math.exp(-Math.max(0,z)*3.1)*clamp((1-z)*6)*folds*edge*(.45+.55*Math.sin(u*8-t+band)**2)*(band?.32:.95);
     alpha+=a;purple+=a*clamp(z*1.8-.30);
    }
    if(alpha<.002)continue;const tint=purple/alpha,k=(y*sw+x)*4;
    pixels.data[k]=rgb[0]*(1-tint)+176*tint;pixels.data[k+1]=rgb[1]*(1-tint)+92*tint;pixels.data[k+2]=rgb[2]*(1-tint)+225*tint;pixels.data[k+3]=Math.round(clamp(alpha)*255);
   }
  }
  ctx.putImageData(pixels,0,0);c.globalCompositeOperation='screen';c.drawImage(surface,b.x*w,b.y*h,b.w*w,b.h*h);
 }
 drawCaustics(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const b=bounds(l.region),sw=384,sh=Math.max(64,Math.round(sw*b.h*h/(b.w*w))),surface=this.surface('caustics',sw,sh),ctx=surface.getContext('2d')!,pixels=ctx.createImageData(sw,sh);
  const t=p*TAU*Math.max(1,Math.round(l.speed*s.duration/7));
  // Warped intersecting wave fronts make fine moving light ridges, never displaced sand.
  const sx=new Float32Array(sw),cx=new Float32Array(sw);
  for(let x=0;x<sw;x++){const u=x/sw*32/Math.max(.25,l.scale);sx[x]=Math.sin(u+t+Math.sin(u*.37-t)*1.4);cx[x]=Math.cos(u*.71-t+Math.sin(u*.29+t)*1.2);}
  for(let y=0;y<sh;y++){
   const v=y/sh,depth=.3+v*.7,space=Math.sqrt(v+.12)*32/Math.max(.25,l.scale),wave=Math.sin(space-t),cross=Math.cos(space*.79+t);
   for(let x=0;x<sw;x++){
    const ridge=Math.abs(sx[x]*wave+cx[x]*cross),light=Math.exp(-ridge*ridge*160);
    const edge=Math.min(1,x/18,(sw-1-x)/18,y/12,(sh-1-y)/12),k=(y*sw+x)*4;
    pixels.data[k]=185;pixels.data[k+1]=239;pixels.data[k+2]=230;pixels.data[k+3]=Math.round(light*edge*depth*110);
   }
  }
  ctx.putImageData(pixels,0,0);c.globalCompositeOperation='screen';c.drawImage(surface,b.x*w,b.y*h,b.w*w,b.h*h);
 }
}
