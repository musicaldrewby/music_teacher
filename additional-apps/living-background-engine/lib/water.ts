import {bounds,seeded,type Layer,type Scene,type Point} from './model';
const TAU=Math.PI*2;
const clamp=(n:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,n));
const fract=(n:number)=>n-Math.floor(n);
function inside(x:number,y:number,poly:Point[]){let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
function segment(x:number,y:number,a:Point,b:Point){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));return {t,d:Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)};}
function boundary(x:number,y:number,poly:Point[]){let d=Infinity;for(let i=0;i<poly.length;i++)d=Math.min(d,segment(x,y,poly[i],poly[(i+1)%poly.length]).d);return d;}
type FlowMap={surface:HTMLCanvasElement;pixels:ImageData;indices:Uint32Array;vx:Float32Array;vy:Float32Array;amplitude:Float32Array;clearance:Float32Array;waveX:Float32Array;waveY:Float32Array;key:string};
/** Full-detail, bilinearly sampled image transport. The destination mask never moves. */
export class WaterRenderer {
 source:Uint8ClampedArray; width:number; height:number; maps=new Map<string,FlowMap>(); beads=new Map<string,HTMLCanvasElement>(); lensSurface?:HTMLCanvasElement;
 oceanFields=new WeakMap<FlowMap,Float32Array>();
 constructor(public background:HTMLCanvasElement){this.width=background.width;this.height=background.height;this.source=background.getContext('2d')!.getImageData(0,0,this.width,this.height).data;}
 flowMap(l:Layer):FlowMap {
  const key=JSON.stringify([l.region,l.exclude,l.path,l.direction,l.seed]);const cached=this.maps.get(l.id);if(cached?.key===key)return cached;
  const w=this.width,h=this.height,b=bounds(l.region),angle=l.direction*Math.PI/180;
  const path=(l.path??[[b.x+b.w*.5-Math.sin(angle)*b.w*.45,b.y+b.h*.5-Math.cos(angle)*b.h*.45],[b.x+b.w*.5+Math.sin(angle)*b.w*.45,b.y+b.h*.5+Math.cos(angle)*b.h*.45]] as Point[]).map(([x,y])=>[x*w,y*h] as Point);
  const poly=l.region.map(([x,y])=>[x*w,y*h] as Point),holes=(l.exclude??[]).map(poly=>poly.map(([x,y])=>[x*w,y*h] as Point));
  const surface=document.createElement('canvas');surface.width=w;surface.height=h;const pixels=surface.getContext('2d')!.createImageData(w,h);
  const indices:number[]=[],vx:number[]=[],vy:number[]=[],amplitude:number[]=[],clearance:number[]=[],waveX:number[]=[],waveY:number[]=[];
  const directions=path.map((point,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/len,(b[1]-a[1])/len];});
  const minx=Math.max(0,Math.floor(b.x*w)),maxx=Math.min(w,Math.ceil((b.x+b.w)*w)),miny=Math.max(0,Math.floor(b.y*h)),maxy=Math.min(h,Math.ceil((b.y+b.h)*h));
  for(let y=miny;y<maxy;y++)for(let x=minx;x<maxx;x++){
   if(!inside(x+.5,y+.5,poly)||holes.some(poly=>inside(x+.5,y+.5,poly)))continue;
   let near=Infinity,index=0,t=0;for(let i=0;i<path.length-1;i++){const s=segment(x,y,path[i],path[i+1]);if(s.d<near){near=s.d;index=i;t=s.t;}}
   let edge=boundary(x,y,poly);for(const hole of holes)edge=Math.min(edge,boundary(x,y,hole));
   const a=directions[index],d=directions[index+1],dx=a[0]*(1-t)+d[0]*t,dy=a[1]*(1-t)+d[1]*t,len=Math.hypot(dx,dy)||1;
   const depth=(index+t)/(path.length-1),anchor=clamp(edge/(18*w/1280));
   const pixel=(y*w+x)*4;indices.push(pixel);vx.push(dx/len);vy.push(dy/len);amplitude.push((.23+.77*depth)*anchor);clearance.push(edge);
   const wave=x*.035+y*.057+l.seed;waveX.push(Math.sin(wave));waveY.push(Math.cos(wave*.83));pixels.data[pixel+3]=Math.round(255*clamp(edge/(5*w/1280)));
  }
  const result={surface,pixels,indices:Uint32Array.from(indices),vx:Float32Array.from(vx),vy:Float32Array.from(vy),amplitude:Float32Array.from(amplitude),clearance:Float32Array.from(clearance),waveX:Float32Array.from(waveX),waveY:Float32Array.from(waveY),key};this.maps.set(l.id,result);return result;
 }
 drawFlow(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const m=this.flowMap(l),width=this.width,height=this.height,source=this.source,target=m.pixels.data;
  const cycles=Math.max(1,Math.round(l.speed*s.duration/4)),q=fract(p*cycles),q2=fract(q+.5),mix=1-Math.abs(q*2-1),distance=(l.flowDistance??64)*l.scale*width/1280;
  const sin=Math.sin(TAU*p*cycles),cos=Math.cos(TAU*p*cycles),turbulence=(l.turbulence??.35)*width/1280*5;
  const d0=(q-.5)*distance,d1=(q2-.5)*distance;
  for(let j=0;j<m.indices.length;j++){
   const idx=m.indices[j],pixel=idx/4,x=pixel%width,y=(pixel-x)/width,amp=m.amplitude[j]*Math.min(1,m.clearance[j]/(distance*.65+turbulence*2));
   const rippleX=m.waveX[j]*sin*turbulence*amp,rippleY=m.waveY[j]*cos*turbulence*amp;
   const ax=clamp(x-m.vx[j]*d0*amp+rippleX,0,width-1.001),ay=clamp(y-m.vy[j]*d0*amp+rippleY,0,height-1.001);
   const bx=clamp(x-m.vx[j]*d1*amp+rippleX,0,width-1.001),by=clamp(y-m.vy[j]*d1*amp+rippleY,0,height-1.001);
   const xi=Math.floor(ax),yi=Math.floor(ay),xj=Math.floor(bx),yj=Math.floor(by),fx=ax-xi,fy=ay-yi,gx=bx-xj,gy=by-yj;
   const ai=(yi*width+xi)*4,bi=(yj*width+xj)*4,row=width*4;
   const a00=(1-fx)*(1-fy)*mix,a10=fx*(1-fy)*mix,a01=(1-fx)*fy*mix,a11=fx*fy*mix;
   const b00=(1-gx)*(1-gy)*(1-mix),b10=gx*(1-gy)*(1-mix),b01=(1-gx)*gy*(1-mix),b11=gx*gy*(1-mix);
   for(let ch=0;ch<3;ch++)target[idx+ch]=source[ai+ch]*a00+source[ai+4+ch]*a10+source[ai+row+ch]*a01+source[ai+row+4+ch]*a11+source[bi+ch]*b00+source[bi+4+ch]*b10+source[bi+row+ch]*b01+source[bi+row+4+ch]*b11;
  }
  m.surface.getContext('2d')!.putImageData(m.pixels,0,0);c.drawImage(m.surface,0,0,w,h);
 }
 /** Orbital swells sample ONE source location. No crossfade, ghost wave, or reset. */
 drawOcean(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const m=this.flowMap(l),b=bounds(l.region),width=this.width,height=this.height;
  let field=this.oceanFields.get(m);
  if(!field){field=new Float32Array(m.indices.length*5);for(let j=0;j<m.indices.length;j++){
   const pixel=m.indices[j]/4,x=pixel%width,y=(pixel-x)/width,depth=clamp((y/height-b.y)/b.h);
   // Perspective packs wave fronts toward the horizon; amplitude grows near shore.
   const a=Math.sqrt(depth+.025)*TAU*4.6+Math.sin(x/width*9)*.22;
   const a2=Math.sqrt(depth+.04)*TAU*8.1+x/width*2.8;
   const k=j*5;field[k]=Math.sin(a);field[k+1]=Math.cos(a);field[k+2]=Math.sin(a2);field[k+3]=Math.cos(a2);field[k+4]=(.12+3.8*depth**1.6)*Math.min(1,m.clearance[j]/(18*width/1280));
  }this.oceanFields.set(m,field);}
  const cycles=Math.max(1,Math.round(l.speed*s.duration/6)),clock=TAU*p*cycles;
  const sin=Math.sin(clock),cos=Math.cos(clock),sin2=Math.sin(clock*2),cos2=Math.cos(clock*2),ratio=width/1280;
  const source=this.source,target=m.pixels.data,row=width*4;
  for(let j=0;j<m.indices.length;j++){
   const idx=m.indices[j],pixel=idx/4,x=pixel%width,y=(pixel-x)/width,k=j*5,amp=field[k+4]*l.scale*l.opacity*ratio;
   const wave=field[k]*cos-field[k+1]*sin,ripple=field[k+2]*cos2-field[k+3]*sin2;
   const ax=clamp(x+amp*(field[k+1]*cos+field[k]*sin)*.22,0,width-1.001),ay=clamp(y-amp*(wave+ripple*.22),0,height-1.001);
   const xi=Math.floor(ax),yi=Math.floor(ay),fx=ax-xi,fy=ay-yi,at=(yi*width+xi)*4;
   const a=(1-fx)*(1-fy),bb=fx*(1-fy),cc=(1-fx)*fy,d=fx*fy;
   for(let ch=0;ch<3;ch++)target[idx+ch]=source[at+ch]*a+source[at+4+ch]*bb+source[at+row+ch]*cc+source[at+row+4+ch]*d;
  }
  m.surface.getContext('2d')!.putImageData(m.pixels,0,0);c.globalAlpha=1;c.drawImage(m.surface,0,0,w,h);
 }
 /** Discrete impacts on hard ground: no image transport and no whole-road ripple. */
 drawImpacts(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const b=bounds(l.region),random=seeded(l.seed),count=Math.round(210*l.density),unit=w/1280;
  for(let i=0;i<count;i++){
   const u=random(),depth=random()**1.35,offset=random(),size=random(),spin=random()*TAU;
   const x=(b.x+u*b.w)*w,y=(b.y+depth*b.h)*h;
   if(!inside(x/w,y/h,l.region))continue;
   const cycles=Math.max(1,Math.round(s.duration*l.speed/(1.5+size))),q=fract(offset+p*cycles);
   // Each impact is short, followed by a longer quiet interval at this point.
   if(q>.38){
    if(q>.94){const fall=(q-.94)/.06,travel=(6+depth*18)*l.scale*unit,yy=y-(1-fall)*travel;
     c.save();c.globalAlpha=l.opacity*Math.sin(fall*Math.PI*.5);c.strokeStyle='rgba(205,225,237,.45)';c.lineWidth=(.3+.35*depth)*unit;
     c.beginPath();c.moveTo(x-(1-fall)*s.wind*travel*.3,yy);c.lineTo(x-(1-fall)*s.wind*travel*.3-s.wind*unit,yy-(2+depth*3)*unit);c.stroke();c.restore();
    }continue;
   }const t=q/.38,perspective=.12+.88*depth;
   const radius=(1.8+size*3.8)*perspective*l.scale*unit,fade=(1-t)**2;
   const sourceAt=(clamp(Math.floor(y/h*this.height),0,this.height-1)*this.width+clamp(Math.floor(x/w*this.width),0,this.width-1))*4;
   const red=Math.min(235,this.source[sourceAt]*.45+105),green=Math.min(240,this.source[sourceAt+1]*.45+110),blue=Math.min(245,this.source[sourceAt+2]*.45+115);
   c.save();c.globalAlpha=l.opacity;
   c.strokeStyle=`rgba(${red},${green},${blue},${fade*.5})`;c.lineWidth=(.35+.35*depth)*unit;
   c.beginPath();c.ellipse(x,y,radius*(.15+t),radius*(.15+t)*(.12+depth*.16),0,0,TAU);c.stroke();
   if(t<.44){const jump=t/.44,up=Math.sin(jump*Math.PI)*radius*.85;
    c.fillStyle=`rgba(${red},${green},${blue},${(1-jump)*.7})`;
    for(let n=0;n<3;n++){const direction=spin+n*TAU/3;c.beginPath();c.ellipse(x+Math.cos(direction)*radius*jump*.6,y-up+Math.sin(direction)*radius*jump*.13,Math.max(.25,.45*perspective*unit),Math.max(.35,.8*perspective*unit),direction,0,TAU);c.fill();}
   }
   c.restore();
  }
 }
 private drop(c:CanvasRenderingContext2D,x:number,y:number,r:number,stretch:number,refraction:number,alpha=1){
  const w=this.width,h=this.height,rx=r,ry=r*stretch;if(r<.45||x<r*2||y<r*3||x>w-r*2||y>h-r*3)return;
  const target=c,worldX=x,worldY=y;
  this.lensSurface??=document.createElement('canvas');
  if(this.lensSurface.width!==128){this.lensSurface.width=128;this.lensSurface.height=192;}
  c=this.lensSurface.getContext('2d')!;c.clearRect(0,0,128,192);x=64;y=96;
  c.save();
  const shape=()=>{c.beginPath();c.moveTo(x,y-ry);c.bezierCurveTo(x+rx*.85,y-ry*.9,x+rx*1.12,y+ry*.25,x+rx*.66,y+ry*.7);c.bezierCurveTo(x+rx*.25,y+ry*1.05,x-rx*.55,y+ry*.97,x-rx*.82,y+ry*.4);c.bezierCurveTo(x-rx*1.15,y-ry*.2,x-rx*.61,y-ry*.93,x,y-ry);c.closePath();};
  c.save();shape();c.clip();
  // The lens bends and compresses scenery; highlight and shadow sit on its curved edge.
  const sample=r*(3.2+refraction*2);const sx=clamp(worldX-sample*.5-r*.8,0,w-sample),sy=clamp(worldY-sample*.6-r*refraction*2,0,h-sample);
  c.drawImage(this.background,sx,sy,sample,sample,x-rx*1.2,y-ry*1.1,rx*2.4,ry*2.2);
  const shade=c.createLinearGradient(x-r,y-ry,x+r,y+ry);shade.addColorStop(0,'rgba(235,247,255,.12)');shade.addColorStop(.35,'rgba(10,25,33,.02)');shade.addColorStop(.82,'rgba(5,15,20,.15)');shade.addColorStop(1,'rgba(0,10,15,.38)');c.fillStyle=shade;c.fillRect(x-rx*1.2,y-ry*1.1,rx*2.4,ry*2.2);c.restore();
  c.lineWidth=Math.max(.35,r*.1);c.strokeStyle='rgba(9,18,25,.32)';shape();c.stroke();
  c.beginPath();c.ellipse(x-r*.13,y-ry*.1,r*.77,ry*.77,-.1,Math.PI*1.05,Math.PI*1.52);c.strokeStyle='rgba(220,239,250,.6)';c.lineWidth=Math.max(.45,r*.12);c.stroke();
  c.beginPath();c.ellipse(x+r*.16,y+ry*.22,r*.52,ry*.48,0,.3,1.5);c.strokeStyle='rgba(228,244,253,.24)';c.lineWidth=Math.max(.3,r*.075);c.stroke();
  if(r>2){c.fillStyle='rgba(242,251,255,.65)';c.beginPath();c.ellipse(x-r*.27,y-ry*.5,r*.13,r*.2,-.45,0,TAU);c.fill();}c.restore();
  const pad=3,tw=Math.ceil(rx*2.5+pad*2),th=Math.ceil(ry*2.5+pad*2);target.save();target.globalAlpha*=alpha;target.drawImage(this.lensSurface,64-tw/2,96-th/2,tw,th,worldX-tw/2,worldY-th/2,tw,th);target.restore();
 }
 drawDrops(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const b=bounds(l.region),ratio=this.width/1280,scale=l.scale,refraction=l.refraction??.85,density=l.density??1;
  const key=JSON.stringify([l.region,l.seed,scale,refraction,density]);let field=this.beads.get(key);
  if(!field){field=document.createElement('canvas');field.width=this.width;field.height=this.height;const bc=field.getContext('2d')!,r=seeded(l.seed);
   const count=Math.round(380*density*b.w*b.h/.5);for(let i=0;i<count;i++){const x=(b.x+r()*b.w)*this.width,y=(b.y+r()*b.h)*this.height,size=(.65+Math.pow(r(),3)*3.5)*scale*ratio;
    this.drop(bc,x,y,size,.95+r()*.28,refraction,.42+r()*.5);
   }if(this.beads.size>8)this.beads.clear();this.beads.set(key,field);
  }
  c.drawImage(field,0,0,w,h);
  c.save();c.scale(w/this.width,h/this.height);const random=seeded(l.seed+185),count=Math.round(17*density);
  for(let i=0;i<count;i++){
   const base=random(),seed=random(),size=random(),wobble=random(),cycles=Math.max(1,Math.round(l.speed*(.7+size))),q=fract(seed+p*cycles);
   const growth=clamp(q/.12),run=clamp((q-.12)/.88),travel=run*run*(3-2*run),edge=clamp((1-q)/.06)*growth;
   const px=(b.x+(base*.9+.05)*b.w)*this.width,top=(b.y+.015)*this.height,range=(b.h-.03)*this.height,py=top+travel*range;
   const drift=(t:number)=>Math.sin(t*10+wobble*TAU)*2.8*ratio*scale+Math.sin(t*23+wobble)*1.2*ratio;
   const r=(2.3+size*3.2)*scale*ratio*(.78+.25*travel)*growth;
   const tail=Math.min(travel*range,(l.trailLength??.7)*(35+size*100)*scale*ratio),headX=px+drift(travel);
   if(tail>2){c.save();const ty=py-tail;const gradient=c.createLinearGradient(0,ty,0,py);gradient.addColorStop(0,'rgba(180,214,231,0)');gradient.addColorStop(.7,'rgba(180,214,231,.045)');gradient.addColorStop(1,'rgba(190,223,236,.17)');
    const trail=(off=0)=>{c.beginPath();for(let k=0;k<=12;k++){const yy=ty+tail*k/12,t=(yy-top)/range,xx=px+drift(t)+off;k?c.lineTo(xx,yy):c.moveTo(xx,yy);}};
    c.globalAlpha*=edge;c.lineCap='round';trail();c.strokeStyle='rgba(10,25,35,.065)';c.lineWidth=r*.65;c.stroke();trail(-r*.18);c.strokeStyle=gradient;c.lineWidth=Math.max(.65,r*.18);c.stroke();trail(r*.16);c.strokeStyle='rgba(221,240,250,.07)';c.lineWidth=.6*ratio;c.stroke();c.restore();
   }
   // Small beads ahead of a runner are consumed as it passes.
   for(let j=1;j<5;j++){const beadY=j/5,delta=beadY-travel;const a=delta>0?clamp(delta*20):clamp((-delta-.14)*8);this.drop(c,px+drift(beadY),top+beadY*range,(.9+size*.5)*scale*ratio,1.15,refraction,a*.65);}
   this.drop(c,headX,py,r,1.12+Math.sin(travel*Math.PI)*.45,refraction,edge*.95);
  }c.restore();
 }
}
/** Falling rain: depth-separated streaks with tapered exposure, all moving in the same wind. */
export function drawRain(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
 const b=bounds(l.region),random=seeded(l.seed),x=b.x*w,y=b.y*h,bw=b.w*w,bh=b.h*h,ratio=w/1280;
 const density=l.density??1;
 for(let band=0;band<3;band++){
  const count=Math.round([260,100,22][band]*density),depth=[.3,.63,1][band];
  for(let i=0;i<count;i++){
   const a=random(),z=random(),v=random(),j=random(),cycles=Math.max(1,Math.round(l.speed*(5+depth*9+v*4))),q=fract(z+p*cycles);
   const vy=bh*(1.06+.06*depth),dx=(s.wind*.35+Math.sin(l.direction*Math.PI/180)*.3)*bh;
   const px=x+fract(a+q*dx/bw)*bw,py=y+q*vy-bh*.04;
   const edge=clamp(q*35)*clamp((1-q)*35)*clamp((px-x)/(8*ratio))*clamp((x+bw-px)/(8*ratio));
   const exposure=(5+depth*21)*( .65+v*.5)*l.scale*ratio,streakX=dx/vy*exposure;
   const gradient=c.createLinearGradient(px,py,px-streakX,py-exposure);gradient.addColorStop(0,`rgba(190,213,225,${.08+depth*.2})`);gradient.addColorStop(.38,`rgba(204,225,239,${.12+depth*.32})`);gradient.addColorStop(1,'rgba(184,206,220,0)');
   c.globalAlpha=l.opacity*edge*(.55+j*.45);c.strokeStyle=gradient;c.lineWidth=(.35+depth*.7)*ratio*l.scale;c.lineCap='round';c.beginPath();c.moveTo(px,py);c.lineTo(px-streakX,py-exposure);c.stroke();
  }
 }
}
